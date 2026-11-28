import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { CalendarApiEvent } from '../types/calendar.types';
import CalendarPage from './CalendarPage';

const deadline = new Date();
deadline.setHours(23, 59, 0, 0);
const examStart = new Date();
examStart.setHours(8, 0, 0, 0);
const examEnd = new Date();
examEnd.setHours(9, 30, 0, 0);

const mockEvents: CalendarApiEvent[] = [
  {
    id: 'EXAM:e1',
    type: 'EXAM',
    sourceId: 'e1',
    title: 'Midterm Exam',
    classId: 'c1',
    classCode: 'SE104.Q11',
    className: 'Software Engineering',
    occursAt: examStart.toISOString(),
    startAt: examStart.toISOString(),
    endAt: examEnd.toISOString(),
    status: 'UPCOMING',
    isDone: false,
    durationMinutes: 90,
  },
  {
    id: 'ASSIGNMENT:a1',
    type: 'ASSIGNMENT',
    sourceId: 'a1',
    title: 'Binary Trees',
    classId: 'c1',
    classCode: 'SE104.Q11',
    className: 'Software Engineering',
    occursAt: deadline.toISOString(),
    startAt: examStart.toISOString(),
    endAt: deadline.toISOString(),
    status: 'SUBMITTED',
    isDone: true,
    durationMinutes: null,
  },
];

vi.mock('../api/calendar.service', () => ({
  calendarService: { getMyEvents: vi.fn(() => Promise.resolve(mockEvents)) },
}));
vi.mock('@features/mastery', () => ({
  useKcMastery: () => ({
    data: [],
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('CalendarPage', () => {
  it('should show the exam and the assignment deadline of today with their status', async () => {
    renderPage();

    const dayCards = await screen.findAllByRole('link', {
      name: /Midterm Exam/,
    });
    expect(dayCards[0]).toHaveAttribute('href', '/student/courses/c1/exams/e1');
    expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/8:00 AM – 9:30 AM \(90 min\)/).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Due 11:59 PM/).length).toBeGreaterThan(0);
  });

  it('should hide the other kinds from the month grid when a filter is chosen', async () => {
    const user = userEvent.setup();
    renderPage();
    const grid = await screen.findByRole('region', { name: 'Month view' });
    await waitFor(() => expect(grid).toHaveTextContent('Midterm Exam'));

    await user.click(screen.getByRole('button', { name: 'Assignment' }));

    expect(grid).not.toHaveTextContent('Midterm Exam');
    expect(within(grid).getByText(/Binary Trees/)).toBeInTheDocument();
  });

  it('should leave finished work out of the coming-up list', async () => {
    renderPage();

    const heading = await screen.findByRole('heading', { name: 'Coming up' });
    const section = heading.closest('section');

    expect(section).not.toBeNull();
    await waitFor(() => expect(section).toHaveTextContent('Midterm Exam'));
    expect(section).not.toHaveTextContent('Binary Trees');
  });
});