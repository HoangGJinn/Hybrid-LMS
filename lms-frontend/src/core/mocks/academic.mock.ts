import type { ClassRoom, Semester, Subject } from '@features/courses';

export const mockSemesters: Semester[] = [
  {
    id: 'sem-1',
    semesterCode: 'HK1-2026',
    name: 'Fall 2026',
    startDate: '2026-09-01T00:00:00Z',
    endDate: '2027-01-15T00:00:00Z',
  },
];

export const mockSubjects: Subject[] = [
  {
    id: 'sub-1',
    subjectCode: 'SE104',
    name: 'Software Engineering',
    description: 'Principles of software development.',
  },
  {
    id: 'sub-2',
    subjectCode: 'IT007',
    name: 'Operating Systems',
    description: 'Processes, memory and file systems.',
  },
  {
    id: 'sub-3',
    subjectCode: 'CS112',
    name: 'Data Structures & Algorithms',
    description: 'Core data structures and algorithm design.',
  },
];

export const mockClasses: ClassRoom[] = [
  {
    id: 'c1',
    classCode: 'SE104.Q11',
    name: 'Software Engineering',
    subjectId: 'sub-1',
    semesterId: 'sem-1',
    lecturerId: 'lec-001',
    lecturerName: 'Dr. Tran Van B',
    studentCount: 48,
    progress: 62,
    coverImage: '/covers/software.svg',
  },
  {
    id: 'c2',
    classCode: 'IT007.Q12',
    name: 'Operating Systems',
    subjectId: 'sub-2',
    semesterId: 'sem-1',
    lecturerId: 'lec-002',
    lecturerName: 'Dr. Le Thi C',
    studentCount: 55,
    progress: 35,
    coverImage: '/covers/os.svg',
  },
  {
    id: 'c3',
    classCode: 'CS112.Q13',
    name: 'Data Structures & Algorithms',
    subjectId: 'sub-3',
    semesterId: 'sem-1',
    lecturerId: 'lec-001',
    lecturerName: 'Dr. Tran Van B',
    studentCount: 60,
    progress: 80,
    coverImage: '/covers/algorithms.svg',
  },
];
