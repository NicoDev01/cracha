/** Auth return targets must stay on this site, including after URL normalization. */
export function safeAuthNext(value: string | null): string {
  const fallback = '/dashboard'
  if (!value?.startsWith('/') || value.startsWith('//') || /[\s\\]/.test(value)) return fallback
  try {
    const base = 'https://cracha.invalid'
    const target = new URL(value, base)
    if (target.origin !== base || target.pathname.startsWith('//')) return fallback
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return fallback
  }
}
