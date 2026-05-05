// Global State
const APP = {
  account: null,
  mmr: null,
  matches: [],
  region: 'eu',
  name: '',
  tag: '',
  chartInstance: null
};

// Initialization
document.addEventListener("DOMContentLoaded", init);

function init() {
  document.getElementById('search-btn').addEventListener('click', handleSearch);
  document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  document.getElementById('back-btn').addEventListener('click', showSearchScreen);

  // Tab navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = e.target.getAttribute('data-tab');
      switchTab(tab);
      // Update hash without scrolling
      history.replaceState(null, null, `#${tab}`);
    });
  });

  // Check hash for direct tab access if we already have data
  window.addEventListener("hashchange", () => {
    if (!document.getElementById("dashboard").classList.contains("hidden")) {
      const hash = window.location.hash.replace('#', '') || 'overview';
      switchTab(hash);
    }
  });
}

async function handleSearch() {
  const region = document.getElementById('search-region').value;
  const input = document.getElementById('search-input').value.trim();
  const errorMsg = document.getElementById('search-error');
  const searchBtn = document.getElementById('search-btn');
  
  errorMsg.textContent = '';
  
  if (!input.includes('#')) {
    errorMsg.textContent = 'Please enter a valid Riot ID (e.g. Player#1234)';
    return;
  }
  
  const [name, tag] = input.split('#');
  if (!name || !tag) {
    errorMsg.textContent = 'Please enter a valid Riot ID (e.g. Player#1234)';
    return;
  }

  // Loading state
  const originalBtnHTML = searchBtn.innerHTML;
  searchBtn.innerHTML = '<div class="loader" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';
  searchBtn.disabled = true;

  try {
    // 1. Fetch Account
    const accountRes = await API.getAccount(name, tag);
    APP.account = accountRes.data;
    APP.region = region;
    APP.name = APP.account.name;
    APP.tag = APP.account.tag;

    // 2. Fetch MMR and Matches in parallel
    const [mmrRes, matchesRes] = await Promise.all([
      API.getMMR(region, name, tag).catch(() => ({ data: null })), // Handle unranked
      API.getMatches(region, name, tag, 10).catch(() => ({ data: [] }))
    ]);

    APP.mmr = mmrRes.data;
    APP.matches = matchesRes.data || [];

    // Setup navbar player info
    document.getElementById('nav-player').innerHTML = `
      <img src="${APP.account.card.small}" alt="Card">
      <span class="name">${APP.account.name}</span>
      <span class="tag">#${APP.account.tag}</span>
      <span class="level">${APP.account.account_level}</span>
    `;

    showDashboard();

  } catch (error) {
    console.error(error);
    errorMsg.textContent = error.message || 'Player not found or API error.';
  } finally {
    searchBtn.innerHTML = originalBtnHTML;
    searchBtn.disabled = false;
  }
}

function showSearchScreen() {
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('search-screen').classList.remove('hidden');
  document.getElementById('search-screen').classList.add('active');
  window.location.hash = '';
}

function showDashboard() {
  document.getElementById('search-screen').classList.remove('active');
  document.getElementById('search-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  
  const hash = window.location.hash.replace('#', '') || 'overview';
  switchTab(hash);
}

function switchTab(tabName) {
  // Update active class on nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-tab') === tabName) {
      link.classList.add('active');
    }
  });

  const contentDiv = document.getElementById('tab-content');
  contentDiv.innerHTML = '<div class="loader-container"><div class="loader"></div><div>Loading stats...</div></div>';

  // Render content based on tab
  setTimeout(() => {
    switch (tabName) {
      case 'overview': renderOverview(); break;
      case 'performance': renderPerformance(); break;
      case 'matches': renderMatchHistory(); break;
      case 'weapons': renderWeapons(); break;
      case 'compare': renderCompare(); break;
      default: renderOverview(); break;
    }
  }, 100);
}

// ----------------- RENDER FUNCTIONS -----------------

