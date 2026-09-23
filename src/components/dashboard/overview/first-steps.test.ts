import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'

import { FirstSteps } from './first-steps'

it('renders the three first steps as a numbered ordered list', () => {
  const html = renderToStaticMarkup(createElement(FirstSteps))
  const list = html.slice(html.indexOf('<ol'), html.indexOf('</ol>'))
  expect(list.match(/<li/g)).toHaveLength(3)
  expect([...list.matchAll(/<span aria-hidden="true"[^>]*>(\d)<\/span>/g)].map((match) => match[1])).toEqual(['1', '2', '3'])
  expect(html).toContain('100 Credits: genug für 20 Seiten und danach 16 Fragen')
  expect(html).toContain('href="/website-mit-ki-durchsuchen"')
  expect(html).toContain('href="/dashboard/crawl"')
})
