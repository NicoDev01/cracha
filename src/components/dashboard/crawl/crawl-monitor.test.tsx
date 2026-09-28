// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { useCrawlStore, type CrawlJob } from '@/stores/crawl-store'
import { CrawlMonitor } from './crawl-monitor'

vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => children }))

const failed: CrawlJob = {
  id: 'crawl_1', remote_job_id: 'job-1', tenant_id: 'simba-website-912f59e3', name: 'Simba Website',
  status: 'failed', phase: 'failed', url: 'https://www.simba.de/', type: 'recursive',
  pages_crawled: 0, chunks_created: 0, pages_skipped: 0,
  created_at: '2026-09-28T06:03:51.000Z', updated_at: '2026-09-28T06:05:32.000Z', completed_at: '2026-09-28T06:05:32.000Z',
  error: 'Deine Wissensbasis konnte nicht fertiggestellt werden. Bitte versuche es erneut.',
}

afterEach(() => cleanup())

it('offers a retry after a failed crawl and starts it', async () => {
  const retryCrawl = vi.fn().mockResolvedValue(undefined)
  useCrawlStore.setState({ currentJob: failed, isRunning: false, statusError: null, quotaNotice: null, retryCrawl })

  render(<CrawlMonitor />)
  fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))

  await waitFor(() => expect(retryCrawl).toHaveBeenCalledTimes(1))
})

it('offers no retry while a crawl runs or when it succeeded', () => {
  useCrawlStore.setState({ currentJob: { ...failed, status: 'running', phase: 'crawling' }, isRunning: true })
  const { unmount } = render(<CrawlMonitor />)
  expect(screen.queryByRole('button', { name: 'Erneut versuchen' })).toBeNull()
  unmount()

  useCrawlStore.setState({ currentJob: { ...failed, status: 'completed', phase: 'completed', error: undefined }, isRunning: false })
  render(<CrawlMonitor />)
  expect(screen.queryByRole('button', { name: 'Erneut versuchen' })).toBeNull()
})

it('offers no retry for a crawl that never got a knowledge base', () => {
  useCrawlStore.setState({ currentJob: { ...failed, tenant_id: '' }, isRunning: false })
  render(<CrawlMonitor />)
  expect(screen.queryByRole('button', { name: 'Erneut versuchen' })).toBeNull()
})
