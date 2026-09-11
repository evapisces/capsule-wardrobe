import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import { TopBarSlotProvider } from './lib/topBarSlot';
import { useAuth } from './lib/auth';
import LoginPage from './pages/LoginPage';
import ClosetPage from './pages/ClosetPage';
import ItemDetailPage from './pages/ItemDetailPage';
import CapsulesPage from './pages/CapsulesPage';
import CapsuleBuilderPage from './pages/CapsuleBuilderPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import InsightsPage from './pages/InsightsPage';

export default function App() {
  const { status } = useAuth();

  // While we don't yet know who (if anyone) is signed in, render nothing that
  // would kick off a page-level data fetch.
  if (status === 'loading') {
    return (
      <div role="status" aria-live="polite" style={{ padding: '48px', textAlign: 'center' }}>
        Loading…
      </div>
    );
  }

  // No session: show the login screen and skip NavBar / the authenticated routes.
  if (status === 'anonymous') {
    return <LoginPage />;
  }

  return (
    <TopBarSlotProvider>
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<ClosetPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/capsules" element={<CapsulesPage />} />
          <Route path="/capsules/:id" element={<CapsuleBuilderPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trips/:id" element={<TripDetailPage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Routes>
      </main>
    </TopBarSlotProvider>
  );
}
