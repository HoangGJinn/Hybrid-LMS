import { Fragment } from 'react'
import { Link, useMatches } from 'react-router'
import { ChevronRight } from 'lucide-react'
import type { RouteHandle } from '@core/router/route-handle'

/** Builds the trail from `handle.crumb` of the matched routes (see src/router.tsx). */
const Breadcrumbs = () => {
  const matches = useMatches()
  const crumbs = matches.flatMap((match) => {
    const crumb = (match.handle as RouteHandle | undefined)?.crumb
    return crumb ? [{ id: match.id, pathname: match.pathname, params: match.params, crumb }] : []
  })

  if (crumbs.length < 2) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-sm text-muted-foreground">
        {crumbs.map(({ id, pathname, params, crumb: Crumb }, index) => {
          const isLast = index === crumbs.length - 1
          const label = typeof Crumb === 'string' ? Crumb : <Crumb params={params} />
          return (
            <Fragment key={id}>
              <li className="min-w-0 max-w-[14rem] truncate sm:max-w-xs">
                {isLast ? (
                  <span aria-current="page" className="font-medium text-foreground">{label}</span>
                ) : (
                  <Link to={pathname} className="text-muted-foreground no-underline hover:text-brand hover:underline">{label}</Link>
                )}
              </li>
              {!isLast && <li aria-hidden="true" className="flex"><ChevronRight className="h-4 w-4" /></li>}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