async function renderOverview() {
  const contentDiv = document.getElementById('tab-content');
  
  // Rank data
  const currentRankInfo = APP.mmr ? APP.mmr.current_data : null;
  const currentTier = currentRankInfo ? currentRankInfo.currenttier : 0;
  const currentRankName = currentRankInfo && currentRankInfo.currenttier_patched ? currentRankInfo.currenttier_patched : 'Unranked';
  const currentRR = currentRankInfo ? currentRankInfo.ranking_in_tier : 0;
  const currentRankImg = await API.getRankImage(currentTier);

  const peakRankInfo = APP.mmr ? APP.mmr.highest_rank : null;
  const peakTier = peakRankInfo ? peakRankInfo.tier : 0;
  const peakRankName = peakRankInfo && peakRankInfo.patched_tier ? peakRankInfo.patched_tier : 'Unranked';
  const peakSeason = peakRankInfo && peakRankInfo.season ? formatSeasonName(peakRankInfo.season) : '-';
  const peakRankImg = await API.getRankImage(peakTier);

  // Lifetime Stats
  let totalGames = 0;
  let totalWins = 0;
  if (APP.mmr && APP.mmr.by_season) {
    for (const key in APP.mmr.by_season) {
      const seasonData = APP.mmr.by_season[key];
      if (seasonData && !seasonData.error) {
        totalGames += seasonData.number_of_games || 0;
        totalWins += seasonData.wins || 0;
      }
    }
  }
  const lifetimeWinRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) + '%' : 'N/A';

  // Calculate recent stats (from last 10 matches)
  const recentStats = calculateStats(APP.matches, APP.account.puuid);

  let html = `
    <div class="player-header">
      <img src="${APP.account.card.large}" alt="Player Card" class="player-avatar">
      <div class="player-info">
        <h2>${APP.account.name} <span>#${APP.account.tag}</span></h2>
        <div class="lifetime-stats">Level ${APP.account.account_level} • ${totalGames} Lifetime Matches • ${lifetimeWinRate} Lifetime Win Rate</div>
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

    <h3 class="card-title" style="margin-top:40px; margin-bottom:16px;">Recent Stats (Last ${APP.matches.length} Matches)</h3>
    <div class="grid-4">
      <div class="card stat-card ${betterClass(recentStats.kd, 1.0)}">
        <div class="card-title">K/D Ratio</div>
        <div class="value">${recentStats.kd}</div>
      </div>
      <div class="card stat-card ${betterClass(parseFloat(recentStats.hs), 20)}">
        <div class="card-title">Headshot %</div>
        <div class="value">${recentStats.hs}%</div>
      </div>
      <div class="card stat-card ${betterClass(parseFloat(recentStats.winRate), 50)}">
        <div class="card-title">Win Rate</div>
        <div class="value">${recentStats.winRate}%</div>
      </div>
      <div class="card stat-card gold">
        <div class="card-title">ACS</div>
        <div class="value">${recentStats.acs}</div>
      </div>
      <div class="card stat-card blue">
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
        <div class="value">${APP.matches.length}</div>
      </div>
    </div>
  `;

  // Agents Table
  if (Object.keys(recentStats.agents).length > 0) {
    const sortedAgents = Object.values(recentStats.agents).sort((a, b) => b.matches - a.matches);
    
    html += `
      <h3 class="card-title" style="margin-top:40px; margin-bottom:16px;">Top Agents (Recent)</h3>
      <div class="card" style="padding:0; overflow:hidden;">
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Matches</th>
              <th>Win %</th>
              <th>K/D</th>
              <th>ACS</th>
              <th>Dmg/Rnd</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const agent of sortedAgents) {
      const agentIcon = await API.getAgentIcon(agent.name);
      const agentKd = (agent.kills / Math.max(1, agent.deaths)).toFixed(2);
      const agentWinRate = ((agent.wins / agent.matches) * 100).toFixed(1);
      const agentAcs = Math.round(agent.score / Math.max(1, agent.rounds));
      const agentDpr = Math.round(agent.damage / Math.max(1, agent.rounds));

      html += `
        <tr>
          <td><img src="${agentIcon}" class="agent-row-img" alt="${agent.name}">${agent.name}</td>
          <td>${agent.matches}</td>
          <td class="${betterClass(parseFloat(agentWinRate), 50, true)}">${agentWinRate}%</td>
          <td class="${betterClass(agentKd, 1.0, true)}">${agentKd}</td>
          <td>${agentAcs}</td>
          <td>${agentDpr}</td>
        </tr>
      `;
    }

    html += `</tbody></table></div>`;
  }

  contentDiv.innerHTML = html;
}

async function renderPerformance() {
  const contentDiv = document.getElementById('tab-content');
  
  if (!APP.mmr || !APP.mmr.by_season) {
    contentDiv.innerHTML = '<div class="empty-state">No performance data available.</div>';
    return;
  }

  // Parse seasons
  const seasons = [];
  for (const key in APP.mmr.by_season) {
    const s = APP.mmr.by_season[key];
    if (s && !s.error && s.number_of_games > 0) {
      // Parse e9a3 -> e:9, a:3
      const match = key.match(/e(\d+)a(\d+)/);
      const ep = match ? parseInt(match[1]) : 0;
      const act = match ? parseInt(match[2]) : 0;
      seasons.push({
        id: key,
        name: formatSeasonName(key),
        ep,
        act,
        wins: s.wins,
        games: s.number_of_games,
        winRate: ((s.wins / s.number_of_games) * 100).toFixed(1),
        rankId: s.final_rank,
        rankName: s.final_rank_patched
      });
    }
  }

  // Sort descending (newest first)
  seasons.sort((a, b) => {
    if (a.ep !== b.ep) return b.ep - a.ep;
    return b.act - a.act;
  });

  const chartDataReversed = [...seasons].reverse();

  let html = `
    <div class="card" style="margin-bottom: 32px;">
      <div class="card-title">Rank Progression (Win Rate %)</div>
      <div class="chart-container">
        <canvas id="progressionChart"></canvas>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow: hidden;">
      <div class="season-row-header" style="padding-left:24px; padding-right:24px;">
        <div>Season</div>
        <div>Final Rank</div>
        <div>Wins</div>
        <div>Matches</div>
        <div>Win Rate</div>
      </div>
      <div id="seasons-list"></div>
    </div>
  `;

  contentDiv.innerHTML = html;

  // Render rows
  const seasonsList = document.getElementById('seasons-list');
  for (const s of seasons) {
    const rankImg = await API.getRankImage(s.rankId);
    seasonsList.innerHTML += `
      <div class="season-row" style="padding-left:24px; padding-right:24px;">
        <div class="season-name">${s.name}</div>
        <div class="season-rank">
          <img src="${rankImg}" alt="${s.rankName}">
          <span>${s.rankName}</span>
        </div>
        <div class="text-green" style="font-weight:600;">${s.wins} W</div>
        <div>${s.games} Games</div>
        <div class="${betterClass(parseFloat(s.winRate), 50, true)}">${s.winRate}%</div>
      </div>
    `;
  }

  // Initialize Chart
  if (APP.chartInstance) {
    APP.chartInstance.destroy();
  }

  const ctx = document.getElementById('progressionChart').getContext('2d');
  APP.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartDataReversed.map(s => s.name),
      datasets: [{
        label: 'Win Rate (%)',
        data: chartDataReversed.map(s => parseFloat(s.winRate)),
        borderColor: '#17b35a',
        backgroundColor: 'rgba(23, 179, 90, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#17b35a',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#8b8fa3' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#8b8fa3' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#171923',
          titleColor: '#e8eaf0',
          bodyColor: '#e8eaf0',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        }
      }
    }
  });
}

async function renderMatchHistory() {
  const contentDiv = document.getElementById('tab-content');
  
  if (!APP.matches || APP.matches.length === 0) {
    contentDiv.innerHTML = '<div class="empty-state">No match history found.</div>';
    return;
  }

  let html = `<div class="matches-list">`;

  for (const match of APP.matches) {
    // Find our player
    let ourPlayer = null;
    let myTeam = null;

    if (match.players && match.players.all_players) {
      ourPlayer = match.players.all_players.find(p => p.puuid === APP.account.puuid);
    }

    if (!ourPlayer) continue;

    myTeam = ourPlayer.team.toLowerCase();
    
    let isWin = false;
    let isDraw = false;
    let scoreText = "";

    if (match.teams) {
      const myTeamData = match.teams[myTeam];
      const enemyTeamName = myTeam === 'red' ? 'blue' : 'red';
      const enemyTeamData = match.teams[enemyTeamName];

      if (myTeamData && enemyTeamData) {
        if (myTeamData.has_won) isWin = true;
        else if (myTeamData.rounds_won === enemyTeamData.rounds_won) isDraw = true;

        scoreText = `${myTeamData.rounds_won} - ${enemyTeamData.rounds_won}`;
      }
    }

    const resultClass = isDraw ? 'draw' : (isWin ? 'win' : 'loss');
    
    // Stats
    const stats = ourPlayer.stats;
    const kills = stats.kills;
    const deaths = stats.deaths;
    const assists = stats.assists;
    const kd = (kills / Math.max(1, deaths)).toFixed(2);
    const totalShots = stats.headshots + stats.bodyshots + stats.legshots;
    const hs = totalShots > 0 ? ((stats.headshots / totalShots) * 100).toFixed(1) : 0;
    const acs = Math.round(stats.score / match.metadata.rounds_played);

    // Assets
    const agentImg = ourPlayer.assets.agent.small;
    const date = new Date(match.metadata.game_start_patched).toLocaleDateString();

    html += `
      <div class="match-row">
        <div class="match-indicator ${resultClass}"></div>
        <div class="match-agent"><img src="${agentImg}" alt="Agent"></div>
        <div class="match-info">
          <span class="map">${match.metadata.map}</span>
          <span class="mode">${match.metadata.mode} • ${date}</span>
        </div>
        <div class="match-score ${resultClass}">${scoreText}</div>
        <div>
          <span class="match-stat-label">K / D / A</span>
          <span class="match-stat-value">${kills} / ${deaths} / ${assists}</span>
        </div>
        <div>
          <span class="match-stat-label">K/D</span>
          <span class="match-stat-value ${betterClass(kd, 1.0, true)}">${kd}</span>
        </div>
        <div>
          <span class="match-stat-label">ACS</span>
          <span class="match-stat-value">${acs}</span>
        </div>
        <div>
          <span class="match-stat-label">HS%</span>
          <span class="match-stat-value ${betterClass(parseFloat(hs), 20, true)}">${hs}%</span>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  contentDiv.innerHTML = html;
}

