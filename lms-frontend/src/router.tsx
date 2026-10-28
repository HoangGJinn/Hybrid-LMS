import { createBrowserRouter } from 'react-router';
import { homeByRole } from '@core/config/navigation';
import AppShell from '@core/layouts/AppShell';
import { lazyPage } from '@core/router/lazyPage';
import { crumb } from '@core/router/route-handle';
import FullPageLoader from '@shared/components/FullPageLoader';
import RouteErrorPage from '@shared/components/RouteErrorPage';
import { ProtectedRoute, RoleRedirect } from '@features/auth';
import { loginRoute } from '@features/auth/routes';
import { notificationsRoute } from '@features/notifications/routes';
import {
  studentDashboardRoute,
  lecturerDashboardRoute,
} from '@features/dashboard/routes';
import {
  createStudentCourseRoutes,
  createLecturerClassRoutes,
} from '@features/courses/routes';
import {
  courseGradesTabRoute,
  gradingDeskRoute,
} from '@features/grading/routes';
import {
  classmatesTabRoute,
  lecturerMembersTabRoute,
  studentRosterRoute,
} from '@features/participants/routes';
import { documentRoute } from '@features/documents/routes';
import { quizRoute } from '@features/quizzes/routes';
import {
  assignmentDetailRoute,
  studentAssignmentsRoute,
} from '@features/assignments/routes';
import { examRoomRoute, studentExamsRoute } from '@features/exams/routes';
import { calendarRoute } from '@features/calendar/routes';
import { masteryRoute } from '@features/mastery/routes';
import { roadmapRoute } from '@features/roadmap/routes';
import { analyticsRoute } from '@features/analytics/routes';
import { aiGeneratorRoute } from '@features/ai-generate/routes';

// Each feature owns its routes (features/<name>/routes.ts). This file only assembles them, so features never import each other to build the tree.
export const router = createBrowserRouter([
  {
    HydrateFallback: FullPageLoader,
    ErrorBoundary: RouteErrorPage,
    children: [
      loginRoute,
      {
        element: (
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        ),
        children: [
          {
            // Errors inside a page render here, so the sidebar and top bar stay usable.
            ErrorBoundary: RouteErrorPage,
            children: [
              {
                index: true,
                element: <RoleRedirect homeByRole={homeByRole} />,
              },
              notificationsRoute,
              {
                path: 'student',
                ...crumb('Student'),
                children: [
                  studentDashboardRoute,
                  // Grades (grading) and Classmates (participants) are tabs of a course, detail pages hang below it.
                  createStudentCourseRoutes({
                    tabs: [courseGradesTabRoute, classmatesTabRoute],
                    detailPages: [
                      documentRoute,
                      quizRoute,
                      assignmentDetailRoute,
                      examRoomRoute,
                    ],
                  }),
                  calendarRoute,
                  studentAssignmentsRoute,
                  studentExamsRoute,
                  masteryRoute,
                  roadmapRoute,
                ],
              },
              {
                path: 'lecturer',
                ...crumb('Lecturer'),
                children: [
                  lecturerDashboardRoute,
                  createLecturerClassRoutes({ tabs: [lecturerMembersTabRoute] }),                  gradingDeskRoute,
                  studentRosterRoute,
                  analyticsRoute,
                  aiGeneratorRoute,
                ],
              },
              {
                path: '*',
                ...lazyPage(() => import('@core/views/NotFoundPage')),
              },
            ],
          },
        ],
      },
    ],
  },
]);
