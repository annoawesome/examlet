import { UpdateBanner } from './components/UpdateBanner';
import { useRoute } from './hooks/useRoute';
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate';
import { hrefFor, type Route } from './lib/routes';
import { HomePage } from './pages/HomePage';
import { SheetEditorPage } from './pages/SheetEditorPage';
import { StudyPage } from './pages/StudyPage';

export function App() {
  const route = useRoute();
  const { applyUpdate, dismiss } = useServiceWorkerUpdate();

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={hrefFor({ name: 'home' })}>
          <img src="./favicon.svg" alt="" width={28} height={28} />
          <span>Examlet</span>
        </a>
      </header>

      <main className="main">{renderRoute(route)}</main>

      {applyUpdate && <UpdateBanner onReload={applyUpdate} onDismiss={dismiss} />}
    </div>
  );
}

function renderRoute(route: Route) {
  switch (route.name) {
    case 'home':
      return <HomePage />;
    case 'edit':
      return <SheetEditorPage sheetId={route.sheetId} />;
    case 'study':
      return <StudyPage sheetId={route.sheetId} direction={route.direction} />;
    case 'notFound':
      return (
        <div className="page empty">
          <h1>Page not found</h1>
          <a className="btn btn-primary" href={hrefFor({ name: 'home' })}>
            Go home
          </a>
        </div>
      );
  }
}
