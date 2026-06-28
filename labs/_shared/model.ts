/**
 * Provider / model selector shared by every lab.
 *
 * `@aifluens/agent-kit` picks the provider from the model string's PREFIX and
 * reads that provider's own standard public env var:
 *
 *   "openai:gpt-4o-mini"   → provider OpenAI    → OPENAI_API_KEY
 *   "claude-sonnet"        → provider Anthropic → ANTHROPIC_API_KEY  (unprefixed = Anthropic)
 *
 * Switch providers WITHOUT editing any lab code by setting `LAB_MODEL` in your
 * environment (.env), e.g. `LAB_MODEL=claude-sonnet`. Or change the default
 * literal below to run on a different model by default.
 *
 * Make sure the matching key is set: OPENAI_API_KEY for an `openai:` model,
 * ANTHROPIC_API_KEY for a `claude-*` / unprefixed model.
 */
export const MODEL = process.env.LAB_MODEL ?? "openai:gpt-4o-mini";
