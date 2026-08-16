import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { embedTexts, generateGroundedAnswer, isKnowledgeAIConfigured, type GroundingSource } from '@/lib/ai/openai';
import { logger } from '@/lib/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const requestId = crypto.randomUUID();

  try {
    if (!isSupabaseConfigured || !isKnowledgeAIConfigured) {
      return NextResponse.json(
        { error: 'CTG Knowledge is not fully configured.', code: 'KNOWLEDGE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const parsed = QuerySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query.', code: 'INVALID_QUERY', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const [queryEmbedding] = await embedTexts([parsed.data.question]);
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
        requestId,
        userId: user.id,
        businessUnit: parsed.data.businessUnit ?? null,
        latencyMs: Date.now() - started,
      });
      return NextResponse.json({
        answer: 'The available authorized knowledge does not contain enough evidence to answer this question.',
        sources: [],
        grounded: false,
        requestId,
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

    const answer = await generateGroundedAnswer(parsed.data.question, sources);

    logger.info('knowledge.query.completed', {
      requestId,
      userId: user.id,
      businessUnit: parsed.data.businessUnit ?? null,
      sourceCount: sources.length,
      topSimilarity: matches[0]?.similarity ?? null,
      latencyMs: Date.now() - started,
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
    });
  } catch (error) {
    logger.error('knowledge.query.failed', {
      requestId,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return NextResponse.json(
      { error: 'CTG Knowledge could not complete the query.', code: 'KNOWLEDGE_QUERY_FAILED', requestId },
      { status: 500 }
    );
  }
}
