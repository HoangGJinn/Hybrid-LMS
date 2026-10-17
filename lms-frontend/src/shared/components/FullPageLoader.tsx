const FullPageLoader = () => (
  <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
  </div>
)

export default FullPageLoader
