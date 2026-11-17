import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** Which items a query may see. */
export interface ItemScope {
  /** `true` = the student's view: no hidden items and no items of hidden sections. Staff leave it out. */
  readonly visibleOnly?: boolean;
}

/**
 * Keeps only live items (never the soft-deleted ones) and, for a student, only visible ones.
 * The query must alias the item as `item` and join its section as `section`.
 */
export const restrictToLiveItems = <T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  scope: ItemScope = {},
): SelectQueryBuilder<T> => {
  query.andWhere('item.deletedAt IS NULL');
  if (scope.visibleOnly) {
    query.andWhere('item.isVisible = true').andWhere('section.isVisible = true');
  }
  return query;
};