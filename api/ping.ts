import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { name = "World" } = req.query;
  return res.json({
    message: `Ping: Hello ${name}!`,
  });
}
