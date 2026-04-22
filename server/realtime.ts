import type { Express, Response, Request } from "express";

type RealtimeMessage = { type: "invalidate"; method: string; path: string; ts: number };

const clients = new Set<Response>();
let keepAliveTimer: NodeJS.Timeout | null = null;

export function setupRealtime(app: Express) {
  if (!keepAliveTimer) {
    keepAliveTimer = setInterval(() => {
      clients.forEach((res) => {
        res.write(`event: ping\ndata: {}\n\n`);
      });
    }, 25_000);
  }

  app.get("/api/realtime/stream", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    res.write(`event: ready\ndata: {}\n\n`);
    clients.add(res);

    req.on("close", () => {
      clients.delete(res);
    });
  });
}

export function broadcastInvalidate(method: string, path: string) {
  const msg: RealtimeMessage = { type: "invalidate", method, path, ts: Date.now() };
  const payload = JSON.stringify(msg);
  clients.forEach((res) => {
    res.write(`event: invalidate\ndata: ${payload}\n\n`);
  });
}
