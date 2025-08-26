# CraCha Frontend

Ein modernes Next.js 15 Frontend für CraCha RAG-as-a-Service, optimiert für Cloudflare Workers.

## 🚀 Features

- **Next.js 15** mit App Router und Turbopack
- **TypeScript** für Type Safety
- **Tailwind CSS** für Styling
- **Shadcn/ui** für UI-Komponenten
- **Cloudflare Workers** Integration mit OpenNext
- **Zustand** für State Management
- **React Query** für Data Fetching

## 🏗️ Architektur

```
Frontend (Next.js) → Cloudflare Workers → CraCha RAG API
```

## 📦 Installation

```bash
npm install
```

## 🛠️ Development

```bash
# Development Server (Next.js)
npm run dev

# Preview (Cloudflare Workers Simulation)
npm run preview

# Type Check
npm run type-check

# Lint
npm run lint
```

## 🚀 Deployment

```bash
# Build für Cloudflare Workers
npm run deploy

# Oder manuell
npm run build
open-next build
wrangler deploy
```

## 📁 Struktur

```
src/
├── app/                 # Next.js App Router
├── components/          # React Components
│   ├── ui/             # Shadcn/ui Components
│   ├── landing/        # Landing Page Components
│   └── dashboard/      # Dashboard Components
├── lib/                # Utilities & API Clients
├── hooks/              # Custom React Hooks
├── stores/             # Zustand Stores
└── types/              # TypeScript Types
```

## 🔧 Konfiguration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_CRACHA_WORKER_URL=https://cracha-worker-rag.aimpact-agency.workers.dev
```

### Cloudflare Workers

- `wrangler.toml` - Worker Konfiguration
- `open-next.config.ts` - OpenNext Adapter Konfiguration

## 📊 Performance

- **TTFT Target**: <200ms
- **Bundle Size**: <500KB
- **Lighthouse Score**: >90

## 🧪 Testing

```bash
# Unit Tests (coming soon)
npm run test

# E2E Tests (coming soon)
npm run test:e2e
```

## 📚 Dokumentation

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [OpenNext](https://opennext.js.org/cloudflare)
- [Shadcn/ui](https://ui.shadcn.com/)

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature Branch
3. Committe deine Änderungen
4. Erstelle einen Pull Request