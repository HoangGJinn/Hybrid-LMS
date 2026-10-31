import type { MyCoursesParams } from '../types/courses.types';

/** Query keys of the courses feature. `['course', id, ...]` is the shared prefix for everything scoped to one course. */
export const courseKeys = {
  all: ['classes'] as const,
  mine: ['classes', 'me'] as const,
  myLecturer: ['classes', 'my-lecturer'] as const,
  myList: (params: MyCoursesParams) => ['classes', 'my-list', params] as const,
  lecturer: (lecturerId: string) =>
    ['classes', 'lecturer', lecturerId] as const,
  detail: (courseId: string) => ['course', courseId] as const,
  sections: (courseId: string) => ['course', courseId, 'sections'] as const,
};

