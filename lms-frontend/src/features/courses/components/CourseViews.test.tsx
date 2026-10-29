import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CourseCard } from './CourseCard';
import { CourseListItem } from './CourseListItem';
import { CourseSummaryItem } from './CourseSummaryItem';
import type { ClassRoom } from '../types/courses.types';

const sampleCourse: ClassRoom = {
  id: 'cls-1',
  classCode: 'WEB26',
  name: 'Lập trình Web - Nhóm 26',
  subjectId: 'sub-1',
  subjectCode: 'CS105',
  semesterId: 'sem-1',
  semesterName: '2026-2027 HỌC KỲ 1',
  lecturerId: 'lec-1',
  lecturerName: 'TS. Nguyễn Văn An',
  studentCount: 35,
  progress: 75,
};

describe('Course display components', () => {
  it('renders CourseCard with course details and link', () => {
    render(
      <MemoryRouter>
        <CourseCard course={sampleCourse} basePath="/student/courses" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Lập trình Web - Nhóm 26')).toBeInTheDocument();
    expect(screen.getByText('2026-2027 HỌC KỲ 1')).toBeInTheDocument();
    expect(screen.getByText('TS. Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('75% hoàn thành')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/student/courses/cls-1',
    );
  });

  it('renders CourseListItem with compact horizontal layout', () => {
    render(
      <MemoryRouter>
        <CourseListItem course={sampleCourse} basePath="/lecturer/classes" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Lập trình Web - Nhóm 26')).toBeInTheDocument();
    expect(
      screen.getByText(/2026-2027 HỌC KỲ 1 • TS. Nguyễn Văn An/),
    ).toBeInTheDocument();
    expect(screen.getByText('35 sinh viên')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/lecturer/classes/cls-1',
    );
  });

  it('renders CourseSummaryItem with summary info', () => {
    render(
      <MemoryRouter>
        <CourseSummaryItem course={sampleCourse} basePath="/student/courses" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Lập trình Web - Nhóm 26')).toBeInTheDocument();
    expect(
      screen.getByText(/Mã lớp: WEB26 • Số lượng sinh viên: 35 • Tiến độ: 75%/),
    ).toBeInTheDocument();
  });
});

