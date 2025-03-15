import ErrorBoundary from './components/ErrorBoundary';
import { TechTreeViewerNoSSR } from './components/TechTreeViewer';

export default function Home() {
  return (
    <main className="h-screen">
      <ErrorBoundary>
        <TechTreeViewerNoSSR />
      </ErrorBoundary>
    </main>
  )
}