export interface Subject {
  id: string;
  subjectCode: string;
  name: string;
  description: string | null;
}

export interface Semester {
  id: string;
  semesterCode: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface ClassRoom {
  id: string;
  classCode: string;
  name: string;
  isActive?: boolean;
  endedAt?: string | null;
  subjectId: string;
  subjectCode?: string;
  subjectName?: string;
  semesterId: string;
  semesterCode?: string;
  semesterName?: string;
  lecturerId: string;
  lecturerName: string;
  studentCount: number;
  progress: number;
  /** Cover image URL. Falls back to a subject-based placeholder in /public/covers. */
  coverImage?: string;
}

export type ItemType = 'DOCUMENT' | 'ASSIGNMENT' | 'EXAM';

export interface SectionItem {
  id: string;
  sectionId: string;
  itemType: ItemType;
  title: string;
  externalUrl: string | null;
  orderIndex: number;
  documentId: string | null;
  assignmentId: string | null;
  isCompleted: boolean;
}

export interface Section {
  id: string;
  classId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  items: SectionItem[];
}
