// ============================================
// Compare.jsx — Compare 2 players side by side
// ============================================
// Two search bars let you look up two players.
// Their stats appear side by side with the better stat highlighted green.

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getAccount, getMMR, getMatches } from "../api";

function Compare() {
  const { region: urlRegion, name: urlName, tag: urlTag } = useParams();

  // ---------- State for Player 1 ----------
  const [input1, setInput1] = useState(urlName && urlTag ? `${decodeURIComponent(urlName)}#${decodeURIComponent(urlTag)}` : "");
  const [region1, setRegion1] = useState(urlRegion || "eu");
  const [player1, setPlayer1] = useState(null);
  const [loading1, setLoading1] = useState(false);

  // ---------- State for Player 2 ----------
  const [input2, setInput2] = useState("");
  const [region2, setRegion2] = useState("eu");
  const [player2, setPlayer2] = useState(null);
  const [loading2, setLoading2] = useState(false);

  const [error, setError] = useState("");

  // Auto-load player 1 if URL params are present
  useEffect(() => {
    if (urlName && urlTag && urlRegion) {
      const decodedName = decodeURIComponent(urlName);
      const decodedTag = decodeURIComponent(urlTag);
      const combinedInput = `${decodedName}#${decodedTag}`;
      loadPlayer(combinedInput, urlRegion, setPlayer1, setLoading1);
    }
  }, [urlName, urlTag, urlRegion]);

  // ---------- Load a player's data ----------
  async function loadPlayer(input, region, setPlayer, setLoadingFn) {
    if (!input.includes("#")) {
      setError("Use format: Name#Tag");
      return;
    }
    const [pName, pTag] = input.split("#");
    if (!pName.trim() || !pTag.trim()) {
      setError("Enter both name and tag");
      return;
    }
    setError("");
    setLoadingFn(true);

    try {
      const [accountRes, mmrRes, matchesRes] = await Promise.all([
        getAccount(pName.trim(), pTag.trim()),
        getMMR(region, pName.trim(), pTag.trim()),
        getMatches(region, pName.trim(), pTag.trim(), 5),
      ]);

      if (accountRes.status !== 200) {
        setError("Player not found: " + input);
        setLoadingFn(false);
        return;
      }

      // Calculate stats from matches
      const stats = calcStats(matchesRes.data || [], pName.trim(), pTag.trim());

      setPlayer({
        account: accountRes.data,
        mmr: mmrRes.data,
        stats: stats,
        matches: matchesRes.data || [],
      });
    } catch (err) {
      console.error(err);
      setError("Error loading " + input);
    }
    setLoadingFn(false);
  }

  // ---------- Calculate stats from matches ----------
  function calcStats(matches, pName, pTag) {
    let kills = 0, deaths = 0, assists = 0, score = 0, damage = 0;
    let headshots = 0, bodyshots = 0, legshots = 0;
    let rounds = 0, wins = 0, count = 0;

    matches.forEach((match) => {
      const me = match.players.all_players.find(
        (p) => p.name.toLowerCase() === pName.toLowerCase() &&
               p.tag.toLowerCase() === pTag.toLowerCase()
      );
      if (!me) return;
      count++;
      kills += me.stats.kills;
      deaths += me.stats.deaths;
      assists += me.stats.assists;
      score += me.stats.score;
      damage += me.damage_made;
      headshots += me.stats.headshots;
      bodyshots += me.stats.bodyshots;
      legshots += me.stats.legshots;
      rounds += match.metadata.rounds_played;
      const myTeam = me.team.toLowerCase();
      if (match.teams[myTeam] && match.teams[myTeam].has_won) wins++;
    });

    const totalShots = headshots + bodyshots + legshots;
    return {
      matchCount: count,
      kd: deaths > 0 ? (kills / deaths).toFixed(2) : kills.toString(),
      kills, deaths, assists, wins,
      hsPercent: totalShots > 0 ? ((headshots / totalShots) * 100).toFixed(1) : "0",
      winPercent: count > 0 ? ((wins / count) * 100).toFixed(1) : "0",
      acs: rounds > 0 ? (score / rounds).toFixed(0) : "0",
      dmgRound: rounds > 0 ? (damage / rounds).toFixed(0) : "0",
    };
  }

  // ---------- Helper: highlight better stat ----------
  function betterClass(val1, val2) {
    const n1 = parseFloat(val1);
    const n2 = parseFloat(val2);
    if (n1 > n2) return "better";
    return "";
  }

  // ---------- Render a player card ----------
  function renderPlayerCard(player, otherPlayer) {
    if (!player) return null;
    const s = player.stats;
    const o = otherPlayer ? otherPlayer.stats : null;

    // Get last 5 matches mini rows
    const recentMatches = player.matches.slice(0, 5).map((match) => {
      const pName = player.account.name;
      const pTag = player.account.tag;
      const me = match.players.all_players.find(
        (p) => p.name.toLowerCase() === pName.toLowerCase() &&
               p.tag.toLowerCase() === pTag.toLowerCase()
      );
      if (!me) return null;
      const myTeam = me.team.toLowerCase();
      const didWin = match.teams[myTeam] && match.teams[myTeam].has_won;
      const tWon = match.teams[myTeam] ? match.teams[myTeam].rounds_won : 0;
      const tLost = match.teams[myTeam] ? match.teams[myTeam].rounds_lost : 0;
      return { map: match.metadata.map, didWin, score: `${tWon}-${tLost}`,
        kda: `${me.stats.kills}/${me.stats.deaths}/${me.stats.assists}`, id: match.metadata.matchid };
    }).filter(Boolean);

    return (
      <div className="compare-player-card">
        <div className="compare-player-header">
          {player.account.card && (
            <img src={player.account.card.small} alt="card" />
          )}
          <h3>
            {player.account.name} <span>#{player.account.tag}</span>
          </h3>
        </div>
        <div className="compare-stats">
          <div className="compare-stat-row">
            <span className="compare-stat-label">Rank</span>
            <span className="compare-stat-value">
              {player.mmr?.current_data?.currenttier_patched || "Unrated"}
            </span>
          </div>
          <div className="compare-stat-row">
            <span className="compare-stat-label">K/D</span>
            <span className={`compare-stat-value ${o ? betterClass(s.kd, o.kd) : ""}`}>
              {s.kd}
            </span>
          </div>
          <div className="compare-stat-row">
            <span className="compare-stat-label">Headshot %</span>
            <span className={`compare-stat-value ${o ? betterClass(s.hsPercent, o.hsPercent) : ""}`}>
              {s.hsPercent}%
            </span>
          </div>
          <div className="compare-stat-row">
            <span className="compare-stat-label">Win %</span>
            <span className={`compare-stat-value ${o ? betterClass(s.winPercent, o.winPercent) : ""}`}>
              {s.winPercent}%
            </span>
          </div>
          <div className="compare-stat-row">
            <span className="compare-stat-label">ACS</span>
            <span className={`compare-stat-value ${o ? betterClass(s.acs, o.acs) : ""}`}>
              {s.acs}
            </span>
          </div>
          <div className="compare-stat-row">
            <span className="compare-stat-label">Damage/Round</span>
            <span className={`compare-stat-value ${o ? betterClass(s.dmgRound, o.dmgRound) : ""}`}>
              {s.dmgRound}
            </span>
          </div>
        </div>

        {recentMatches.length > 0 && (
          <>
            <div className="compare-matches-title">Last {recentMatches.length} Matches</div>
            {recentMatches.map((m) => (
              <div key={m.id} className="compare-match-mini">
                <div className={`mini-indicator ${m.didWin ? "win" : "loss"}`}></div>
                <span style={{ fontWeight: 600, width: "80px" }}>{m.map}</span>
                <span style={{ color: m.didWin ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                  {m.score}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>{m.kda}</span>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="page-content">
      <h2 className="section-title">Compare Players</h2>

      {/* Two search bars side by side */}
      <div className="compare-search">
        <div className="compare-input-group">
          <select value={region1} onChange={(e) => setRegion1(e.target.value)}>
            <option value="eu">EU</option>
            <option value="na">NA</option>
            <option value="ap">AP</option>
            <option value="kr">KR</option>
          </select>
          <input placeholder="Player 1 — Name#Tag" value={input1}
            onChange={(e) => setInput1(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") loadPlayer(input1, region1, setPlayer1, setLoading1); }}
          />
          <button onClick={() => loadPlayer(input1, region1, setPlayer1, setLoading1)}
            disabled={loading1}>
            {loading1 ? "..." : "Load"}
          </button>
        </div>

        <div className="compare-input-group">
          <select value={region2} onChange={(e) => setRegion2(e.target.value)}>
            <option value="eu">EU</option>
            <option value="na">NA</option>
            <option value="ap">AP</option>
            <option value="kr">KR</option>
          </select>
          <input placeholder="Player 2 — Name#Tag" value={input2}
            onChange={(e) => setInput2(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") loadPlayer(input2, region2, setPlayer2, setLoading2); }}
          />
          <button onClick={() => loadPlayer(input2, region2, setPlayer2, setLoading2)}
            disabled={loading2}>
            {loading2 ? "..." : "Load"}
          </button>
        </div>
      </div>

      {error && <div className="search-error" style={{ marginBottom: "20px" }}>{error}</div>}

      {/* Side by side comparison */}
      <div className="compare-grid">
        {player1 && renderPlayerCard(player1, player2)}
        {player2 && renderPlayerCard(player2, player1)}
      </div>

      {!player1 && !player2 && (
        <div className="error-message">
          <p>Enter two player Riot IDs above to compare their stats</p>
        </div>
      )}
    </div>
  );
}

export default Compare;
