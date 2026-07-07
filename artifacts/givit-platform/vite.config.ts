import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { pathToFileURL } from "url";

const port = Number(process.env.PORT ?? 3000);
const basePath = process.env.BASE_PATH ?? "/";

async function readJsonBody(req: import("http").IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : {};
}

// Mirrors the /api/ai/* and /api/photo Vercel serverless functions for local
// `pnpm run dev`, so behavior matches between dev and production without
// needing `vercel dev`.
function aiApiDevMiddleware(): Plugin {
  return {
    name: "givit-ai-api-dev-middleware",
    configureServer(server) {
      const handlersUrl = pathToFileURL(path.resolve(import.meta.dirname, "../../api/_lib/handlers.mjs")).href;
      const photoUrl = pathToFileURL(path.resolve(import.meta.dirname, "../../api/_lib/photo.mjs")).href;
      const extractProductUrl = pathToFileURL(path.resolve(import.meta.dirname, "../../api/_lib/extract-product.mjs")).href;
      const pushUrl = pathToFileURL(path.resolve(import.meta.dirname, "../../api/_lib/push.mjs")).href;
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith("/api/push/send") && req.method === "POST") {
          try {
            const { sendPushToSubscription } = await import(pushUrl);
            const body = await readJsonBody(req);
            if (!body?.subscription?.endpoint) { res.statusCode = 400; res.end(JSON.stringify({ error: "subscription is required" })); return; }
            await sendPushToSubscription(body.subscription, { title: body.title || "Givit", body: body.body || "You have a new update.", url: body.url || "/" });
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          } catch (error: any) {
            res.statusCode = error?.statusCode === 410 ? 410 : 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: error?.message ?? "Push send failed" }));
          }
          return;
        }

        if (req.url?.startsWith("/api/photo") && req.method === "GET") {
          try {
            const { resolveProductPhotoUrl } = await import(photoUrl);
            const pageUrl = new URL(req.url, "http://localhost").searchParams.get("url");
            if (!pageUrl) { res.statusCode = 400; res.end("url query param is required"); return; }
            const imageUrl = await resolveProductPhotoUrl(pageUrl);
            if (!imageUrl) { res.statusCode = 404; res.end(); return; }
            res.statusCode = 302;
            res.setHeader("Location", imageUrl);
            res.end();
          } catch {
            res.statusCode = 502;
            res.end();
          }
          return;
        }

        if (!req.url?.startsWith("/api/ai/") || req.method !== "POST") return next();
        try {
          const { handleAutogiftSuggestions, handleGiftChat } = await import(handlersUrl);
          const body = await readJsonBody(req);
          const result =
            req.url === "/api/ai/autogift-suggestions"
              ? await handleAutogiftSuggestions(body)
              : req.url === "/api/ai/gift-chat"
                ? await handleGiftChat(body)
                : req.url === "/api/ai/extract-product"
                  ? await (await import(extractProductUrl)).extractProductWithAI(body?.url)
                  : null;
          if (!result) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Unknown AI endpoint" }));
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error?.message ?? "AI request failed" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname), "");
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
  process.env.OPENAI_MODEL = process.env.OPENAI_MODEL || env.OPENAI_MODEL;
  process.env.VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY;
  process.env.VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || env.VAPID_PRIVATE_KEY;
  process.env.VAPID_SUBJECT = process.env.VAPID_SUBJECT || env.VAPID_SUBJECT;

  return {
    base: basePath,
    plugins: [react(), tailwindcss(), aiApiDevMiddleware()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: { strict: true },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
