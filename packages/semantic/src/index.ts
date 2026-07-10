// @infinity-canvas/semantic
// LLM context packer + semantic map builder.

export { contextPacker } from './contextPacker';
export type { ContextPack, ContextPackerOptions, FileReader } from './contextPacker';

export {
  MockLLMProvider,
  OpenAICompatibleProvider,
  OpenRouterProvider,
  createProvider,
  isSendCodeSamplesEnabled,
} from './llmProviders';
export type { LLMProvider, ChatMessage, LlmConfig } from './llmProviders';

export { buildSemanticMap } from './buildSemanticMap';
export type { SemanticMapResult } from './buildSemanticMap';

export { SYSTEM_CODEMAP, EXAMPLE_CODEMAP_MINI, buildCodemapUserPrompt, projectCodemapToCanvas } from './prompts';

export { enrichCodemap, redactSamples, applyPrivacyToPack } from './enrichCodemap';
export type { EnrichInput, EnrichResult } from './enrichCodemap';

export {
  setPromptLogDir,
  getPromptLogDir,
  isPromptLogEnabled,
  beginPromptLog,
  withPromptLogging,
  sanitizePromptText,
} from './promptLog';
