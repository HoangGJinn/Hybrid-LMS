/** One page of a list endpoint. `total` counts every row matching the filters, not just this page. */
export class PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  static of<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const result = new PaginatedResult<T>();
    result.items = items;
    result.total = total;
    result.page = page;
    result.limit = limit;
    result.totalPages = Math.max(1, Math.ceil(total / limit));
    return result;
  }
}
