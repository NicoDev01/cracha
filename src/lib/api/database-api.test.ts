import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('@/lib/api/request', () => ({ apiFetch: mocks.fetch }))
const { databaseAPI } = await import('./database-api')

function list(ids: string[]) {
  return new Response(JSON.stringify({ success: true, databases: ids.map((id) => ({ id })) }), { status: 200 })
}

beforeEach(() => mocks.fetch.mockReset())

it('shares one listing between everyone who asks at the same time', async () => {
  mocks.fetch.mockImplementation(async () => list(['a']))

  const [first, second, third] = await Promise.all([
    databaseAPI.getUserDatabases(),
    databaseAPI.getUserDatabases(),
    databaseAPI.getUserDatabases(),
  ])

  expect(mocks.fetch).toHaveBeenCalledTimes(1)
  expect(first).toEqual(second)
  expect(third).toEqual([{ id: 'a' }])
})

it('asks again once the previous listing has arrived', async () => {
  mocks.fetch.mockImplementation(async () => list(['a']))

  await databaseAPI.getUserDatabases()
  await databaseAPI.getUserDatabases()

  expect(mocks.fetch).toHaveBeenCalledTimes(2)
})

it('never hands out a listing from before a deletion', async () => {
  let answerStale!: (response: Response) => void
  mocks.fetch
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { answerStale = resolve }))
    .mockImplementationOnce(async () => new Response(JSON.stringify({ success: true }), { status: 200 }))
    .mockImplementationOnce(async () => list([]))

  const stale = databaseAPI.getUserDatabases()
  await databaseAPI.deleteDatabase('a')
  const fresh = databaseAPI.getUserDatabases()
  answerStale(list(['a']))

  expect(await stale).toEqual([{ id: 'a' }])
  expect(await fresh).toEqual([])
})
