// Copies the prerendered pages OpenNext wrote to .open-next/cache into the
// static assets, where the static-assets incremental cache (open-next.config.ts)
// reads them. `opennextjs-cloudflare deploy` does this itself; CI deploys the
// built artifact with `wrangler deploy`, so the copy has to be part of the build.
//
// `opennextjs-cloudflare populateCache local` would do the same copy, but it
// first starts a Wrangler platform proxy for every binding in wrangler.jsonc,
// and the `ai` binding only exists remotely: without CLOUDFLARE_API_TOKEN the
// command aborts before copying anything. The build job has no token, and
// handing it one just to copy files is not worth it.
//
// Fails loudly on an empty cache: the site would still work, but every page
// would silently go back to being rendered on each request.
import fs from 'node:fs'
import path from 'node:path'

const source = path.join('.open-next', 'cache')
const target = path.join('.open-next', 'assets', 'cdn-cgi', '_next_cache')

const entries = fs.existsSync(source)
  ? fs.readdirSync(source, { recursive: true }).filter((name) => String(name).endsWith('.cache'))
  : []
if (entries.length === 0) {
  console.error(`No prerendered pages in ${source}; run opennextjs-cloudflare build first.`)
  process.exit(1)
}

fs.rmSync(target, { recursive: true, force: true })
fs.cpSync(source, target, { recursive: true })
console.log(`Copied ${entries.length} prerendered pages to ${target}`)
