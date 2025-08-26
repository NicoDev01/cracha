CRUSH.md – Quick Ops + Style Guide for CraCha Frontend

Build/Lint/Test
- Install: npm install
- Dev server (Next.js 15): npm run dev
- Cloudflare preview (OpenNext): npm run preview
- Build (Next.js): npm run build
- Deploy (OpenNext + Wrangler): npm run deploy
- Typecheck: npm run type-check
- Lint: npm run lint
- Tests: No test runner configured yet. Recommended: Vitest + React Testing Library. For now, create ad-hoc scripts; single-test suggestion once added: vitest run path/to/file.test.ts --project web -t "test name"

Conventions
- Language/Runtime: Next.js 15 App Router, React 19, TypeScript 5, Tailwind v4, shadcn/ui, Zustand, TanStack Query, Supabase, Cloudflare Workers via OpenNext.
- Imports: Use absolute imports from src when configured; otherwise relative. Group order: React/Next, third-party, @/local modules, types (import type ...). Prefer type-only imports to avoid runtime weight.
- Formatting: Follow eslint-config-next (flat config) and Prettier defaults if present. Indentation 2 spaces. Keep one export default per file where idiomatic; otherwise named exports.
- Types: Enable strict typing. Prefer explicit return types for exported functions. Use zod for runtime validation at boundaries. Use unknown over any; narrow with guards.
- Naming: camelCase for variables/functions, PascalCase for React components/types, UPPER_SNAKE for constants/env. File names: kebab-case for files, PascalCase for React components under components/.
- React: Client vs Server Components per Next.js 15. Use use client only when necessary. Keep hooks in hooks/, stores in stores/. Derive state when possible; avoid prop drilling in favor of context/store.
- Styling: Tailwind utility-first. Use cn from lib/utils.ts for class merging; prefer tailwind-merge for conditional classes. Keep shadcn/ui patterns consistent with existing components.
- Data fetching: Use TanStack Query in client components; cache keys in a central helper when needed. For server routes, use Next.js Route Handlers under app/api/.
- Error handling: Never swallow errors. Surface user-facing errors via UI components; log minimal context server-side. For fetch/worker calls, check response.ok and raise with context. Wrap async actions with try/catch and return typed Result.
- Env/config: Centralize in src/lib/config.ts. Never log secrets. Use NEXT_PUBLIC_ prefix only for safe client-side values. Cloudflare bindings configured via wrangler.toml.
- Auth: Supabase SSR helpers in src/lib/supabase/*. Keep tokens server-side; use session from cookies. Guard pages with hooks/use-auth-guard.ts.
- Routing: Put public pages under app/, dashboard under app/(dashboard)/. Avoid nested client layouts unless needed.
- API style: src/lib/api/ for API clients; keep small, pure functions. Return typed objects; validate with zod.
- Performance: Prefer server components, streaming, and suspense where appropriate. Keep Lighthouse >90; aim for sub-200ms TTFB.

Cursor/Copilot rules
- No Cursor or Copilot rule files detected. If added later (e.g., .cursor/rules/, .cursorrules, .github/copilot-instructions.md), mirror key rules here.
