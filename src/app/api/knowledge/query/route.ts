import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  embedKnowledgeTexts,
  generateKnowledgeGroundedAnswer,
  isKnowledgeAIConfigured,
  knowledgeAIConfig,
  type GroundingSource,
} from '@/lib/ai/model-gateway';
import { validateGroundedAnswer } from '@/lib/ai/grounding.mjs';
import { logger } from '@/lib/observability/logger';
import { getRequestObservabilityContext } from '@/lib/observability/request-context';
import { consumeAuthenticatedRateLimit } from '@/lib/security/api-rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INSUFFICIENT_EVIDENCE_ANSWER =
  'The available authorized knowledge does not contain enough evidence to answer this question.';

const QuerySchema = z.object({
  question: z.string().trim().min(3).max(1000),
  businessUnit: z.string().trim().min(1).max(80).optional(),
});

type MatchRow = {
  chunk_id: string;
  document_id: string;
  document_title: string;
  source_uri: string | null;
  business_unit: string;
  chunk_index: number;
  content: string;
  similarity: number;
};

export async function POST(request: Request) {
  const started = Date.now();
  const requestContext = getRequestObservabilityContext(request);
  const requestId = requestContext.request_id;
  const responseHeaders = (extra: Record<string, string> = {}) => ({
    'X-Request-ID': requestId,
    ...extra,
  });

  try {
    if (!isSupabaseConfigured || !isKnowledgeAIConfigured) {
      return NextResponse.json(
        { error: 'CTG Knowledge is not fully configured.', code: 'KNOWLEDGE_NOT_CONFIGURED', requestId },
        { status: 503, headers: responseHeaders() }
      );
    }

    const parsed = QuerySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query.', code: 'INVALID_QUERY', details: parsed.error.flatten(), requestId },
        { status: 400, headers: responseHeaders() }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required.', code: 'AUTH_REQUIRED', requestId },
        { status: 401, headers: responseHeaders() }
      );
    }

    const rateLimit = await consumeAuthenticatedRateLimit(supabase, 'knowledge.query');
    if (!rateLimit.allowed) {
      logger.info('knowledge.query.rate_limited', {
        ...requestContext,
        userId: user.id,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
      return NextResponse.json(
        { error: 'Too many knowledge queries. Please retry later.', code: 'RATE_LIMITED', requestId },
        {
          status: 429,
          headers: responseHeaders({
            'Retry-After': String(rateLimit.retryAfterSeconds),
            'X-RateLimit-Remaining': '0',
          }),
        },
      );
    }

    const embedding = await embedKnowledgeTexts([parsed.data.question]);
    const [queryEmbedding] = embedding.vectors;
    if (!queryEmbedding) throw new Error('Embedding generation returned no vector');

    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.55,
      match_count: 6,
      filter_business_unit: parsed.data.businessUnit ?? null,
    });

    if (error) throw new Error(`Knowledge retrieval failed: ${error.message}`);
    const matches = (data ?? []) as MatchRow[];

    if (!matches.length) {
      logger.info('knowledge.query.no_evidence', {
        ...requestContext,
        userId: user.id,
        businessUnit: parsed.data.businessUnit ?? null,
        latencyMs: Date.now() - started,
        ai: {
          provider: knowledgeAIConfig.provider,
          configVersion: knowledgeAIConfig.configVersion,
          embedding: embedding.telemetry,
        },
      });
      return NextResponse.json({
        answer: INSUFFICIENT_EVIDENCE_ANSWER,
        sources: [],
        grounded: false,
        requestId,
      }, {
        headers: responseHeaders({ 'X-RateLimit-Remaining': String(rateLimit.remaining) }),
      });
    }

    const sources: GroundingSource[] = matches.map((row, index) => ({
      citation: index + 1,
      title: row.document_title,
      sourceUri: row.source_uri,
      businessUnit: row.business_unit,
      chunkIndex: row.chunk_index,
      content: row.content,
    }));

    const generation = await generateKnowledgeGroundedAnswer(parsed.data.question, sources);
    const answer = generation.answer;
    const grounding = validateGroundedAnswer(answer, sources.map((source) => source.citation));

    if (!grounding.grounded) {
      logger.warn('knowledge.query.grounding_rejected', {
        ...requestContext,
        userId: user.id,
        businessUnit: parsed.data.businessUnit ?? null,
        sourceCount: sources.length,
        citationCount: grounding.citations.length,
        invalidCitations: grounding.invalidCitations,
        latencyMs: Date.now() - started,
        ai: {
          provider: knowledgeAIConfig.provider,
          configVersion: knowledgeAIConfig.configVersion,
          embedding: embedding.telemetry,
          generation: generation.telemetry,
        },
      });

      return NextResponse.json({
        answer: INSUFFICIENT_EVIDENCE_ANSWER,
        sources: [],
        grounded: false,
        requestId,
      }, {
        headers: responseHeaders({ 'X-RateLimit-Remaining': String(rateLimit.remaining) }),
      });
    }

    logger.info('knowledge.query.completed', {
      ...requestContext,
      userId: user.id,
      businessUnit: parsed.data.businessUnit ?? null,
      sourceCount: sources.length,
      citationCount: grounding.citations.length,
      topSimilarity: matches[0]?.similarity ?? null,
      latencyMs: Date.now() - started,
      ai: {
        provider: knowledgeAIConfig.provider,
        configVersion: knowledgeAIConfig.configVersion,
        embedding: embedding.telemetry,
        generation: generation.telemetry,
      },
    });

    return NextResponse.json({
      answer,
      grounded: true,
      requestId,
      sources: matches.map((row, index) => ({
        citation: index + 1,
        documentId: row.document_id,
        title: row.document_title,
        sourceUri: row.source_uri,
        businessUnit: row.business_unit,
        chunkIndex: row.chunk_index,
        similarity: Number(row.similarity),
      })),
    }, {
      headers: responseHeaders({ 'X-RateLimit-Remaining': String(rateLimit.remaining) }),
    });
  } catch (error) {
    logger.error('knowledge.query.failed', {
      ...requestContext,
      latencyMs: Date.now() - started,
      ai: {
        provider: knowledgeAIConfig.provider,
        configVersion: knowledgeAIConfig.configVersion,
      },
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return NextResponse.json(
      { error: 'CTG Knowledge could not complete the query.', code: 'KNOWLEDGE_QUERY_FAILED', requestId },
      { status: 500, headers: responseHeaders() }
    );
  }
}
