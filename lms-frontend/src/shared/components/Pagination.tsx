import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@shared/components/ui/button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

type PageItem = number | 'gap';

const getPageItems = (page: number, totalPages: number): PageItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const wanted = [1, page - 1, page, page + 1, totalPages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const unique = [...new Set(wanted)];
  const items: PageItem[] = [];
  unique.forEach((p, index) => {
    if (index > 0 && p - unique[index - 1] > 1) items.push('gap');
    items.push(p);
  });
  return items;
};

/** Reusable pagination bar showing "Showing X-Y of Z" + prev/page/next buttons. */
export const Pagination = ({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) => {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <p className="m-0">
        Showing {from}–{to} of {total}
      </p>
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getPageItems(page, totalPages).map((item, index) =>
            item === 'gap' ? (
              <span
                key={`gap-${index}`}
                aria-hidden="true"
                className="px-1 text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                type="button"
                key={item}
                variant={item === page ? 'default' : 'ghost'}
                size="sm"
                className="h-8 min-w-[2rem] px-2 text-xs"
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            ),
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Next page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
};

