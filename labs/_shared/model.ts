/**
 * Model selector shared by every lab.
 *
 * The PROVIDER is chosen explicitly by the `LLM_PROVIDER` env var (see `.env`),
 * NOT by this string — `@aifluens/agent-kit` reads `LLM_PROVIDER` verbatim:
 *
 *   LLM_PROVIDER=openai      → OpenAI    → OPENAI_API_KEY
 *   LLM_PROVIDER=anthropic   → Anthropic → ANTHROPIC_API_KEY
 *
 * This `MODEL` is only the model id. Change the model WITHOUT editing any lab
 * code by setting `LAB_MODEL` in your environment (.env), e.g.
 * `LAB_MODEL=claude-sonnet`. Or change the default literal below.
 *
 * Make sure `LLM_PROVIDER` and the matching key are set: OPENAI_API_KEY for
 * `LLM_PROVIDER=openai`, ANTHROPIC_API_KEY for `LLM_PROVIDER=anthropic`.
 */
export const MODEL = process.env.LAB_MODEL ?? "gpt-4o-mini";
