import { BookOpen, GraduationCap, LayoutDashboard, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Courses', to: '/courses', icon: BookOpen },
  { label: 'Lecturers', to: '/lecturers', icon: Users },
  { label: 'Students', to: '/students', icon: GraduationCap },
];
