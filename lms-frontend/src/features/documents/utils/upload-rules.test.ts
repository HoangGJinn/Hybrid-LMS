import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_MAX_SIZE_BYTES,
  titleFromFileName,
  validateDocumentFile,
} from './upload-rules';

const buildFile = (type: string, size: number): File => {
  const file = new File(['x'], 'a.bin', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('validateDocumentFile', () => {
  it('should accept a PDF within the size limit', () => {
    expect(validateDocumentFile(buildFile('application/pdf', 1000))).toBeNull();
  });

  it('should accept a file of exactly the maximum size', () => {
    expect(
      validateDocumentFile(
        buildFile('application/pdf', DOCUMENT_MAX_SIZE_BYTES),
      ),
    ).toBeNull();
  });

  it('should reject an unsupported format', () => {
    expect(validateDocumentFile(buildFile('text/html', 1000))).toMatch(
      /format/,
    );
  });

  it('should reject an empty file', () => {
    expect(validateDocumentFile(buildFile('application/pdf', 0))).toMatch(
      /empty/,
    );
  });

  it('should reject a file above the size limit', () => {
    expect(
      validateDocumentFile(
        buildFile('application/pdf', DOCUMENT_MAX_SIZE_BYTES + 1),
      ),
    ).toMatch(/too large/);
  });
});

describe('titleFromFileName', () => {
  it('should drop the extension', () => {
    expect(titleFromFileName('Chuong 1.pdf')).toBe('Chuong 1');
  });

  it('should keep dots inside the name and only drop the last extension', () => {
    expect(titleFromFileName('v1.2.slides.pptx')).toBe('v1.2.slides');
  });

  it('should keep a name without extension', () => {
    expect(titleFromFileName('README')).toBe('README');
  });

  it('should fall back for an empty title', () => {
    expect(titleFromFileName('  .pdf')).toBe('Untitled document');
  });
});
