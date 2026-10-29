import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseOverviewHeader } from './CourseOverviewHeader';

describe('CourseOverviewHeader component', () => {
  const defaultProps = {
    status: 'all' as const,
    onStatusChange: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    sort: 'last_accessed' as const,
    onSortChange: vi.fn(),
    viewMode: 'card' as const,
    onViewModeChange: vi.fn(),
  };

  it('renders control elements with initial states', () => {
    render(<CourseOverviewHeader {...defaultProps} />);

    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Tìm kiếm khóa học...'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sort by last accessed/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /card/i })).toBeInTheDocument();
  });

  it('invokes onSearchChange when typing in the search box', async () => {
    const handleSearchChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CourseOverviewHeader
        {...defaultProps}
        onSearchChange={handleSearchChange}
      />,
    );

    const input = screen.getByPlaceholderText('Tìm kiếm khóa học...');
    await user.type(input, 'Web');

    expect(handleSearchChange).toHaveBeenCalled();
  });

  it('clears search input when clear button is clicked', async () => {
    const handleSearchChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CourseOverviewHeader
        {...defaultProps}
        search="Web Development"
        onSearchChange={handleSearchChange}
      />,
    );

    const clearBtn = screen.getByRole('button', { name: 'Xóa tìm kiếm' });
    await user.click(clearBtn);

    expect(handleSearchChange).toHaveBeenCalledWith('');
  });

  it('opens status dropdown and changes status', async () => {
    const handleStatusChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CourseOverviewHeader
        {...defaultProps}
        onStatusChange={handleStatusChange}
      />,
    );

    const statusBtn = screen.getByRole('button', { name: /all/i });
    await user.click(statusBtn);

    const inProgressOption = screen.getByRole('button', {
      name: /in progress/i,
    });
    await user.click(inProgressOption);

    expect(handleStatusChange).toHaveBeenCalledWith('in_progress');
  });

  it('opens sort dropdown and changes sort option', async () => {
    const handleSortChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CourseOverviewHeader
        {...defaultProps}
        onSortChange={handleSortChange}
      />,
    );

    const sortBtn = screen.getByRole('button', {
      name: /sort by last accessed/i,
    });
    await user.click(sortBtn);

    const nameOption = screen.getByRole('button', {
      name: /sort by course name/i,
    });
    await user.click(nameOption);

    expect(handleSortChange).toHaveBeenCalledWith('name');
  });

  it('opens view mode dropdown and changes view mode', async () => {
    const handleViewModeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CourseOverviewHeader
        {...defaultProps}
        onViewModeChange={handleViewModeChange}
      />,
    );

    const viewBtn = screen.getByRole('button', { name: /card/i });
    await user.click(viewBtn);

    const listOption = screen.getByRole('button', { name: /list/i });
    await user.click(listOption);

    expect(handleViewModeChange).toHaveBeenCalledWith('list');
  });
});

