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

// Mirrors the /api/ai/* Vercel serverless functions for local `pnpm run dev`,
// so AI behavior matches between dev and production without needing `vercel dev`.
function aiApiDevMiddleware(): Plugin {
  return {
    name: "givit-ai-api-dev-middleware",
    configureServer(server) {
      const handlersUrl = pathToFileURL(path.resolve(import.meta.dirname, "../../api/_lib/handlers.mjs")).href;
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/ai/") || req.method !== "POST") return next();
        try {
          const { handleAutogiftSuggestions, handleGiftChat } = await import(handlersUrl);
          const body = await readJsonBody(req);
          const result =
            req.url === "/api/ai/autogift-suggestions"
              ? await handleAutogiftSuggestions(body)
              : req.url === "/api/ai/gift-chat"
                ? await handleGiftChat(body)
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
