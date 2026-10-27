/** One page of a list endpoint (backend `PaginatedResult`). `total` counts all rows matching the filters. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
