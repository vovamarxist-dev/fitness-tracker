import { AppProvider, useApp } from './lib/app';
import { accessAllowed } from './lib/telegram';
import { Home } from './screens/Home';
import { Plans } from './screens/Plans';
import { SessionEdit } from './screens/SessionEdit';
import { Catalog } from './screens/Catalog';
import { Workout } from './screens/Workout';
import { Summary } from './screens/Summary';
import { Settings } from './screens/Settings';
import { Consent, Policy } from './screens/Legal';
import { AnimGallery } from './screens/AnimGallery';
import { History } from './screens/History';
import { Generate } from './screens/Generate';

function Router() {
  const { route, t } = useApp();
  if (!accessAllowed()) return <main className="screen"><p className="empty">{t('accessDenied')}</p></main>;
  switch (route.name) {
    case 'home': return <Home />;
    case 'pick': return <Plans pick />;
    case 'plans': return <Plans />;
    case 'session': return <SessionEdit id={route.id} />;
    case 'catalog': return <Catalog sessionId={route.sessionId} />;
    case 'workout': return <Workout id={route.id} />;
    case 'summary': return <Summary id={route.id} />;
    case 'settings': return <Settings />;
    case 'history': return <History />;
    case 'generate': return <Generate />;
    case 'policy': return <Policy />;
    case 'consent': return <Consent />;
  }
}

export function App() {
  if (location.hash === '#anims') return <AnimGallery />;
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
