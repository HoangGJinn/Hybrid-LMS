import type { ComponentProps } from 'react'
import { CourseCover } from './CourseCover'

interface CourseBannerProps {
  course: ComponentProps<typeof CourseCover>['course']
  /** Small uppercase line above the title (term, class code…). */
  breadcrumb: string
  title: string
}

/** Cover illustration with the breadcrumb line and the course title pill on top. */
export const CourseBanner = ({
  course,
  breadcrumb,
  title,
}: CourseBannerProps) => (
<div className="relative overflow-hidden rounded-2xl shadow-sm">
  <CourseCover course={course} className="h-40 w-full sm:h-56" />
    <div className="absolute inset-0 flex flex-col justify-center gap-5 bg-black/20 px-6 sm:px-10">
      <p className="m-0 text-sm font-semibold uppercase tracking-wide text-white">
        {breadcrumb}
      </p>
      <h1 className="m-0 w-fit max-w-full rounded-xl bg-primary px-7 py-3 text-2xl font-bold text-primary-foreground shadow-md">
        {title}
      </h1>
    </div>
  </div>
)