async function renderWeapons() {
  const contentDiv = document.getElementById('tab-content');
  
  if (!APP.matches || APP.matches.length === 0) {
    contentDiv.innerHTML = '<div class="empty-state">No weapon data available.</div>';
    return;
  }

  const weaponStats = {};
  let totalKills = 0;

  for (const match of APP.matches) {
    if (!match.kills) continue;
    
    for (const kill of match.kills) {
      if (kill.killer_puuid === APP.account.puuid) {
        const weaponName = kill.damage_weapon_name || "Unknown";
        if (weaponName === "Unknown") continue;

        if (!weaponStats[weaponName]) {
          weaponStats[weaponName] = { name: weaponName, kills: 0, icon: "" };
          // Try to get icon from kill event
          if (kill.damage_weapon_assets && kill.damage_weapon_assets.display_icon) {
            weaponStats[weaponName].icon = kill.damage_weapon_assets.display_icon;
          }
        }
        weaponStats[weaponName].kills++;
        totalKills++;
      }
    }
  }

  const sortedWeapons = Object.values(weaponStats).sort((a, b) => b.kills - a.kills);

  // Fallback to weapon api for icons if missing
  const apiWeapons = await API.getWeapons();
  for (const w of sortedWeapons) {
    if (!w.icon) {
      const found = apiWeapons.find(apiW => apiW.displayName.toLowerCase() === w.name.toLowerCase());
      if (found) w.icon = found.displayIcon;
    }
  }

  if (sortedWeapons.length === 0) {
    contentDiv.innerHTML = '<div class="empty-state">No weapon kill data found in recent matches.</div>';
    return;
  }

  let html = `
    <h3 class="card-title" style="margin-bottom:16px;">Weapon Usage (Based on ${APP.matches.length} recent matches • ${totalKills} total kills)</h3>
    <div class="card" style="padding:0; overflow:hidden;">
      <table>
        <thead>
          <tr>
            <th>Weapon</th>
            <th>Name</th>
            <th>Kills</th>
            <th>Kill %</th>
            <th>Usage</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const w of sortedWeapons) {
    const killPct = ((w.kills / totalKills) * 100).toFixed(1);
    html += `
      <tr>
        <td><img src="${w.icon}" alt="${w.name}" class="weapon-icon"></td>
        <td style="font-weight:600; font-size:1.1rem;">${w.name}</td>
        <td style="font-weight:600;">${w.kills}</td>
        <td>${killPct}%</td>
        <td style="width: 250px;">
          <div class="weapon-usage-bar">
            <div class="weapon-usage-fill" style="width: ${killPct}%"></div>
          </div>
        </td>
      </tr>
    `;
  }

  html += `</tbody></table></div>`;
  contentDiv.innerHTML = html;
}

function renderCompare() {
  const contentDiv = document.getElementById('tab-content');
  
  // Base HTML
  contentDiv.innerHTML = `
    <div class="compare-header">
      <div class="compare-search">
        <select id="p1-region">
          <option value="eu" ${APP.region==='eu'?'selected':''}>EU</option>
          <option value="na" ${APP.region==='na'?'selected':''}>NA</option>
          <option value="ap" ${APP.region==='ap'?'selected':''}>AP</option>
          <option value="kr" ${APP.region==='kr'?'selected':''}>KR</option>
          <option value="latam" ${APP.region==='latam'?'selected':''}>LATAM</option>
          <option value="br" ${APP.region==='br'?'selected':''}>BR</option>
        </select>
        <input type="text" id="p1-input" value="${APP.name}#${APP.tag}" placeholder="Player 1 (Name#Tag)" autocomplete="off">
        <button id="p1-btn">Load P1</button>
      </div>
      <div class="compare-search">
        <select id="p2-region">
          <option value="eu">EU</option>
          <option value="na">NA</option>
          <option value="ap">AP</option>
          <option value="kr">KR</option>
          <option value="latam">LATAM</option>
          <option value="br">BR</option>
        </select>
        <input type="text" id="p2-input" placeholder="Player 2 (Name#Tag)" autocomplete="off">
        <button id="p2-btn">Load P2</button>
      </div>
    </div>
    <div id="compare-error" class="error-msg" style="text-align:center; margin-bottom:24px;"></div>
    <div class="compare-grid">
      <div class="card compare-card" id="p1-container">
        <div class="empty-state">Load a player to compare.</div>
      </div>
      <div class="card compare-card" id="p2-container">
        <div class="empty-state">Load a player to compare.</div>
      </div>
    </div>
  `;

  // State
  let p1Data = null;
  let p2Data = null;

  async function loadPlayer(isP1) {
    const prefix = isP1 ? 'p1' : 'p2';
    const region = document.getElementById(`${prefix}-region`).value;
    const input = document.getElementById(`${prefix}-input`).value.trim();
    const btn = document.getElementById(`${prefix}-btn`);
    const errorMsg = document.getElementById('compare-error');
    
    errorMsg.textContent = '';
    
    if (!input.includes('#')) {
      errorMsg.textContent = 'Please enter a valid Riot ID (e.g. Player#1234)';
      return;
    }
    
    const [name, tag] = input.split('#');
    
    btn.innerHTML = '...';
    btn.disabled = true;

    try {
      const [accRes, mmrRes, matchRes] = await Promise.all([
        API.getAccount(name, tag),
        API.getMMR(region, name, tag).catch(()=>({data:null})),
        API.getMatches(region, name, tag, 5).catch(()=>({data:[]}))
      ]);

      const data = {
        account: accRes.data,
        mmr: mmrRes.data,
        matches: matchRes.data || [],
        stats: calculateStats(matchRes.data || [], accRes.data.puuid)
      };

      if (isP1) p1Data = data;
      else p2Data = data;

      updateCompareUI();
    } catch (err) {
      errorMsg.textContent = err.message || 'Player not found.';
    } finally {
      btn.innerHTML = `Load P${isP1 ? '1' : '2'}`;
      btn.disabled = false;
    }
  }

  document.getElementById('p1-btn').addEventListener('click', () => loadPlayer(true));
  document.getElementById('p2-btn').addEventListener('click', () => loadPlayer(false));

  document.getElementById('p1-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadPlayer(true);
  });
  document.getElementById('p2-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadPlayer(false);
  });

  async function updateCompareUI() {
    if (p1Data) await renderCompareCard('p1-container', p1Data, p2Data);
    if (p2Data) await renderCompareCard('p2-container', p2Data, p1Data);
  }

  // Preload P1
  loadPlayer(true);
}

async function renderCompareCard(containerId, data, otherData) {
  const container = document.getElementById(containerId);
  if (!data) return;

  const currentTier = data.mmr && data.mmr.current_data ? data.mmr.current_data.currenttier : 0;
  const currentRankName = data.mmr && data.mmr.current_data ? data.mmr.current_data.currenttier_patched : 'Unranked';
  const rankImg = await API.getRankImage(currentTier);

  // Compare helpers
  const getBetterClass = (val1, val2, invert = false) => {
    if (!otherData) return '';
    const v1 = parseFloat(val1);
    const v2 = parseFloat(val2);
    if (isNaN(v1) || isNaN(v2)) return '';
    if (v1 === v2) return '';
    if (invert) return v1 < v2 ? 'better' : '';
    return v1 > v2 ? 'better' : '';
  };

  const oStats = otherData ? otherData.stats : null;

  let html = `
    <div class="compare-player-header">
      <img src="${data.account.card.small}" alt="Card">
      <div>
        <div class="name">${data.account.name} <span class="tag">#${data.account.tag}</span></div>
        <div class="text-secondary" style="display:flex; align-items:center; gap:8px; margin-top:4px;">
          <img src="${rankImg}" style="width:20px;height:20px;border-radius:0;">
          ${currentRankName}
        </div>
      </div>
    </div>
    
    <div class="compare-stat-row">
      <span class="compare-stat-label">K/D Ratio</span>
      <span class="compare-stat-value ${oStats ? getBetterClass(data.stats.kd, oStats.kd) : ''}">${data.stats.kd}</span>
    </div>
    <div class="compare-stat-row">
      <span class="compare-stat-label">Headshot %</span>
      <span class="compare-stat-value ${oStats ? getBetterClass(data.stats.hs, oStats.hs) : ''}">${data.stats.hs}%</span>
    </div>
    <div class="compare-stat-row">
      <span class="compare-stat-label">Win Rate</span>
      <span class="compare-stat-value ${oStats ? getBetterClass(data.stats.winRate, oStats.winRate) : ''}">${data.stats.winRate}%</span>
    </div>
    <div class="compare-stat-row">
      <span class="compare-stat-label">ACS</span>
      <span class="compare-stat-value ${oStats ? getBetterClass(data.stats.acs, oStats.acs) : ''}">${data.stats.acs}</span>
    </div>
    <div class="compare-stat-row">
      <span class="compare-stat-label">Damage / Round</span>
      <span class="compare-stat-value ${oStats ? getBetterClass(data.stats.dmgPerRound, oStats.dmgPerRound) : ''}">${data.stats.dmgPerRound}</span>
    </div>
    
    <div style="padding: 16px 24px; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid var(--border-color);">
      Recent Matches
    </div>
  `;

  for (const match of data.matches) {
    let ourPlayer = null;
    if (match.players && match.players.all_players) {
      ourPlayer = match.players.all_players.find(p => p.puuid === data.account.puuid);
    }
    if (!ourPlayer) continue;

    const myTeam = ourPlayer.team.toLowerCase();
    let isWin = false;
    let isDraw = false;
    let scoreText = "";

    if (match.teams) {
      const myTeamData = match.teams[myTeam];
      const enemyTeamName = myTeam === 'red' ? 'blue' : 'red';
      const enemyTeamData = match.teams[enemyTeamName];

      if (myTeamData && enemyTeamData) {
        if (myTeamData.has_won) isWin = true;
        else if (myTeamData.rounds_won === enemyTeamData.rounds_won) isDraw = true;
        scoreText = `${myTeamData.rounds_won} - ${enemyTeamData.rounds_won}`;
      }
    }

    const resultClass = isDraw ? 'draw' : (isWin ? 'win' : 'loss');
    
    html += `
      <div class="compare-mini-match">
        <div class="compare-mini-indicator ${resultClass}"></div>
        <div class="compare-mini-map">${match.metadata.map}</div>
        <div class="compare-mini-score ${resultClass}">${scoreText}</div>
        <div class="compare-mini-kda">${ourPlayer.stats.kills}/${ourPlayer.stats.deaths}/${ourPlayer.stats.assists}</div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// ----------------- HELPERS -----------------

function calculateStats(matches, puuid) {
  let kills = 0, deaths = 0, assists = 0, score = 0, damage = 0, rounds = 0;
  let headshots = 0, bodyshots = 0, legshots = 0;
  let wins = 0, totalMatches = 0;

  const agents = {};

  for (const match of matches) {
    let ourPlayer = null;
    if (match.players && match.players.all_players) {
      ourPlayer = match.players.all_players.find(p => p.puuid === puuid);
    }
    if (!ourPlayer) continue;

    totalMatches++;
    
    const stats = ourPlayer.stats;
    kills += stats.kills;
    deaths += stats.deaths;
    assists += stats.assists;
    score += stats.score;
    damage += ourPlayer.damage_made || 0;
    headshots += stats.headshots;
    bodyshots += stats.bodyshots;
    legshots += stats.legshots;
    rounds += match.metadata.rounds_played;

    const myTeam = ourPlayer.team.toLowerCase();
    if (match.teams && match.teams[myTeam] && match.teams[myTeam].has_won) {
      wins++;
    }

    // Agent breakdown
    const agentName = ourPlayer.character;
    if (!agents[agentName]) {
      agents[agentName] = { name: agentName, kills: 0, deaths: 0, score: 0, damage: 0, rounds: 0, matches: 0, wins: 0 };
    }
    agents[agentName].kills += stats.kills;
    agents[agentName].deaths += stats.deaths;
    agents[agentName].score += stats.score;
    agents[agentName].damage += ourPlayer.damage_made || 0;
    agents[agentName].rounds += match.metadata.rounds_played;
    agents[agentName].matches++;
    if (match.teams && match.teams[myTeam] && match.teams[myTeam].has_won) {
      agents[agentName].wins++;
    }
  }

  const totalShots = headshots + bodyshots + legshots;
  
  return {
    kd: deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2),
    hs: totalShots > 0 ? ((headshots / totalShots) * 100).toFixed(1) : "0.0",
    winRate: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : "0.0",
    acs: rounds > 0 ? Math.round(score / rounds) : 0,
    dmgPerRound: rounds > 0 ? Math.round(damage / rounds) : 0,
    killsPerRound: rounds > 0 ? (kills / rounds).toFixed(2) : "0.00",
    totalKills: kills,
    agents
  };
}

function betterClass(value, threshold, returnTextClass = false) {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  if (num >= threshold) return returnTextClass ? 'text-green' : 'green';
  return returnTextClass ? 'text-red' : 'red';
}

function formatSeasonName(seasonId) {
  // e9a3 -> Episode 9: Act 3
  const match = seasonId.match(/e(\d+)a(\d+)/);
  if (match) {
    return `Episode ${match[1]}: Act ${match[2]}`;
  }
  return seasonId.toUpperCase();
}
