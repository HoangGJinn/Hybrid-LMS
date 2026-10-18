export type RoadmapItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface RoadmapItem {
  id: string;
  kcId: string;
  kcName: string;
  reason: string | null;
  priorityScore: number;
  dueDate: string | null;
  status: RoadmapItemStatus;
}

export interface LearningRoadmap {
  id: string;
  subjectId: string;
  title: string;
  createdAt: string;
  items: RoadmapItem[];
}
