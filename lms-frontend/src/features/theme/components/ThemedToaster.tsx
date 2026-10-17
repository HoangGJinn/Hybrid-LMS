import { Toaster } from 'sonner'
import { useResolvedTheme } from '../hooks/useResolvedTheme'

const ThemedToaster = () => {
  const theme = useResolvedTheme()
  return <Toaster theme={theme} position="top-right" richColors closeButton />
}

export default ThemedToaster
