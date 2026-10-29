import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination component', () => {
  it('does not render when total is 0', () => {
    const { container } = render(
      <Pagination page={1} pageSize={6} total={0} onPageChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders range text and page buttons', () => {
    render(
      <Pagination page={1} pageSize={6} total={15} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText('Showing 1–6 of 15')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument();
  });

  it('disables previous button on the first page', () => {
    render(
      <Pagination page={1} pageSize={6} total={15} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled();
  });

  it('disables next button on the last page', () => {
    render(
      <Pagination page={3} pageSize={6} total={15} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeDisabled();
  });

  it('invokes onPageChange when page button or next button is clicked', async () => {
    const handlePageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Pagination
        page={1}
        pageSize={6}
        total={15}
        onPageChange={handlePageChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(handlePageChange).toHaveBeenCalledWith(2);

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('handles many pages with ellipsis gaps and previous navigation', async () => {
    const handlePageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Pagination
        page={5}
        pageSize={10}
        total={100}
        onPageChange={handlePageChange}
      />,
    );

    expect(screen.getByText('Showing 41–50 of 100')).toBeInTheDocument();
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(handlePageChange).toHaveBeenCalledWith(4);
  });
});

