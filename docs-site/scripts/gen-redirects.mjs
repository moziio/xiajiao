import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = join(__dirname, '..', '.vitepress', 'dist')
const src = join(__dirname, '..')
const base = '/xiajiao'

const pages = [
  'guide/what-is-xiajiao', 'guide/quick-start', 'guide/installation', 'guide/model-config',
  'guide/soul-guide', 'guide/soul-templates', 'guide/recipes', 'guide/comparison',
  'guide/security', 'guide/migration', 'guide/architecture', 'guide/api-reference',
  'guide/performance', 'guide/troubleshooting', 'guide/faq', 'guide/glossary',
  'guide/dev-guide', 'guide/changelog',
  'features/multi-agent-chat', 'features/tool-calling', 'features/agent-memory',
  'features/rag', 'features/collaboration-flow', 'features/integrations',
  'deployment/local', 'deployment/docker', 'deployment/cloud',
]

let created = 0, skipped = 0
for (const p of pages) {
  const enSource = join(src, `${p}.md`)
  if (existsSync(enSource)) {
    skipped++
    continue
  }
  const target = `${base}/zh/${p}`
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${target}"></head><body>Redirecting to <a href="${target}">${target}</a></body></html>`
  const file = join(dist, `${p}.html`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
  created++
}
console.log(`Redirects: ${created} created, ${skipped} skipped (English page exists)`)
