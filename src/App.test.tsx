import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App', () => {
  it('shows an API error when flight plans cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    )

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Flight Plans' })).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('503')
    })
  })
})
