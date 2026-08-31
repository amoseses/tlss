import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { pathToFileURL } from "url";

const port = Number(process.env.PORT ?? 3000);
const basePath = process.env.BASE_PATH ?? "/";

async function readJsonBody(
  req: import("http").IncomingMessage
): Promise<any> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf-8");

  return raw ? JSON.parse(raw) : {};
}

function aiApiDevMiddleware(env: Record<string, string>): Plugin {
  return {
    name: "givit-ai-api-dev-middleware",

    configureServer(server) {
      const photoUrl = pathToFileURL(
        path.resolve(
          import.meta.dirname,
          "../../server/api-lib/photo.mjs"
        )
      ).href;

      const metadataUrl = pathToFileURL(
        path.resolve(
          import.meta.dirname,
          "../../server/api-lib/metadata.mjs"
        )
      ).href;

      const pushUrl = pathToFileURL(
        path.resolve(
          import.meta.dirname,
          "../../server/api-lib/push.mjs"
        )
      ).href;

      server.middlewares.use(async (req, res, next) => {
        console.log("API REQUEST:", req.method, req.url);
        /*
         * ============================================================
         * GROQ
         * ============================================================
         */

        // Production branches POST /api/metadata to the Groq chat proxy and
        // GET /api/metadata to the page-metadata lookup (see api/metadata.ts
        // -- consolidated onto one function to stay under Vercel's Hobby
        // 12-function cap). groq-client.ts posts to /api/metadata to match;
        // this dev route used to point at a separate /api/groq that nothing
        // calls anymore, which meant every local Groq call 404'd and every
        // AI-personalization feature silently fell back to its non-AI path.
        if (req.url === "/api/metadata" && req.method === "POST") {
          try {
            const apiKey =
              process.env.GROQ_API_KEY ||
              env.GROQ_API_KEY;

            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader(
                "Content-Type",
                "application/json"
              );

              res.end(
                JSON.stringify({
                  error: "GROQ_API_KEY is not configured",
                })
              );

              return;
            }

            const body = await readJsonBody(req);

            if (!Array.isArray(body?.messages)) {
              res.statusCode = 400;
              res.setHeader(
                "Content-Type",
                "application/json"
              );

              res.end(
                JSON.stringify({
                  error: "messages must be an array",
                })
              );

              return;
            }

            const response = await fetch(
              "https://api.groq.com/openai/v1/chat/completions",
              {
                method: "POST",

                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },

                body: JSON.stringify({
                  model:
                    body.model ||
                    "openai/gpt-oss-120b",

                  messages: body.messages,

                  temperature:
                    body.temperature ?? 0.7,

                  max_tokens:
                    body.maxTokens ?? 700,

                  
                }),
              }
            );

            const data = await response.json();

            res.statusCode = response.status;

            res.setHeader(
              "Content-Type",
              "application/json"
            );

            res.end(JSON.stringify(data));
          } catch (error) {
            console.error(
              "Local Groq API error:",
              error
            );

            res.statusCode = 500;

            res.setHeader(
              "Content-Type",
              "application/json"
            );

            res.end(
              JSON.stringify({
                error: "Internal server error",
              })
            );
          }

          return;
        }

        /*
         * ============================================================
         * PUSH
         * ============================================================
         */

        if (
          req.url?.startsWith("/api/push/send") &&
          req.method === "POST"
        ) {
          try {
            const {
              sendPushToSubscription,
            } = await import(pushUrl);

            const body = await readJsonBody(req);

            if (
              !body?.subscription?.endpoint
            ) {
              res.statusCode = 400;

              res.end(
                JSON.stringify({
                  error:
                    "subscription is required",
                })
              );

              return;
            }

            await sendPushToSubscription(
              body.subscription,
              {
                title:
                  body.title || "Givit",

                body:
                  body.body ||
                  "You have a new update.",

                url:
                  body.url || "/",
              }
            );

            res.setHeader(
              "Content-Type",
              "application/json"
            );

            res.end(
              JSON.stringify({
                ok: true,
              })
            );
          } catch (error: any) {
            res.statusCode =
              error?.statusCode === 410
                ? 410
                : 500;

            res.setHeader(
              "Content-Type",
              "application/json"
            );

            res.end(
              JSON.stringify({
                error:
                  error?.message ??
                  "Push send failed",
              })
            );
          }

          return;
        }

        /*
         * ============================================================
         * PHOTO
         * ============================================================
         */

        if (
          req.url?.startsWith("/api/photo") &&
          req.method === "GET"
        ) {
          try {
            const {
              resolveProductPhotoUrl,
            } = await import(photoUrl);

            const pageUrl =
              new URL(
                req.url,
                "http://localhost"
              ).searchParams.get("url");

            if (!pageUrl) {
              res.statusCode = 400;

              res.end(
                "url query param is required"
              );

              return;
            }

            const imageUrl =
              await resolveProductPhotoUrl(
                pageUrl
              );

            if (!imageUrl) {
              res.statusCode = 404;
              res.end();

              return;
            }

            res.statusCode = 302;

            res.setHeader(
              "Location",
              imageUrl
            );

            res.end();
          } catch {
            res.statusCode = 502;
            res.end();
          }

          return;
        }

        /*
         * ============================================================
         * METADATA
         * ============================================================
         */

        if (
          req.url?.startsWith("/api/metadata") &&
          req.method === "GET"
        ) {
          try {
            const {
              fetchPageMetadata,
            } = await import(metadataUrl);

            const pageUrl =
              new URL(
                req.url,
                "http://localhost"
              ).searchParams.get("url");

            if (!pageUrl) {
              res.statusCode = 400;

              res.end(
                JSON.stringify({
                  error:
                    "url query param is required",
                })
              );

              return;
            }

            const meta =
              await fetchPageMetadata(
                pageUrl
              );

            res.setHeader(
              "Content-Type",
              "application/json"
            );

            res.end(
              JSON.stringify({
                data: meta,
              })
            );
          } catch {
            res.statusCode = 502;

            res.end(
              JSON.stringify({
                data: null,
              })
            );
          }

          return;
        }

        if (req.url?.startsWith("/api/stripe/setup-intent")) {
          try {
            const setupIntentPath = path.resolve(import.meta.dirname, "../../api/stripe/setup-intent.ts");
            const mod = await server.ssrLoadModule(setupIntentPath);
            const handler = mod.default;

            const body = req.method === "POST" ? await readJsonBody(req) : undefined;
            const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
            const query = Object.fromEntries(urlObj.searchParams.entries());

            const reqMock = Object.assign(req, { body, query });
            const resMock = Object.assign(res, {
              status(code: number) { res.statusCode = code; return resMock; },
              json(obj: any) {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(obj));
                return resMock;
              }
            });

            await handler(reqMock, resMock);
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: error?.message || "Server error" }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(
    mode,
    path.resolve(import.meta.dirname),
    ""
  );

  process.env.GROQ_API_KEY =
    process.env.GROQ_API_KEY ||
    env.GROQ_API_KEY;

  process.env.VAPID_PUBLIC_KEY =
    process.env.VAPID_PUBLIC_KEY ||
    env.VAPID_PUBLIC_KEY;

  process.env.VAPID_PRIVATE_KEY =
    process.env.VAPID_PRIVATE_KEY ||
    env.VAPID_PRIVATE_KEY;

  process.env.VAPID_SUBJECT =
    process.env.VAPID_SUBJECT ||
    env.VAPID_SUBJECT;

  process.env.SUPABASE_URL =
    process.env.SUPABASE_URL ||
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL;

  process.env.STRIPE_SECRET_KEY =
    process.env.STRIPE_SECRET_KEY ||
    env.STRIPE_SECRET_KEY;

  return {
    base: basePath,

    plugins: [
      react(),
      tailwindcss(),
      aiApiDevMiddleware(env),
    ],

    resolve: {
      alias: {
        "@": path.resolve(
          import.meta.dirname,
          "src"
        ),
      },

      dedupe: [
        "react",
        "react-dom",
      ],
    },

    root: path.resolve(
      import.meta.dirname
    ),

    build: {
      outDir: path.resolve(
        import.meta.dirname,
        "dist"
      ),

      emptyOutDir: true,
      sourcemap: false,
    },

    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,

      fs: {
        strict: true,
      },
    },

    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});