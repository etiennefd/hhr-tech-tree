import ErrorBoundary from './components/ErrorBoundary';
import { TechTreeViewerNoSSR } from './components/TechTreeViewer';

export default function Home() {
  return (
    <main className="h-[100dvh] overflow-hidden">
      <ErrorBoundary>
        <TechTreeViewerNoSSR />
      </ErrorBoundary>
    </main>
  )
}
