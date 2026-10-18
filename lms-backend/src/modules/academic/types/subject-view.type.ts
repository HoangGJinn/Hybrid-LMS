import { Subject } from '../entities/subject.entity.js';

export class SubjectView {
  id: string;
  subjectCode: string;
  name: string;
  description: string | null;

  static fromEntity(entity: Subject): SubjectView {
    const view = new SubjectView();
    view.id = entity.id;
    view.subjectCode = entity.subjectCode;
    view.name = entity.name;
    view.description = entity.description;
    return view;
  }
}
