import { describe, expect, it } from 'vitest';
import { buildAttachmentDisposition } from './content-disposition.util.js';

describe('buildAttachmentDisposition', () => {
  it('should always force attachment so hostile files never render inline', () => {
    const actualHeader = buildAttachmentDisposition('chuong1.pdf');

    expect(actualHeader).toBe(
      `attachment; filename="chuong1.pdf"; filename*=UTF-8''chuong1.pdf`,
    );
  });

  it('should keep the Vietnamese name in the UTF-8 form and use an ASCII fallback', () => {
    const actualHeader = buildAttachmentDisposition('Bài giảng.pdf');

    expect(actualHeader).toContain('filename="B_i gi_ng.pdf"');
    expect(actualHeader).toContain(
      `filename*=UTF-8''B%C3%A0i%20gi%E1%BA%A3ng.pdf`,
    );
  });

  it('should neutralise quotes and line breaks to prevent header injection', () => {
    const actualHeader = buildAttachmentDisposition(
      'a"b\r\nSet-Cookie: x=1.pdf',
    );

    expect(actualHeader).not.toMatch(/[\r\n]/);
    expect(actualHeader).toContain('filename="a_b__Set-Cookie: x=1.pdf"');
  });

  it('should percent-encode characters reserved by RFC 5987', () => {
    const actualHeader = buildAttachmentDisposition("it's (v1)*.pdf");

    expect(actualHeader).toContain(`filename*=UTF-8''it%27s%20%28v1%29%2A.pdf`);
  });
});
