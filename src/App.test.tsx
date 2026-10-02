import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the flight plans page', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Flight Plans' })).toBeTruthy()
  })
})
