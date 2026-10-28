import { describe, expect, it } from 'vitest';
import { getInitial, splitName } from './vietnamese-name';

describe('getInitial', () => {
  it('drops tone marks but keeps letter marks', () => {
    expect(getInitial('Ánh')).toBe('A');
    expect(getInitial('Ấn')).toBe('Â');
    expect(getInitial('Ơn')).toBe('Ơ');
    expect(getInitial('đức')).toBe('Đ');
  });
});

describe('splitName', () => {
  it('uses the first word as family name', () => {
    expect(splitName('Nguyễn Văn An')).toEqual({ family: 'Nguyễn', given: 'Văn An' });
  });
});