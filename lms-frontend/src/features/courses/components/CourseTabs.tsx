import { NavLink } from 'react-router'
import { cn } from '@shared/utils/cn'

interface CourseTab {
  label: string
  /** Omit for a tab whose page does not exist yet. */
  to?: string
  end?: boolean
}

interface CourseTabsProps {
  tabs: CourseTab[]
}

const tabClass = 'border-b-2 px-5 py-5 text-sm no-underline'

/** Flat white tab bar shown under the course banner; the active tab gets a brand underline. */
export const CourseTabs = ({ tabs }: CourseTabsProps) => (
  <nav aria-label="Course sections" className="flex gap-2 rounded-t-2xl bg-card px-2 shadow-sm">
    {tabs.map(({ label, to, end }) =>
      to === undefined ? (
        <span
          key={label}
          aria-disabled="true"
          className={cn(tabClass, 'border-transparent text-muted-foreground/60')}
        >
          {label}
        </span>
      ) : (
        <NavLink
          key={label}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              tabClass,
              isActive
                ? 'border-primary font-semibold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          }
        >
          {label}
        </NavLink>
      ),
    )}
  </nav>
)