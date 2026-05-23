import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import ClosetPage from './pages/ClosetPage';
import ItemDetailPage from './pages/ItemDetailPage';
import CapsulesPage from './pages/CapsulesPage';
import CapsuleBuilderPage from './pages/CapsuleBuilderPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';

export default function App() {
  return (
    <>
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<ClosetPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/capsules" element={<CapsulesPage />} />
          <Route path="/capsules/:id" element={<CapsuleBuilderPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trips/:id" element={<TripDetailPage />} />
        </Routes>
      </main>
    </>
  );
}
