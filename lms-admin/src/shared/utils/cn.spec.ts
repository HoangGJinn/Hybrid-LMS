import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('should handle conditional classes', () => {
    const isTrue = true;
    const isFalse = false;
    expect(cn('base', isTrue && 'active', isFalse && 'disabled')).toBe('base active');
  });

  it('should merge Tailwind conflicting classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle empty or undefined values gracefully', () => {
    expect(cn(undefined, null, false, '')).toBe('');
  });
});
