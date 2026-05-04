// ============================================
// Performance.jsx — Rank history per act/season
// ============================================
// Shows a table with the player's rank at the end of each act.
// Uses the MMR v2 endpoint which gives us "by_season" data.
//
// KEY REACT CONCEPT: Object.entries()
// The API returns seasons as an object like { "e9a3": {...}, "e9a2": {...} }
// Object.entries() turns that into an array of [key, value] pairs
// so we can loop over them with .map()

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMMR, getRankImage } from "../api";

function Performance() {
  const { region, name, tag } = useParams();
  const decodedName = decodeURIComponent(name);
  const decodedTag = decodeURIComponent(tag);

  const [seasons, setSeasons] = useState([]);
  const [peakRank, setPeakRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPerformance() {
      setLoading(true);
      try {
        const res = await getMMR(region, decodedName, decodedTag);

        if (res.data && res.data.by_season) {
          // Convert the by_season object into an array
          const seasonEntries = Object.entries(res.data.by_season);

          // Filter out seasons with errors or no games
          const validSeasons = seasonEntries
            .filter(([key, val]) => !val.error && val.number_of_games > 0)
            .map(([key, val]) => ({
              id: key,
              label: formatSeasonName(key),
              finalRank: val.final_rank_patched,
              finalRankTier: val.final_rank,
              wins: val.wins,
              games: val.number_of_games,
              winRate:
                val.number_of_games > 0
                  ? ((val.wins / val.number_of_games) * 100).toFixed(0)
                  : 0,
            }));

          // Sort by season (newest first)
          // Season format: e9a3 = Episode 9 Act 3
          validSeasons.sort((a, b) => {
            const getEpAct = (id) => {
              const match = id.match(/e(\d+)a(\d+)/);
              if (match) {
                return { ep: parseInt(match[1], 10), act: parseInt(match[2], 10) };
              }
              return { ep: 0, act: 0 };
            };
            const aNum = getEpAct(a.id);
            const bNum = getEpAct(b.id);
            if (bNum.ep !== aNum.ep) {
              return bNum.ep - aNum.ep;
            }
            return bNum.act - aNum.act;
          });

          // Fetch rank images for each season
          for (let s of validSeasons) {
            s.rankImage = await getRankImage(s.finalRankTier);
          }

          setSeasons(validSeasons);
        }

        // Also save peak rank info
        if (res.data && res.data.highest_rank) {
          const peakImg = await getRankImage(res.data.highest_rank.tier);
          setPeakRank({
            name: res.data.highest_rank.patched_tier,
            season: res.data.highest_rank.season,
            image: peakImg,
          });
        }
      } catch (err) {
        console.error(err);
        setError("Could not load performance data.");
      }
      setLoading(false);
    }
    loadPerformance();
  }, [region, decodedName, decodedTag]);

  // Helper: "e9a3" → "Episode 9: Act 3"
  function formatSeasonName(id) {
    // id format: e{episode}a{act}
    const match = id.match(/e(\d+)a(\d+)/);
    if (match) {
      return `Episode ${match[1]}: Act ${match[2]}`;
    }
    return id;
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading performance...</p>
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
      {/* Peak rank highlight */}
      {peakRank && (
        <div className="rank-section" style={{ marginBottom: "32px" }}>
          <div className="rank-card">
            {peakRank.image && (
              <img src={peakRank.image} alt="Peak Rank" />
            )}
            <div>
              <div className="rank-card-label">All-Time Peak Rank</div>
              <div className="rank-card-value">{peakRank.name}</div>
              <div className="rank-card-sub">
                Achieved in: {formatSeasonName(peakRank.season)}
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 className="section-title">Rank Per Season</h2>
      <div className="performance-grid">
        {seasons.length === 0 && (
          <p className="text-muted">No season data found.</p>
        )}

        {seasons.map((season) => (
          <div key={season.id} className="season-row">
            {/* Season name */}
            <div className="season-name">{season.label}</div>

            {/* Final rank */}
            <div className="season-rank">
              {season.rankImage && (
                <img src={season.rankImage} alt={season.finalRank} />
              )}
              <span className="season-rank-name">{season.finalRank}</span>
            </div>

            {/* Wins */}
            <div className="season-stat">
              <div className="season-stat-value">{season.wins}</div>
              <div className="season-stat-label">Wins</div>
            </div>

            {/* Games */}
            <div className="season-stat">
              <div className="season-stat-value">{season.games}</div>
              <div className="season-stat-label">Games</div>
            </div>

            {/* Win rate */}
            <div className="season-stat">
              <div className="season-stat-value">{season.winRate}%</div>
              <div className="season-stat-label">Win Rate</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Performance;
