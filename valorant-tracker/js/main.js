import { APIOverview } from './api_overview.js';
import { renderOverview } from './overview.js';
import { renderPerformance } from './performance.js';

// --- STATE ---
export const state = {
  account: null,
  mmr: null,
  matches: [],
  region: 'eu',
  name: '',
  tag: '',
  chartInstance: null
};

//statistiche ultime 10 partite
export function calculateStats(matches, puuid) {
  let kills = 0, deaths = 0, assists = 0, score = 0, damage = 0, rounds = 0;
  let headshots = 0, bodyshots = 0, legshots = 0;
  let wins = 0, totalMatches = 0;

  for (const match of matches) {
    let ourPlayer = null;
    if (match.players && match.players.all_players) { // se match contiene players e all_players
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
  }

  const totalShots = headshots + bodyshots + legshots;

  return {
    kd: deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2),
    hs: totalShots > 0 ? ((headshots / totalShots) * 100).toFixed(1) : "0.0",
    winRate: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : "0.0",
    acs: rounds > 0 ? Math.round(score / rounds) : 0,
    dmgPerRound: rounds > 0 ? Math.round(damage / rounds) : 0,
    killsPerRound: rounds > 0 ? (kills / rounds).toFixed(2) : "0.00",
    totalKills: kills
  };
}

export function calculateBestMatch(matches, puuid) {
  let bestMatch = null;
  let maxKills = -1;

  for (const match of matches) {
    let ourPlayer = null;
    if (match.players && match.players.all_players) {
      ourPlayer = match.players.all_players.find(p => p.puuid === puuid);
    }
    if (!ourPlayer) continue;

    if (ourPlayer.stats.kills > maxKills) {
      maxKills = ourPlayer.stats.kills;
      bestMatch = { match, player: ourPlayer };
    }
  }
  return bestMatch;
}

export function formatSeasonName(seasonId) {
  const match = seasonId.match(/e(\d+)a(\d+)/);
  if (match) {
    return `Episode ${match[1]}: Act ${match[2]}`;
  }
  return seasonId.toUpperCase();
}

export function switchTab(tabName) {
  document.querySelectorAll('.nav-link').forEach(link => { //rimuove active da tutte le nav-link
    link.classList.remove('active');
    if (link.getAttribute('data-tab') === tabName) {
      link.classList.add('active');
    }
  });

  const contentDiv = document.querySelector('#tab-content');
  contentDiv.innerHTML = '<div class="loader-container"><div class="loader"></div><div>Loading stats...</div></div>';

  setTimeout(() => {
    switch (tabName) {
      case 'overview': renderOverview(); break;
      case 'performance': renderPerformance(); break;
      default: renderOverview(); break;
    }
  }, 100);
}

//INIT
document.addEventListener("DOMContentLoaded", init);

function init() {
  document.querySelector('#search-btn').addEventListener('click', handleSearch);
  document.querySelector('#search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (!state.account) return; //non fa il cambio tab se non c'è un account
      const tab = e.target.getAttribute('data-tab');
      switchTab(tab);
      history.replaceState(null, null, `#${tab}`);
    });
  });

  window.addEventListener("hashchange", () => {
    if (state.account) {
      const hash = window.location.hash.replace('#', '') || 'overview';
      switchTab(hash);
    }
  });
}

async function handleSearch() {
  const region = document.querySelector('#search-region').value;
  const input = document.querySelector('#search-input').value.trim();
  const errorMsg = document.querySelector('#search-error');
  const searchBtn = document.querySelector('#search-btn');

  errorMsg.textContent = '';

  if (!input.includes('#')) {
    errorMsg.textContent = 'Please enter a valid Riot ID (ex: Player#1234)';
    return;
  }

  const [name, tag] = input.split('#');
  if (!name || !tag) {
    errorMsg.textContent = 'Please enter a valid Riot ID (ex: Player#1234)';
    return;
  }


  try {
    const accountRes = await APIOverview.getAccount(name, tag);
    state.account = accountRes.data;
    state.region = region;
    state.name = state.account.name;
    state.tag = state.account.tag;

    const [mmrRes, matchesRes] = await Promise.all([
      APIOverview.getMMR(region, name, tag).catch(() => ({ data: null })),
      APIOverview.getMatches(region, name, tag, 10).catch(() => ({ data: [] }))
    ]);

    state.mmr = mmrRes.data;
    state.matches = matchesRes.data || [];

    document.querySelector('#nav-player').innerHTML = `
      <img src="${state.account.card.small}" alt="Card" class="nav-player-card-img">
      <span class="name">${state.account.name}</span>
      <span class="tag">#${state.account.tag}</span>
      <span class="level nav-player-level">${state.account.account_level}</span>`;

    const hash = window.location.hash.replace('#', '') || 'overview';
    switchTab(hash);

  } catch (error) {
    console.error(error);
    errorMsg.textContent = error.message || 'Player not found or API error.';
  } finally {
    searchBtn.disabled = false;
  }
}
