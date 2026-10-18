import { Semester } from '../entities/semester.entity.js';

export class SemesterView {
  id: string;
  semesterCode: string;
  name: string;
  startDate: Date;
  endDate: Date;

  static fromEntity(entity: Semester): SemesterView {
    const view = new SemesterView();
    view.id = entity.id;
    view.semesterCode = entity.semesterCode;
    view.name = entity.name;
    view.startDate = entity.startDate;
    view.endDate = entity.endDate;
    return view;
  }
}
