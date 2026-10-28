/**
 * Saves text as a CSV file through the browser. A UTF-8 byte-order mark is added so that Excel
 * reads accented characters (e.g. Vietnamese names) correctly.
 */
export const downloadCsv = (content: string, fileName: string): void => {
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
