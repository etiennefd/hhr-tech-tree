import ErrorBoundary from './components/ErrorBoundary';
import { TechTreeViewerNoSSR } from './components/TechTreeViewer';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <ErrorBoundary>
        <TechTreeViewerNoSSR />
      </ErrorBoundary>
    </main>
  )
}