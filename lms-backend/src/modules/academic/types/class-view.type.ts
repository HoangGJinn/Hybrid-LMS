import { Class } from '../entities/class.entity.js';

export class ClassView {
  id: string;
  classCode: string;
  name: string;
  isActive: boolean;
  endedAt: Date | null;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semesterId: string;
  semesterCode: string;
  semesterName: string;
  lecturerId: string;
  lecturerName: string;
  studentCount?: number;

  static fromEntity(cls: Class, studentCount?: number): ClassView {
    return {
      id: cls.id,
      classCode: cls.classCode,
      name: cls.name,
      isActive: cls.isActive,
      endedAt: cls.endedAt ?? null,
      subjectId: cls.subjectId,
      subjectCode: cls.subject?.subjectCode ?? '',
      subjectName: cls.subject?.name ?? '',
      semesterId: cls.semesterId,
      semesterCode: cls.semester?.semesterCode ?? '',
      semesterName: cls.semester?.name ?? '',
      lecturerId: cls.lecturerId,
      lecturerName: cls.lecturer?.user?.fullName ?? '',
      studentCount,
    };
  }
}
