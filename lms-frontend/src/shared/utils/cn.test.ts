import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('handles conditional class names', () => {
    const isHidden = false
    const isActive = true
    expect(cn('base', isHidden && 'hidden', isActive && 'active')).toBe('base active')
  })

  it('resolves conflicting tailwind classes with twMerge', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles empty or undefined inputs gracefully', () => {
    expect(cn(null, undefined, false, '')).toBe('')
  })
})
