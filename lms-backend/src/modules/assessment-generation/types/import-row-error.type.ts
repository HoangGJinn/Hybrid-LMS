/** One problem found in the Excel file. `row` is the Excel row number (row 1 is the header, 0 = whole file). */
export interface RowError {
  row: number;
  field?: string;
  message: string;
}