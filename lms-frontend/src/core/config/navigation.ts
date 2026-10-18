import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  PenSquare,
  Sparkles,
  Users,
  BarChart3,
  Map,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@core/types/auth.types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const navByRole: Record<UserRole, NavItem[]> = {
  STUDENT: [
    { label: 'Dashboard', to: '/student', icon: LayoutDashboard },
    { label: 'My Courses', to: '/student/courses', icon: BookOpen },
    { label: 'Calendar', to: '/student/calendar', icon: CalendarDays },
    { label: 'Assignments', to: '/student/assignments', icon: ClipboardList },
    { label: 'Exams', to: '/student/exams', icon: PenSquare },
    { label: 'Learning Roadmap', to: '/student/roadmap', icon: Map },
    { label: 'Knowledge Mastery', to: '/student/mastery', icon: GraduationCap },
  ],
  LECTURER: [
    { label: 'Dashboard', to: '/lecturer', icon: LayoutDashboard },
    { label: 'My Classes', to: '/lecturer/classes', icon: BookOpen },
    { label: 'Grading Desk', to: '/lecturer/grading', icon: ClipboardList },
    { label: 'Students', to: '/lecturer/students', icon: Users },
    { label: 'Analytics', to: '/lecturer/analytics', icon: BarChart3 },
    { label: 'AI Assessment', to: '/lecturer/ai-generator', icon: Sparkles },
  ],
  ADMIN: [],
};

export const homeByRole: Record<UserRole, string> = {
  STUDENT: '/student',
  LECTURER: '/lecturer',
  ADMIN: '/',
};
