// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { DeleteAccountDialog } from './delete-account-dialog'

const fetchMock = vi.fn()

function openDialog(onDeleted = vi.fn()) {
  render(<DeleteAccountDialog onDeleted={onDeleted} />)
  fireEvent.click(screen.getByRole('button', { name: 'Konto löschen' }))
  return {
    onDeleted,
    input: screen.getByLabelText(/Gib zur Bestätigung/),
    confirm: screen.getByRole<HTMLButtonElement>('button', { name: 'Konto endgültig löschen' }),
  }
}

describe('DeleteAccountDialog', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('names what is lost, including purchased credits without refund', () => {
    openDialog()
    const dialog = screen.getByRole('alertdialog')
    expect(dialog.textContent).toMatch(/Wissensbasen mit ihren indexierten Inhalten/)
    expect(dialog.textContent).toMatch(/auch gekaufte Credits – ohne Erstattung/)
    expect(dialog.textContent).toMatch(/Zahlungsbelege bewahren wir/)
  })

  it('keeps the final button disabled until LÖSCHEN is typed', () => {
    const { input, confirm } = openDialog()
    expect(confirm.disabled).toBe(true)

    fireEvent.change(input, { target: { value: 'löschen' } })
    expect(confirm.disabled).toBe(true)
    fireEvent.change(input, { target: { value: 'LÖSCHE' } })
    expect(confirm.disabled).toBe(true)

    fireEvent.change(input, { target: { value: 'LÖSCHEN' } })
    expect(confirm.disabled).toBe(false)
  })

  it('does not call the server while the phrase is missing', () => {
    const { confirm } = openDialog()
    fireEvent.click(confirm)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the phrase and hands over once the server confirms', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))
    const { input, confirm, onDeleted } = openDialog()
    fireEvent.change(input, { target: { value: 'LÖSCHEN' } })
    fireEvent.click(confirm)

    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith('/api/account/delete', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ confirm: 'LÖSCHEN' }),
    }))
  })

  it('shows the server error, stays open and does not sign out', async () => {
    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({ success: false, error: 'Ein laufender Crawl konnte nicht sicher abgebrochen werden.' }),
      { status: 503 },
    ))
    const { input, confirm, onDeleted } = openDialog()
    fireEvent.change(input, { target: { value: 'LÖSCHEN' } })
    fireEvent.click(confirm)

    expect((await screen.findByRole('alert')).textContent).toBe('Ein laufender Crawl konnte nicht sicher abgebrochen werden.')
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeNull()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Konto endgültig löschen' }).disabled).toBe(false)
  })
})
