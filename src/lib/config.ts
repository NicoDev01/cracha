export const API_CONFIG = {
  worker: {
    baseUrl: process.env.NEXT_PUBLIC_CRACHA_WORKER_URL || 'https://cracha-worker-rag.aimpact-agency.workers.dev',
    timeout: 30000
  },
  performance: {
    ttftTarget: 200, // Time to First Token target in ms
    queryTimeout: 30000,
  },
  isDevelopment: process.env.NEXT_PUBLIC_APP_ENV === 'development',
} as const

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  chat: '/dashboard/chat',
  crawl: '/dashboard/crawl',
  databases: '/dashboard/databases',
  settings: '/dashboard/settings',
} as const