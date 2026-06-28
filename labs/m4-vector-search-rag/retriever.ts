import { Agent, Retriever, tool } from "@aifluens/agent-kit";
import { MODEL } from "../_shared/model.js"; // provider switch — see labs/_shared/model.ts

// ① Retriever auto-binds to the knowledge base you built in Module 3 —
//   same pgvector path the shipped agent will use when you click "Ship".
const retriever = new Retriever();

const topK = 3;             // ②
const searchType = "vector"; // ③

// ④ A tool that wraps the retriever. The agent loop now decides WHEN to
//   call this and WHAT to search for; topK and searchType are YOUR product
//   decisions, baked into the handler — the model only chooses the query.
const searchKnowledgeBase = tool({
  name: "search_knowledge_base",
  description:
    "Search the company's knowledge base for passages relevant to the user's question. Use this whenever the user asks about company policies, refunds, billing, products, or any specific fact you would otherwise have to guess. Returns ranked passages — cite them in your answer as [1], [2], … using the `rank` field.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "What to search for — usually a rephrasing of the user's question that focuses on the topic.",
      },
    },
    required: ["query"],
  },
  handler: async ({ query }: { query: string }) => {
    const chunks = await retriever.search(query, { topK, searchType });
    return chunks.map((c, i) => ({
      rank: i + 1,
      content: c.content,
      source: c.filename,
      score: c.score,
      chunkId: c.chunkId,
    }));
  },
});

const agent = new Agent({
  model: MODEL,
  systemPrompt: "You are a customer support agent. For any question about company policies or specific facts, call search_knowledge_base first and cite sources as [1], [2], … using the `rank` field from each chunk.",
  temperature: 0.2,
  tools: [searchKnowledgeBase],
  // ⑤ "auto" lets the model decide; switch to "required" to force a tool
  //   call on every turn, or "none" to disable tool use entirely.
  toolChoice: "auto",
  maxIterations: 3,
});

const userMessage = "How long do refunds take?";
const response = await agent.run(userMessage);
console.log(response);
console.log(`Used searchType=${searchType}, topK=${topK}`);
