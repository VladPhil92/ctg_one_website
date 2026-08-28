import 'server-only';

import {
  embedTexts as embedOpenAITexts,
  generateGroundedAnswer as generateOpenAIGroundedAnswer,
  isOpenAIConfigured,
  openAIModels,
  type AIProviderTelemetry,
  type GroundingSource,
} from './openai';

const configuredProvider = (process.env.CTG_AI_PROVIDER || 'openai').trim().toLowerCase();
const configVersion = (process.env.CTG_AI_CONFIG_VERSION || 'ctg-knowledge-v0.2').trim();

export const knowledgeAIConfig = {
  provider: configuredProvider,
  configVersion,
  embeddingModel: openAIModels.embedding,
  responseModel: openAIModels.response,
} as const;

export const isKnowledgeAIConfigured = configuredProvider === 'openai' && isOpenAIConfigured;

function requireSupportedProvider() {
  if (configuredProvider !== 'openai') {
    throw new Error(`Unsupported CTG AI provider: ${configuredProvider}`);
  }
  if (!isOpenAIConfigured) {
    throw new Error('CTG AI provider is not configured');
  }
}

export type GatewayTelemetry = AIProviderTelemetry & {
  configVersion: string;
};

export async function embedKnowledgeTexts(texts: string[]) {
  requireSupportedProvider();
  const result = await embedOpenAITexts(texts);
  return {
    vectors: result.vectors,
    telemetry: {
      ...result.telemetry,
      configVersion,
    } satisfies GatewayTelemetry,
  };
}

export async function generateKnowledgeGroundedAnswer(question: string, sources: GroundingSource[]) {
  requireSupportedProvider();
  const result = await generateOpenAIGroundedAnswer(question, sources);
  return {
    answer: result.answer,
    telemetry: {
      ...result.telemetry,
      configVersion,
    } satisfies GatewayTelemetry,
  };
}

export type { GroundingSource };
