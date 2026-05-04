// ============================================
// SearchPage.jsx — Landing page with search bar
// ============================================
// This is the first page the user sees.
// It has a search bar where you type a Riot ID like "Name#Tag"
// and a region dropdown to pick the server region.

import { useState } from "react";
import { useNavigate } from "react-router-dom";

function SearchPage() {
  // ---------- useState ----------
  // useState lets us store values that can change over time.
  // When we call the setter (e.g. setInput), React re-renders the component
  // to show the new value on screen.

  // This stores what the user types in the search bar
  const [input, setInput] = useState("");

  // This stores which region is selected (default: "eu")
  const [region, setRegion] = useState("eu");

  // This stores any error message to show
  const [error, setError] = useState("");

  // useNavigate is a React Router hook that lets us change page
  // without reloading. We call navigate("/some/path") to go there.
  const navigate = useNavigate();

  // ---------- handleSearch ----------
  // This runs when the user clicks "Search" or presses Enter.
  // We split the input by "#" to get name and tag separately.
  function handleSearch(e) {
    // e.preventDefault() stops the form from reloading the page
    e.preventDefault();

    // Clear any old error
    setError("");

    // Check if input contains "#"
    if (!input.includes("#")) {
      setError("Please use the format: Name#Tag (example: Player#1234)");
      return;
    }

    // Split by "#" to get name and tag
    const parts = input.split("#");
    const name = parts[0].trim();
    const tag = parts[1].trim();

    // Make sure both parts exist
    if (!name || !tag) {
      setError("Please enter both a name and a tag");
      return;
    }

    // Navigate to the player overview page
    // encodeURIComponent makes special characters safe for URLs
    navigate(
      `/player/${region}/${encodeURIComponent(name)}/${encodeURIComponent(
        tag
      )}/overview`
    );
  }

  // ---------- render ----------
  // This is what gets shown on screen (JSX = HTML inside JavaScript)
  return (
    <div className="search-page">
      <h1 className="search-title">
        VAL<span>TRACKER</span>
      </h1>
      <p className="search-subtitle">
        Search any Valorant player by Riot ID
      </p>

      {/* The form wraps the search bar so pressing Enter triggers handleSearch */}
      <form onSubmit={handleSearch} className="search-box">
        {/* Region dropdown */}
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="eu">EU</option>
          <option value="na">NA</option>
          <option value="ap">AP</option>
          <option value="kr">KR</option>
          <option value="latam">LATAM</option>
          <option value="br">BR</option>
        </select>

        {/* Search input */}
        <input
          type="text"
          placeholder="Name#Tag (e.g. Mr DMK 101#mugay)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        {/* Search button */}
        <button type="submit">Search</button>
      </form>

      {/* Preview of what user typed */}
      {input && !error && (
        <div className="search-preview">
          Searching for: <span>{input}</span> on{" "}
          <span>{region.toUpperCase()}</span>
        </div>
      )}

      {/* Error message */}
      {error && <div className="search-error">{error}</div>}
    </div>
  );
}

export default SearchPage;
