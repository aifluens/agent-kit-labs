import { Agent } from "@aifluens/agent-kit";
import { MODEL } from "../_shared/model.js"; // provider switch — see labs/_shared/model.ts

const agent = new Agent({  // ①
  model: MODEL,
  systemPrompt: "You are a friendly billing support rep. Greet warmly and offer to help with billing questions. Keep responses brief.",  // ②
  temperature: 0.4,  // ③
});

const response = await agent.run("Hi, can you help me?");  // ④
console.log(response);
