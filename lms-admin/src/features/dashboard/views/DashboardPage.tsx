import type { ReactNode } from 'react';
import { BookOpen, CalendarDays, GraduationCap, Users } from 'lucide-react';
import { Link } from 'react-router';
import { useAdminSession } from '@/features/auth';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { buttonClasses } from '@/shared/components/ui/button-classes';
import {
  useDashboardStats,
  type DashboardStatKey,
} from '../hooks/useDashboardStats';

const STAT_ICONS: Record<DashboardStatKey, ReactNode> = {
  classes: <BookOpen className="h-4 w-4" />,
  students: <GraduationCap className="h-4 w-4" />,
  lecturers: <Users className="h-4 w-4" />,
  semester: <CalendarDays className="h-4 w-4" />,
};

const DashboardPage = () => {
  const { data: user } = useAdminSession();
  const { stats, isPlaceholder } = useDashboardStats();

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.fullName ?? 'Admin'}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.key}
            label={stat.label}
            value={stat.value ?? '—'}
            hint={isPlaceholder ? 'Coming soon' : undefined}
            icon={STAT_ICONS[stat.key]}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-10 text-center">
        <p className="m-0 font-medium">Overview and activity charts</p>
        <p className="m-0 max-w-md text-sm text-muted-foreground">
          System-wide statistics will appear here. In the meantime, you can
          manage classes from the Courses page.
        </p>
        <Link to="/courses" className={buttonClasses('outline')}>
          Go to Courses
        </Link>
      </div>
    </>
  );
};

export default DashboardPage;
