// Local Help Desk infrastructure for the Module 5 labs — the server YOU supply.
// Starts two endpoints over one shared in-memory order store:
//   • MCP Streamable HTTP on :8000/mcp   → drives agent-mcp.ts (MCPClient.connect)
//   • plain HTTP REST API  on :8001      → drives agent-http.ts (callConnectionHttp)
//
// No dependencies — Node's built-in `http` only. Run with: node servers/helpdesk.mjs
import { createServer } from "node:http";

const MCP_PORT = 8000;
const HTTP_PORT = 8001;

// --- shared in-memory data -------------------------------------------------
/** @type {Map<string, { id: string, customer_email: string, status: string, amount: number, refunded: number }>} */
const orders = new Map([
  ["ORD-1001", { id: "ORD-1001", customer_email: "ada@example.com", status: "paid", amount: 120, refunded: 0 }],
  ["ORD-1002", { id: "ORD-1002", customer_email: "ada@example.com", status: "paid", amount: 36, refunded: 0 }],
  ["ORD-2002", { id: "ORD-2002", customer_email: "grace@example.com", status: "cancelled", amount: 80, refunded: 0 }],
]);
let nextTicket = 1;
/** @type {Array<{ id: string, order_id: string, subject: string }>} */
const tickets = [];

// --- shared business logic (used by both faces) ----------------------------
const lookupOrder = (orderId) => {
  const order = orders.get(orderId);
  if (!order) return { error: "not_found", order_id: orderId };
  return { ...order, balance: order.amount - order.refunded };
};

const listOrders = (customerEmail) => {
  const matches = [...orders.values()]
    .filter((o) => o.customer_email.toLowerCase() === String(customerEmail ?? "").toLowerCase())
    .map((o) => ({ ...o, balance: o.amount - o.refunded }));
  return { customer_email: customerEmail, orders: matches };
};

const issueRefund = (orderId, amount) => {
  const order = orders.get(orderId);
  if (!order) return { error: "not_found", order_id: orderId };
  if (order.status === "cancelled") return { error: "cannot_refund_cancelled_order", order_id: orderId };
  const refundAmount = amount === undefined ? order.amount - order.refunded : Number(amount);
  if (!(refundAmount > 0) || refundAmount > order.amount - order.refunded) {
    return { error: "invalid_amount", order_id: orderId, refundable: order.amount - order.refunded };
  }
  order.refunded += refundAmount;
  if (order.refunded >= order.amount) order.status = "refunded";
  return { order_id: orderId, refunded: refundAmount, status: order.status, balance: order.amount - order.refunded };
};

const createTicket = (orderId, subject) => {
  const id = `TKT-${1000 + nextTicket++}`;
  tickets.push({ id, order_id: orderId, subject: subject ?? "" });
  return { ticket_id: id, order_id: orderId, subject: subject ?? "" };
};

const listTickets = (orderId) => ({
  order_id: orderId,
  tickets: tickets.filter((t) => t.order_id === orderId),
});

// --- MCP tool catalog (advertised by tools/list) ---------------------------
const MCP_TOOLS = [
  {
    name: "lookup_order",
    description: 'Look up a single order by its reference id (e.g. "ORD-1001"). Returns status, amount, balance, and the customer it belongs to.',
    inputSchema: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] },
  },
  {
    name: "list_orders",
    description: "List all orders belonging to a customer's email address.",
    inputSchema: { type: "object", properties: { customer_email: { type: "string" } }, required: ["customer_email"] },
  },
  {
    name: "issue_refund",
    description: "Issue a refund against an order. Omit amount to refund the full remaining balance. Cannot refund a cancelled order.",
    inputSchema: {
      type: "object",
      properties: { order_id: { type: "string" }, amount: { type: "number" } },
      required: ["order_id"],
    },
  },
  {
    name: "create_ticket",
    description: "Open a support ticket linked to an order.",
    inputSchema: {
      type: "object",
      properties: { order_id: { type: "string" }, subject: { type: "string" } },
      required: ["order_id", "subject"],
    },
  },
  {
    name: "list_tickets",
    description: "List support tickets linked to an order.",
    inputSchema: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] },
  },
];

const callTool = (name, args = {}) => {
  switch (name) {
    case "lookup_order":
      return lookupOrder(args.order_id);
    case "list_orders":
      return listOrders(args.customer_email);
    case "issue_refund":
      return issueRefund(args.order_id, args.amount);
    case "create_ticket":
      return createTicket(args.order_id, args.subject);
    case "list_tickets":
      return listTickets(args.order_id);
    default:
      return { error: "unknown_tool", tool: name };
  }
};

// --- helpers ---------------------------------------------------------------
const readBody = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });

const sendJson = (res, status, obj) => {
  const payload = JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(payload);
};

// --- MCP server (:8000/mcp) ------------------------------------------------
const mcpServer = createServer(async (req, res) => {
  if (req.method !== "POST" || !req.url?.startsWith("/mcp")) {
    return sendJson(res, 404, { error: "not_found" });
  }
  const msg = await readBody(req);
  const { id, method, params } = msg;

  // Notifications have no id → ack with 202 and no body.
  if (id === undefined) {
    res.writeHead(202).end();
    return;
  }

  if (method === "initialize") {
    res.setHeader("mcp-session-id", "verify-session-1");
    return sendJson(res, 200, {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "helpdesk-sandbox", version: "0.0.1" },
      },
    });
  }

  if (method === "tools/list") {
    return sendJson(res, 200, { jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } });
  }

  if (method === "tools/call") {
    const result = callTool(params?.name, params?.arguments ?? {});
    return sendJson(res, 200, {
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text: JSON.stringify(result) }] },
    });
  }

  return sendJson(res, 200, { jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${method}` } });
});

// --- plain HTTP REST API (:8001) -------------------------------------------
const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${HTTP_PORT}`);
  const path = url.pathname;

  // GET /orders/:id
  const single = path.match(/^\/orders\/([^/]+)$/);
  if (req.method === "GET" && single) {
    const result = lookupOrder(decodeURIComponent(single[1]));
    return sendJson(res, result.error ? 404 : 200, result);
  }

  // GET /orders?customer_email=
  if (req.method === "GET" && path === "/orders") {
    return sendJson(res, 200, listOrders(url.searchParams.get("customer_email")));
  }

  // POST /refunds  { order_id, amount? }
  if (req.method === "POST" && path === "/refunds") {
    const body = await readBody(req);
    const result = issueRefund(body.order_id, body.amount);
    return sendJson(res, result.error ? 400 : 200, result);
  }

  return sendJson(res, 404, { error: "not_found", path });
});

mcpServer.listen(MCP_PORT, () => console.log(`[helpdesk] MCP  Streamable HTTP → http://localhost:${MCP_PORT}/mcp`));
httpServer.listen(HTTP_PORT, () => console.log(`[helpdesk] HTTP REST API     → http://localhost:${HTTP_PORT}`));
console.log("[helpdesk] seeded orders: ORD-1001 (ada@example.com, $120), ORD-1002, ORD-2002 (cancelled)");
console.log("[helpdesk] press Ctrl+C to stop");
