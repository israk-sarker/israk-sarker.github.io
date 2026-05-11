import { state, formatSeasonName } from './main.js';
import { APIPerformance } from './api_performance.js';

export async function renderPerformance() {
  const contentDiv = document.querySelector('#tab-content');

  if (!state.mmr || !state.mmr.by_season) {
    contentDiv.innerHTML = '<div class="empty-state">No performance data available.</div>';
    return;
  }

  //parsing episodi
  const seasons = [];
  for (const key in state.mmr.by_season) {
    const s = state.mmr.by_season[key];
    if (s && !s.error && s.number_of_games > 0) {
      //e9a3 -> e:9, a:3
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

  //sorting
  seasons.sort((a, b) => {
    if (a.ep !== b.ep) return b.ep - a.ep;
    return b.act - a.act;
  });
  const chartData = [...seasons].reverse();

  let html = `
    <div class="card card-mb">
      <div class="card-title">Rank Progression</div>
      <div class="chart-container">
        <canvas id="progressionChart"></canvas>
      </div>
    </div>

    <div class="card card-no-padding">
      <div class="season-row-header season-row-padded">
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

  const seasonsList = document.querySelector('#seasons-list');
  for (const s of seasons) {
    const rankImg = await APIPerformance.getRankImage(s.rankId);
    seasonsList.innerHTML += `
      <div class="season-row season-row-padded">
        <div class="season-name">${s.name}</div>
        <div class="season-rank">
          <img src="${rankImg}" alt="${s.rankName}">
          <span class="season-rank-name">${s.rankName}</span>
        </div>
        <div class="season-wins">${s.wins} W</div>
        <div class="season-games">${s.games} Games</div>
        <div class="season-winrate">${s.winRate}%</div>
      </div>
    `;
  }

  //chart
  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  const ctx = document.querySelector('#progressionChart').getContext('2d');

  const rankNames = chartData.map(s => s.rankName);
  const rankIds = chartData.map(s => s.rankId || 0);

  state.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.map(s => s.name),
      datasets: [{
        label: 'Rank Tier',
        data: rankIds,
        borderColor: '#8b8fa3',
        backgroundColor: 'rgba(139, 143, 163, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#8b8fa3',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#8b8fa3',
            stepSize: 3,
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#8b8fa3' }
        }
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          backgroundColor: '#171923',
          titleColor: '#e8eaf0',
          bodyColor: '#e8eaf0',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
        }
      }
    }
  });
}
