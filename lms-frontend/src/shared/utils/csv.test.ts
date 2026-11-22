import { describe, expect, it } from 'vitest';
import {
  MAX_CSV_BYTES,
  normalizeCsvHeader,
  readCsvFile,
  validateCsvFile,
} from './csv';

describe('normalizeCsvHeader', () => {
  it('should lowercase and strip spaces and punctuation', () => {
    expect(normalizeCsvHeader(' Option A (1) ')).toBe('optiona1');
    expect(normalizeCsvHeader('Student_Code')).toBe('studentcode');
  });
});

describe('validateCsvFile', () => {
  it('should accept a non-empty file up to 2 MB', () => {
    expect(validateCsvFile({ size: 1 })).toBeNull();
    expect(validateCsvFile({ size: MAX_CSV_BYTES })).toBeNull();
  });

  it('should reject an empty file', () => {
    expect(validateCsvFile({ size: 0 })).toBe('This file is empty.');
  });

  it('should reject a file above 2 MB', () => {
    expect(validateCsvFile({ size: MAX_CSV_BYTES + 1 })).toMatch(/at most 2 MB/);
  });
});

describe('readCsvFile', () => {
  it('should return the text of a valid file', async () => {
    const file = new File(['a,b\n1,2'], 'rows.csv', { type: 'text/csv' });

    await expect(readCsvFile(file)).resolves.toEqual({
      text: 'a,b\n1,2',
      error: null,
    });
  });

  it('should return the validation error without reading an invalid file', async () => {
    const empty = new File([], 'empty.csv', { type: 'text/csv' });

    await expect(readCsvFile(empty)).resolves.toEqual({
      text: null,
      error: 'This file is empty.',
    });
  });
});

