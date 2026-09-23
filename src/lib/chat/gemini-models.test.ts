import { afterEach, describe, expect, it, vi } from 'vitest'

import { checkGeminiKey, textModels } from './gemini-models'

afterEach(() => vi.unstubAllGlobals())

describe('textModels', () => {
  it('keeps text models the key can generate with, preferred ones first', () => {
    expect(textModels([
      { name: 'models/gemini-3.1-pro-preview', displayName: 'Gemini 3.1 Pro Preview', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.7-flash', displayName: 'Gemini 3.7 Flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.6-flash', displayName: 'Gemini 3.6 Flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.1-flash-image', displayName: 'Nano Banana 2', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/imagen-4.0', supportedGenerationMethods: ['predict'] },
    ]).map((model) => model.id)).toEqual(['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.1-pro-preview'])
  })
})

describe('checkGeminiKey', () => {
  const reply = (status: number, body: unknown) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))

  it('lists the models of a valid key', async () => {
    reply(200, { models: [{ name: 'models/gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', supportedGenerationMethods: ['generateContent'] }] })
    expect(await checkGeminiKey('k')).toEqual({ ok: true, models: [{ id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (empfohlen)' }] })
  })

  it('says plainly when Google does not know the key', async () => {
    reply(400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } })
    expect(await checkGeminiKey('k')).toMatchObject({ ok: false, keyRejected: true, message: expect.stringContaining('vollständig kopiert') })
  })

  it('passes on what Google says about a region restriction', async () => {
    reply(400, { error: { message: 'User location is not supported for the API use.', status: 'FAILED_PRECONDITION' } })
    expect(await checkGeminiKey('k')).toMatchObject({ ok: false, keyRejected: true, message: expect.stringContaining('User location is not supported') })
  })

  it('does not call a network failure a bad key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    expect(await checkGeminiKey('k')).toMatchObject({ ok: false, keyRejected: false })
  })
})
