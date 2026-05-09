import { state, calculateStats, calculateBestMatch, formatSeasonName } from './main.js';
import { APIOverview } from './api_overview.js';

export async function renderOverview() {
  const contentDiv = document.getElementById('tab-content');
  
  if (!state.account) {
    contentDiv.innerHTML = '<div class="empty-state">Search for a player to view stats.</div>';
    return;
  }

  // Rank data
  const currentRankInfo = state.mmr ? state.mmr.current_data : null;
  const currentTier = currentRankInfo ? currentRankInfo.currenttier : 0;
  const currentRankName = currentRankInfo && currentRankInfo.currenttierpatched ? currentRankInfo.currenttierpatched : 'Unranked';
  const currentRR = currentRankInfo ? currentRankInfo.ranking_in_tier : 0;
  let currentRankImg = await APIOverview.getRankImage(currentTier);

  const peakRankInfo = state.mmr ? state.mmr.highest_rank : null;
  const peakTier = peakRankInfo ? peakRankInfo.tier : 0;
  const peakRankName = peakRankInfo && peakRankInfo.patched_tier ? peakRankInfo.patched_tier : 'Unranked';
  const peakSeason = peakRankInfo && peakRankInfo.season ? formatSeasonName(peakRankInfo.season) : '-';
  let peakRankImg = await APIOverview.getRankImage(peakTier);

  // Lifetime Stats
  let totalGames = 0;
  let totalWins = 0;
  if (state.mmr && state.mmr.by_season) {
    for (const key in state.mmr.by_season) {
      const seasonData = state.mmr.by_season[key];
      if (seasonData && !seasonData.error) {
        totalGames += seasonData.number_of_games || 0;
        totalWins += seasonData.wins || 0;
      }
    }
  }
  const lifetimeWinRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) + '%' : 'N/A';

  // Calculate recent stats
  const recentStats = calculateStats(state.matches, state.account.puuid);
  const bestMatchData = calculateBestMatch(state.matches, state.account.puuid);

  let html = `
    <div class="player-header">
      <img src="${state.account.card.large}" alt="Player Card" class="player-avatar">
      <div class="player-info">
        <h2>${state.account.name} <span>#${state.account.tag}</span></h2>
        <div class="lifetime-stats">Level ${state.account.account_level} • ${totalGames} Lifetime Matches • ${lifetimeWinRate} Lifetime Win Rate</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">Current Rank</div>
        <div class="rank-display">
          <img src="${currentRankImg}" alt="${currentRankName}" class="rank-img">
          <div class="rank-details">
            <div class="rank-name">${currentRankName}</div>
            <div class="rr">${currentRR} RR</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Peak Rank</div>
        <div class="rank-display">
          <img src="${peakRankImg}" alt="${peakRankName}" class="rank-img">
          <div class="rank-details">
            <div class="rank-name">${peakRankName}</div>
            <div class="rr">${peakSeason}</div>
          </div>
        </div>
      </div>
    </div>

    <h3 class="card-title" style="margin-top:40px; margin-bottom:16px;">Recent Stats (Last ${state.matches.length} Matches)</h3>
    <div class="grid-4">
      <div class="card stat-card">
        <div class="card-title">K/D Ratio</div>
        <div class="value">${recentStats.kd}</div>
      </div>
      <div class="card stat-card">
        <div class="card-title">Headshot %</div>
        <div class="value">${recentStats.hs}%</div>
      </div>
      <div class="card stat-card">
        <div class="card-title">Win Rate</div>
        <div class="value">${recentStats.winRate}%</div>
      </div>
      <div class="card stat-card">
        <div class="card-title">ACS</div>
        <div class="value">${recentStats.acs}</div>
      </div>
      <div class="card stat-card">
        <div class="card-title">Dmg / Round</div>
        <div class="value">${recentStats.dmgPerRound}</div>
      </div>
      <div class="card stat-card">
        <div class="card-title">Kills / Round</div>
        <div class="value">${recentStats.killsPerRound}</div>
      </div>
      <div class="card stat-card">
        <div class="card-title">Total Kills</div>
        <div class="value">${recentStats.totalKills}</div>
      </div>
      <div class="card stat-card">
        <div class="card-title">Matches Played</div>
        <div class="value">${state.matches.length}</div>
      </div>
    </div>
  `;

  // Best Match
  if (bestMatchData) {
    const { match, player } = bestMatchData;
    const stats = player.stats;
    const mode = match.metadata.mode;
    const map = match.metadata.map;
    const scoreText = `${match.teams.red.rounds_won} - ${match.teams.blue.rounds_won}`;
    
    html += `
      <h3 class="card-title" style="margin-top:40px; margin-bottom:16px;">Best Performance</h3>
      <div class="card" style="display:flex; align-items:center; justify-content:space-between; padding:20px;">
        <div style="display:flex; align-items:center; gap:20px;">
          <img src="${player.assets.agent.small}" alt="${player.character}" style="width:60px; height:60px; border-radius:50%; background:#171923; padding:5px;">
          <div>
            <div style="font-size:1.2rem; font-weight:700; color:#e8eaf0;">${mode} • ${map}</div>
            <div style="color:#8b8fa3; margin-top:4px;">${scoreText}</div>
          </div>
        </div>
        <div style="display:flex; gap:30px; text-align:center;">
          <div>
            <div style="color:#8b8fa3; font-size:0.9rem;">K/D/A</div>
            <div style="font-size:1.2rem; font-weight:700; color:#e8eaf0;">${stats.kills} / ${stats.deaths} / ${stats.assists}</div>
          </div>
          <div>
            <div style="color:#8b8fa3; font-size:0.9rem;">Score</div>
            <div style="font-size:1.2rem; font-weight:700; color:#e8eaf0;">${stats.score}</div>
          </div>
        </div>
      </div>
    `;
  }

  contentDiv.innerHTML = html;
}
