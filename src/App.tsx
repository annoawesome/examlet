import { useRoute } from './hooks/useRoute';
import { hrefFor, type Route } from './lib/routes';
import { HomePage } from './pages/HomePage';
import { SheetEditorPage } from './pages/SheetEditorPage';
import { StudyPage } from './pages/StudyPage';

export function App() {
  const route = useRoute();

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={hrefFor({ name: 'home' })}>
          <img src="./favicon.svg" alt="" width={28} height={28} />
          <span>Examlet</span>
        </a>
      </header>

      <main className="main">{renderRoute(route)}</main>
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
