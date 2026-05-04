// ============================================
// Navbar.jsx — Top navigation bar
// ============================================
// This appears on every page EXCEPT the search page.
// It shows the player name, and links to each tab
// (Overview, Matches, Performance, Weapons, Compare).

import { NavLink, useNavigate, useParams } from "react-router-dom";

function Navbar() {
  // useParams lets us read the URL parameters (:region, :name, :tag)
  // that we defined in our router
  const { region, name, tag } = useParams();
  const navigate = useNavigate();

  // Build the base URL for all tab links
  const base = `/player/${region}/${name}/${tag}`;

  return (
    <nav className="navbar">
      {/* Brand / Logo */}
      <div className="navbar-brand">
        VAL<span>TRACKER</span>
      </div>

      {/* Player name display */}
      <div className="navbar-player">
        <div>
          <span className="navbar-player-name">
            {decodeURIComponent(name)}
          </span>{" "}
          <span className="navbar-player-tag">
            #{decodeURIComponent(tag)}
          </span>
        </div>
      </div>

      {/* Tab links */}
      {/* NavLink is like <a> but it adds an "active" class
          when the current URL matches the link's "to" prop */}
      <div className="navbar-links">
        <NavLink to={`${base}/overview`} end>
          Overview
        </NavLink>
        <NavLink to={`${base}/matches`}>Matches</NavLink>
        <NavLink to={`${base}/performance`}>Performance</NavLink>
        <NavLink to={`${base}/weapons`}>Weapons</NavLink>
        <NavLink to={`${base}/compare`}>Compare</NavLink>
      </div>

      {/* Back to search button */}
      <button className="navbar-back" onClick={() => navigate("/")}>
        ← New Search
      </button>
    </nav>
  );
}

export default Navbar;
