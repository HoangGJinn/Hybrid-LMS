import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ClassRoom } from '@features/courses';
import { GradingDeskFilterBar } from './GradingDeskFilterBar';

const classes = [
  { id: 'c1', classCode: 'WEB-26', name: 'Lap trinh Web' },
  { id: 'c2', classCode: 'ALG-01', name: 'Algorithms' },
] as ClassRoom[];

describe('GradingDeskFilterBar', () => {
  const baseProps = {
    tab: 'PENDING' as const,
    typeFilter: 'exam' as const,
    classFilter: 'all',
    searchQuery: '',
    sortOrder: 'newest' as const,
    classes,
    examPendingCount: 2,
    assignmentPendingCount: 3,
    sectionPendingCount: 2,
    sectionGradedCount: 1,
    hasActiveFilters: false,
    onTabChange: vi.fn(),
    onTypeChange: vi.fn(),
    onClassChange: vi.fn(),
    onSearchChange: vi.fn(),
    onSortChange: vi.fn(),
    onClearFilters: vi.fn(),
  };

  it('places Exams tab first, Assignments second, and triggers section & class filters', async () => {
    const onTypeChange = vi.fn();
    const onClassChange = vi.fn();
    const user = userEvent.setup();

    render(
      <GradingDeskFilterBar
        {...baseProps}
        onTypeChange={onTypeChange}
        onClassChange={onClassChange}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent('Exams');
    expect(tabs[0]).toHaveTextContent('2');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveTextContent('Assignments');
    expect(tabs[1]).toHaveTextContent('3');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');

    expect(
      screen.getByRole('button', { name: 'To grade (2)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Graded (1)' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /clear filters/i }),
    ).not.toBeInTheDocument();

    await user.click(tabs[1]);
    expect(onTypeChange).toHaveBeenCalledWith('assignment');

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter by class/i }),
      'c1',
    );
    expect(onClassChange).toHaveBeenCalledWith('c1');
  });

  it('shows Clear filters when sub-filters are active and calls onClearFilters', async () => {
    const onClearFilters = vi.fn();
    const user = userEvent.setup();

    render(
      <GradingDeskFilterBar
        {...baseProps}
        classFilter="c1"
        hasActiveFilters
        onClearFilters={onClearFilters}
      />,
    );

    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
