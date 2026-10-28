import type { LmsDocument } from '@features/documents';
import type { Section } from '@features/courses';

export const mockDocuments: LmsDocument[] = [
  {
    id: 'd1',
    title: 'Introduction to SDLC',
    uploadedBy: 'lec-001',
    fileName: 'sdlc.pdf',
    fileUrl: '/samples/sdlc.pdf',
    isSeen: true,
  },
  {
    id: 'd2',
    title: 'Requirements Engineering',
    uploadedBy: 'lec-001',
    fileName: 'requirements.pdf',
    fileUrl: '/samples/requirements.pdf',
    isSeen: false,
  },
  {
    id: 'd3',
    title: 'UML Diagrams',
    uploadedBy: 'lec-001',
    fileName: 'uml.pdf',
    fileUrl: '/samples/uml.pdf',
    isSeen: false,
  },
];

export const mockSections: Section[] = [
  {
    id: 's1',
    classId: 'c1',
    title: 'Week 1 — Software Process',
    description: 'Overview of the software development process and SDLC models.',
    orderIndex: 1,
    items: [
      {
        id: 'i1',
        sectionId: 's1',
        itemType: 'DOCUMENT',
        title: 'Introduction to SDLC',
        externalUrl: null,
        orderIndex: 1,
        documentId: 'd1',
        assignmentId: null,
        isCompleted: true,
      },
    ],
  },
  {
    id: 's2',
    classId: 'c1',
    title: 'Week 2 — Requirements',
    description: 'Gathering, analyzing and specifying software requirements.',
    orderIndex: 2,
    items: [
      {
        id: 'i2',
        sectionId: 's2',
        itemType: 'DOCUMENT',
        title: 'Requirements Engineering',
        externalUrl: null,
        orderIndex: 1,
        documentId: 'd2',
        assignmentId: null,
        isCompleted: false,
      },
      {
        id: 'i3',
        sectionId: 's2',
        itemType: 'ASSIGNMENT',
        title: 'Requirements Specification',
        externalUrl: null,
        orderIndex: 2,
        documentId: null,
        assignmentId: 'a1',
        isCompleted: false,
      },
    ],
  },
  {
    id: 's3',
    classId: 'c1',
    title: 'Week 3 — Design',
    description: 'Software design principles and UML modeling.',
    orderIndex: 3,
    items: [
      {
        id: 'i4',
        sectionId: 's3',
        itemType: 'DOCUMENT',
        title: 'UML Diagrams',
        externalUrl: null,
        orderIndex: 1,
        documentId: 'd3',
        assignmentId: null,
        isCompleted: false,
      },
      {
        id: 'i5',
        sectionId: 's3',
        itemType: 'EXAM',
        title: 'Midterm Exam',
        externalUrl: null,
        orderIndex: 2,
        documentId: null,
        assignmentId: null,
        isCompleted: false,
      },
    ],
  },
];
