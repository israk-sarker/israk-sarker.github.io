// ============================================
// MatchHistory.jsx — Recent matches list
// ============================================
// Shows a list of recent competitive matches.
// Each row shows: win/loss indicator, agent, map, score, K/D/A, ACS, date.
//
// KEY REACT CONCEPT: .map()
// We use .map() to loop over an array and create a JSX element for each item.
// Each element MUST have a unique "key" prop so React can track it.

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMatches } from "../api";

function MatchHistory() {
  const { region, name, tag } = useParams();
  const decodedName = decodeURIComponent(name);
  const decodedTag = decodeURIComponent(tag);

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch matches when component loads
  useEffect(() => {
    async function loadMatches() {
      setLoading(true);
      try {
        const res = await getMatches(region, decodedName, decodedTag, 10);
        if (res.data && Array.isArray(res.data)) {
          setMatches(res.data);
        } else if (res.status === 200 && !res.data) {
          setMatches([]);
        } else {
          setError("Could not load match history. The API may be busy — try again.");
        }
      } catch (err) {
        console.error(err);
        setError("Something went wrong.");
      }
      setLoading(false);
    }
    loadMatches();
  }, [region, decodedName, decodedTag]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading matches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h2 className="section-title">Match History</h2>
      {matches.length === 0 ? (
        <div className="empty-state">
          <p className="text-muted" style={{ padding: "20px 0" }}>No recent competitive matches found for this player.</p>
        </div>
      ) : (
        <div className="match-list">
          {/* .map() loops over every match and creates a row */}
        {matches.map((match) => {
          // Find our player in this match
          const me = match.players.all_players.find(
            (p) =>
              p.name.toLowerCase() === decodedName.toLowerCase() &&
              p.tag.toLowerCase() === decodedTag.toLowerCase()
          );

          // If we can't find ourselves, skip this match
          if (!me) return null;

          // Did we win?
          const myTeam = me.team.toLowerCase();
          const didWin =
            match.teams[myTeam] && match.teams[myTeam].has_won;

          // Team scores
          const teamWon = match.teams[myTeam]
            ? match.teams[myTeam].rounds_won
            : 0;
          const teamLost = match.teams[myTeam]
            ? match.teams[myTeam].rounds_lost
            : 0;

          // K/D/A
          const kills = me.stats.kills;
          const deaths = me.stats.deaths;
          const assists = me.stats.assists;

          // ACS = score / rounds played
          const acs =
            match.metadata.rounds_played > 0
              ? Math.round(me.stats.score / match.metadata.rounds_played)
              : 0;

          // Format the date
          const date = match.metadata.game_start_patched || "";

          return (
            <div
              key={match.metadata.matchid}
              className="match-row"
            >
              {/* Win/Loss indicator bar */}
              <div
                className={`match-indicator ${didWin ? "win" : "loss"}`}
              ></div>

              {/* Agent icon */}
              <div className="match-agent">
                {me.assets && me.assets.agent && (
                  <img src={me.assets.agent.small} alt={me.character} />
                )}
              </div>

              {/* Map + Mode info */}
              <div className="match-info">
                <span className="match-map">{match.metadata.map}</span>
                <span className="match-mode">
                  {match.metadata.mode} · {date}
                </span>
              </div>

              {/* Score */}
              <div className={`match-score ${didWin ? "win" : "loss"}`}>
                {teamWon} - {teamLost}
              </div>

              {/* K/D/A */}
              <div className="match-kda">
                <div className="match-kda-numbers">
                  {kills} / {deaths} / {assists}
                </div>
                <div className="match-kda-label">K / D / A</div>
              </div>

              {/* ACS */}
              <div className="match-stat">
                <div className="match-stat-value">{acs}</div>
                <div className="match-stat-label">ACS</div>
              </div>

              {/* K/D ratio */}
              <div className="match-stat">
                <div className="match-stat-value">
                  {deaths > 0 ? (kills / deaths).toFixed(2) : kills}
                </div>
                <div className="match-stat-label">K/D</div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}

export default MatchHistory;
