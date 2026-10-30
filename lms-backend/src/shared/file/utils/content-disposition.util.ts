const UNSAFE_FALLBACK_CHARACTERS = /[^\x20-\x7e]|["\\]/g;
const RFC_5987_RESERVED_CHARACTERS = /['()*]/g;
const FALLBACK_REPLACEMENT = '_';

const encodeRfc5987 = (value: string): string =>
  encodeURIComponent(value).replace(
    RFC_5987_RESERVED_CHARACTERS,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

/**
 * Builds a `Content-Disposition: attachment` value that restores the original file name.
 * `attachment` is mandatory so that a hostile HTML/SVG file can never run script on the app's origin.
 */
export const buildAttachmentDisposition = (fileName: string): string => {
  const asciiFallback = fileName.replace(
    UNSAFE_FALLBACK_CHARACTERS,
    FALLBACK_REPLACEMENT,
  );
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeRfc5987(fileName)}`;
};
