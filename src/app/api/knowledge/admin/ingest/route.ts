import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { chunkKnowledgeText } from '@/lib/ai/chunk';
import { embedTexts, isKnowledgeAIConfigured, knowledgeModels } from '@/lib/ai/openai';
import { logger } from '@/lib/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IngestSchema = z.object({
  title: z.string().trim().min(2).max(240),
  content: z.string().trim().min(40).max(120_000),
  sourceUri: z.string().trim().url().max(1000).optional().or(z.literal('')),
  businessUnit: z.string().trim().min(1).max(80).default('ctg_one'),
  status: z.enum(['draft', 'published']).default('published'),
});

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

    const parsed = IngestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid document.', code: 'INVALID_DOCUMENT', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    if (adminError) throw new Error(`Admin verification failed: ${adminError.message}`);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required.', code: 'ADMIN_REQUIRED' }, { status: 403 });
    }

    const chunks = chunkKnowledgeText(parsed.data.content);
    if (!chunks.length) {
      return NextResponse.json({ error: 'Document produced no chunks.', code: 'EMPTY_DOCUMENT' }, { status: 400 });
    }
    if (chunks.length > 64) {
      return NextResponse.json(
        { error: 'Document is too large for v0.1 ingestion. Split it into smaller documents.', code: 'DOCUMENT_TOO_LARGE' },
        { status: 400 }
      );
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
    if (embeddings.length !== chunks.length) throw new Error('Embedding count does not match chunk count');

    const contentSha256 = createHash('sha256').update(parsed.data.content, 'utf8').digest('hex');
    const { data: document, error: documentError } = await supabase
      .from('knowledge_documents')
      .insert({
        title: parsed.data.title,
        source_uri: parsed.data.sourceUri || null,
        business_unit: parsed.data.businessUnit,
        classification: 'internal',
        status: parsed.data.status,
        content_sha256: contentSha256,
        created_by: user.id,
      })
      .select('id, title, status, business_unit')
      .single();

    if (documentError) {
      const duplicate = documentError.code === '23505';
      return NextResponse.json(
        {
          error: duplicate ? 'This document content has already been ingested.' : 'Document could not be created.',
          code: duplicate ? 'DUPLICATE_DOCUMENT' : 'DOCUMENT_INSERT_FAILED',
        },
        { status: duplicate ? 409 : 500 }
      );
    }

    const rows = chunks.map((chunk, index) => ({
      document_id: document.id,
      chunk_index: chunk.index,
      content: chunk.content,
      token_estimate: chunk.tokenEstimate,
      embedding_model: knowledgeModels.embedding,
      embedding: embeddings[index],
    }));

    const { error: chunkError } = await supabase.from('knowledge_chunks').insert(rows);
    if (chunkError) {
      await supabase.from('knowledge_documents').delete().eq('id', document.id);
      throw new Error(`Chunk insert failed: ${chunkError.message}`);
    }

    logger.info('knowledge.ingest.completed', {
      requestId,
      adminId: user.id,
      documentId: document.id,
      businessUnit: document.business_unit,
      status: document.status,
      chunkCount: chunks.length,
      embeddingModel: knowledgeModels.embedding,
      latencyMs: Date.now() - started,
    });

    return NextResponse.json({
      document,
      chunkCount: chunks.length,
      embeddingModel: knowledgeModels.embedding,
      requestId,
    }, { status: 201 });
  } catch (error) {
    logger.error('knowledge.ingest.failed', {
      requestId,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return NextResponse.json(
      { error: 'CTG Knowledge could not ingest the document.', code: 'KNOWLEDGE_INGEST_FAILED', requestId },
      { status: 500 }
    );
  }
}
