// ============================================
// App.jsx — Main app with routing
// ============================================
// This is the "root" component. It sets up React Router
// which controls which page/component to show based on the URL.
//
// React Router works like this:
// - <BrowserRouter> wraps everything and enables routing
// - <Routes> contains all our route definitions
// - <Route path="..." element={...} /> says "when URL is X, show component Y"

import { BrowserRouter, Routes, Route, Outlet, useParams } from "react-router-dom";
import SearchPage from "./components/SearchPage";
import Navbar from "./components/Navbar";
import Overview from "./components/Overview";
import MatchHistory from "./components/MatchHistory";
import Performance from "./components/Performance";
import Weapons from "./components/Weapons";
import Compare from "./components/Compare";

// ---------- Layout component ----------
// This wraps all "player" pages. It shows the Navbar on top
// and the current page below it.
// <Outlet /> is where the child route's component gets rendered.
function PlayerLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <Outlet />
    </div>
  );
}

// ---------- Main App ----------
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Search page (home) */}
        <Route path="/" element={<SearchPage />} />

        {/* Player pages — all share the Navbar via PlayerLayout */}
        <Route path="/player/:region/:name/:tag" element={<PlayerLayout />}>
          <Route path="overview" element={<Overview />} />
          <Route path="matches" element={<MatchHistory />} />
          <Route path="performance" element={<Performance />} />
          <Route path="weapons" element={<Weapons />} />
          <Route path="compare" element={<Compare />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
