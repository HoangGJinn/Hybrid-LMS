import type { ComponentType } from 'react'

type PageLoader = () => Promise<{ default: ComponentType }>

/** Code-splits a page: its chunk is downloaded the first time the route is visited. */
export const lazyPage = (load: PageLoader) => ({ lazy: async () => ({ Component: (await load()).default }) })
