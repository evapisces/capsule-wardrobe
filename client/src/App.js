import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import { TopBarSlotProvider } from './lib/topBarSlot';
import ClosetPage from './pages/ClosetPage';
import ItemDetailPage from './pages/ItemDetailPage';
import CapsulesPage from './pages/CapsulesPage';
import CapsuleBuilderPage from './pages/CapsuleBuilderPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import InsightsPage from './pages/InsightsPage';
export default function App() {
    return (_jsxs(TopBarSlotProvider, { children: [_jsx(NavBar, {}), _jsx("main", { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(ClosetPage, {}) }), _jsx(Route, { path: "/items/:id", element: _jsx(ItemDetailPage, {}) }), _jsx(Route, { path: "/capsules", element: _jsx(CapsulesPage, {}) }), _jsx(Route, { path: "/capsules/:id", element: _jsx(CapsuleBuilderPage, {}) }), _jsx(Route, { path: "/trips", element: _jsx(TripsPage, {}) }), _jsx(Route, { path: "/trips/:id", element: _jsx(TripDetailPage, {}) }), _jsx(Route, { path: "/insights", element: _jsx(InsightsPage, {}) })] }) })] }));
}
