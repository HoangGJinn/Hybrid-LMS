import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './badge'

describe('StatusBadge component', () => {
  it('renders status text replacing underscores with spaces', () => {
    render(<StatusBadge status="IN_PROGRESS" />)
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
  })

  it('applies corresponding tone classes for known status', () => {
    const { container } = render(<StatusBadge status="COMPLETED" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('text-brand')
  })

  it('falls back to default muted styling for unknown status', () => {
    const { container } = render(<StatusBadge status="UNKNOWN_STATUS" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('bg-muted')
  })
})
