// ============================================
// Overview.jsx — Main stats dashboard
// ============================================
// This is the most important page. It shows:
// - Player card (name, level, avatar)
// - Current rank + Peak rank (with rank icons)
// - Stats grid: K/D, HS%, Win%, Damage/Round, etc.
// - Top agents table
//
// KEY REACT CONCEPT: useEffect
// useEffect runs code AFTER the component appears on screen.
// We use it to fetch data from the API when the page loads.
// The [name, tag] at the end means: "run this again if name or tag changes"

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getAccount, getMMR, getMatches, getRankImage } from "../api";

function Overview() {
  // Get name, tag, region from the URL
  const { region, name, tag } = useParams();

  // Decode the URL-encoded name and tag
  const decodedName = decodeURIComponent(name);
  const decodedTag = decodeURIComponent(tag);

  // ---------- State variables ----------
  // Each one stores a different piece of data
  const [account, setAccount] = useState(null);
  const [mmr, setMMR] = useState(null);
  const [matches, setMatches] = useState([]);
  const [rankImage, setRankImage] = useState(null);
  const [peakRankImage, setPeakRankImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------- useEffect: fetch all data when page loads ----------
  useEffect(() => {
    // We define an async function inside useEffect
    // because useEffect itself cannot be async
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        // Fetch account info, MMR, and matches AT THE SAME TIME
        // Promise.all runs all 3 fetches in parallel (faster!)
        const [accountRes, mmrRes, matchesRes] = await Promise.all([
          getAccount(decodedName, decodedTag),
          getMMR(region, decodedName, decodedTag),
          getMatches(region, decodedName, decodedTag, 10),
        ]);

        // Check if the API returned an error
        if (accountRes.status !== 200) {
          setError("Player not found. Check the name, tag, and region.");
          setLoading(false);
          return;
        }

        setAccount(accountRes.data);
        setMMR(mmrRes.data);
        setMatches(matchesRes.data || []);

        // Fetch rank icon images
        if (mmrRes.data && mmrRes.data.current_data) {
          const img = await getRankImage(mmrRes.data.current_data.currenttier);
          setRankImage(img);
        }

        if (mmrRes.data && mmrRes.data.highest_rank) {
          const peakImg = await getRankImage(mmrRes.data.highest_rank.tier);
          setPeakRankImage(peakImg);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Something went wrong. Try again later.");
      }

      setLoading(false);
    }

    loadData();
  }, [region, decodedName, decodedTag]);
  // ^ This array means: re-run loadData when these values change

  // ---------- Calculate stats from match data ----------
  // We need to find OUR player's stats in each match

  function calculateStats() {
    if (!matches || matches.length === 0) {
      return null;
    }

    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalScore = 0;
    let totalDamage = 0;
    let totalHeadshots = 0;
    let totalBodyshots = 0;
    let totalLegshots = 0;
    let totalRoundsPlayed = 0;
    let wins = 0;
    let matchCount = 0;

    // Track agent usage
    const agentStats = {};

    matches.forEach((match) => {
      // Find our player in the match
      const me = match.players.all_players.find(
        (p) =>
          p.name.toLowerCase() === decodedName.toLowerCase() &&
          p.tag.toLowerCase() === decodedTag.toLowerCase()
      );

      if (!me) return;

      matchCount++;
      totalKills += me.stats.kills;
      totalDeaths += me.stats.deaths;
      totalAssists += me.stats.assists;
      totalScore += me.stats.score;
      totalDamage += me.damage_made;
      totalHeadshots += me.stats.headshots;
      totalBodyshots += me.stats.bodyshots;
      totalLegshots += me.stats.legshots;
      totalRoundsPlayed += match.metadata.rounds_played;

      // Check if we won
      const myTeam = me.team.toLowerCase();
      if (match.teams[myTeam] && match.teams[myTeam].has_won) {
        wins++;
      }

      // Track agent stats
      const agent = me.character;
      if (!agentStats[agent]) {
        agentStats[agent] = {
          name: agent,
          matches: 0,
          wins: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          score: 0,
          damage: 0,
          rounds: 0,
        };
      }
      agentStats[agent].matches++;
      agentStats[agent].kills += me.stats.kills;
      agentStats[agent].deaths += me.stats.deaths;
      agentStats[agent].assists += me.stats.assists;
      agentStats[agent].score += me.stats.score;
      agentStats[agent].damage += me.damage_made;
      agentStats[agent].rounds += match.metadata.rounds_played;
      if (match.teams[myTeam] && match.teams[myTeam].has_won) {
        agentStats[agent].wins++;
      }
    });

    if (matchCount === 0) return null;

    const totalShots = totalHeadshots + totalBodyshots + totalLegshots;

    return {
      matchCount,
      wins,
      losses: matchCount - wins,
      kd: totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills,
      kills: totalKills,
      deaths: totalDeaths,
      assists: totalAssists,
      hsPercent:
        totalShots > 0 ? ((totalHeadshots / totalShots) * 100).toFixed(1) : 0,
      winPercent:
        matchCount > 0 ? ((wins / matchCount) * 100).toFixed(1) : 0,
      damagePerRound:
        totalRoundsPlayed > 0
          ? (totalDamage / totalRoundsPlayed).toFixed(1)
          : 0,
      acs:
        totalRoundsPlayed > 0
          ? (totalScore / totalRoundsPlayed).toFixed(1)
          : 0,
      killsPerRound:
        totalRoundsPlayed > 0
          ? (totalKills / totalRoundsPlayed).toFixed(1)
          : 0,
      agents: Object.values(agentStats).sort(
        (a, b) => b.matches - a.matches
      ),
    };
  }

  const stats = calculateStats();

  function calculateLifetimeStats() {
    if (!mmr || !mmr.by_season) return null;
    let totalWins = 0;
    let totalGames = 0;

    Object.values(mmr.by_season).forEach((season) => {
      if (!season.error && season.number_of_games > 0) {
        totalWins += season.wins || 0;
        totalGames += season.number_of_games || 0;
      }
    });

    if (totalGames === 0) return null;

    return {
      wins: totalWins,
      games: totalGames,
      losses: totalGames - totalWins,
      winRate: ((totalWins / totalGames) * 100).toFixed(1),
    };
  }

  const lifetimeStats = calculateLifetimeStats();

  // ---------- Loading state ----------
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading player data...</p>
      </div>
    );
  }

  // ---------- Error state ----------
  if (error) {
    return (
      <div className="error-message">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="page-content">
      {/* Player Header */}
      {account && (
        <div className="player-header">
          {account.card && (
            <img
              src={account.card.small}
              alt="Player Card"
              className="player-avatar"
            />
          )}
          <div className="player-info">
            <h1>
              {account.name} <span>#{account.tag}</span>
            </h1>
            <div className="player-level">
              Level {account.account_level}
            </div>
          </div>
        </div>
      )}

      {/* Rank Section */}
      {mmr && (
        <div className="rank-section">
          {/* Current Rank */}
          <div className="rank-card">
            {rankImage && <img src={rankImage} alt="Current Rank" />}
            <div>
              <div className="rank-card-label">Current Rating</div>
              <div className="rank-card-value">
                {mmr.current_data && mmr.current_data.currenttier_patched
                  ? mmr.current_data.currenttier_patched
                  : mmr.current_data
                  ? "Tier " + mmr.current_data.currenttier
                  : "Unrated"}
              </div>
              {mmr.current_data && (
                <div className="rank-card-sub">
                  {mmr.current_data.ranking_in_tier} RR
                  {mmr.current_data.mmr_change_to_last_game !== 0 && (
                    <span
                      className={
                        mmr.current_data.mmr_change_to_last_game > 0
                          ? "text-green"
                          : "text-red"
                      }
                    >
                      {" "}
                      ({mmr.current_data.mmr_change_to_last_game > 0
                        ? "+"
                        : ""}
                      {mmr.current_data.mmr_change_to_last_game})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Peak Rank */}
          <div className="rank-card">
            {peakRankImage && <img src={peakRankImage} alt="Peak Rank" />}
            <div>
              <div className="rank-card-label">Peak Rating</div>
              <div className="rank-card-value">
                {mmr.highest_rank
                  ? mmr.highest_rank.patched_tier
                  : "Unknown"}
              </div>
              {mmr.highest_rank && (
                <div className="rank-card-sub">
                  Season: {mmr.highest_rank.season}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lifetime Stats */}
      {lifetimeStats && (
        <>
          <h2 className="section-title">Lifetime Performance</h2>
          <div className="stats-grid" style={{ marginBottom: "32px" }}>
            <div className="stat-card">
              <div className="stat-card-label">Total Matches</div>
              <div className="stat-card-value">{lifetimeStats.games}</div>
              <div className="stat-card-sub neutral">all competitive seasons</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total Wins</div>
              <div className="stat-card-value">{lifetimeStats.wins}</div>
              <div className="stat-card-sub good">matches won</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Win %</div>
              <div className="stat-card-value">{lifetimeStats.winRate}%</div>
              <div className={`stat-card-sub ${lifetimeStats.winRate >= 50 ? "good" : "bad"}`}>
                {lifetimeStats.wins}W - {lifetimeStats.losses}L
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stats Grid */}
      <h2 className="section-title">Recent Matches</h2>
      {stats ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-label">K/D Ratio</div>
              <div className="stat-card-value">{stats.kd}</div>
              <div
                className={`stat-card-sub ${
                  stats.kd >= 1 ? "good" : "bad"
                }`}
              >
                {stats.kills}K / {stats.deaths}D / {stats.assists}A
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">Headshot %</div>
              <div className="stat-card-value">{stats.hsPercent}%</div>
              <div
                className={`stat-card-sub ${
                  stats.hsPercent >= 20 ? "good" : "neutral"
                }`}
              >
                of all shots
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">Win %</div>
              <div className="stat-card-value">{stats.winPercent}%</div>
              <div
                className={`stat-card-sub ${
                  stats.winPercent >= 50 ? "good" : "bad"
                }`}
              >
                {stats.wins}W - {stats.losses}L
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">Damage / Round</div>
              <div className="stat-card-value">{stats.damagePerRound}</div>
              <div className="stat-card-sub neutral">avg per round</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">ACS</div>
              <div className="stat-card-value">{stats.acs}</div>
              <div className="stat-card-sub neutral">
                avg combat score
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">Kills / Round</div>
              <div className="stat-card-value">{stats.killsPerRound}</div>
              <div className="stat-card-sub neutral">avg per round</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">Total Kills</div>
              <div className="stat-card-value">{stats.kills}</div>
              <div className="stat-card-sub neutral">
                in {stats.matchCount} matches
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">Matches Played</div>
              <div className="stat-card-value">{stats.matchCount}</div>
              <div className="stat-card-sub neutral">competitive</div>
            </div>
          </div>

          {/* Top Agents Table */}
          {stats.agents.length > 0 && (
            <>
              <h2 className="section-title">Top Agents</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Matches</th>
                    <th>Win %</th>
                    <th>K/D</th>
                    <th>ACS</th>
                    <th>Dmg/Round</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.agents.map((agent) => (
                    <tr key={agent.name}>
                      <td>
                        <div className="agent-cell">
                          <span>{agent.name}</span>
                        </div>
                      </td>
                      <td>{agent.matches}</td>
                      <td>
                        {agent.matches > 0
                          ? ((agent.wins / agent.matches) * 100).toFixed(0)
                          : 0}
                        %
                      </td>
                      <td>
                        {agent.deaths > 0
                          ? (agent.kills / agent.deaths).toFixed(2)
                          : agent.kills}
                      </td>
                      <td>
                        {agent.rounds > 0
                          ? (agent.score / agent.rounds).toFixed(0)
                          : 0}
                      </td>
                      <td>
                        {agent.rounds > 0
                          ? (agent.damage / agent.rounds).toFixed(0)
                          : 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      ) : (
        <div className="empty-state">
          <p className="text-muted" style={{ padding: "20px 0" }}>No recent competitive matches found for this player.</p>
        </div>
      )}
    </div>
  );
}

export default Overview;
