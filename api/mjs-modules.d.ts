// The _lib/*.mjs helper modules are plain JS on purpose (see api/_lib/*.mjs
// comments) so Node can import them directly without a build step. This
// tells TypeScript to treat them as untyped modules instead of erroring
// with "implicitly has an 'any' type" under noImplicitAny — which Vercel's
// build enforces when compiling these serverless functions, even though
// the local package-level `pnpm run typecheck` never covers this directory.
declare module "*.mjs";
