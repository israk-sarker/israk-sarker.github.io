// ============================================
// Weapons.jsx — Best weapons stats
// ============================================
// Shows which weapons the player uses most.
// We extract weapon data from kill events in each match.

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMatches, getWeapons } from "../api";

function Weapons() {
  const { region, name, tag } = useParams();
  const decodedName = decodeURIComponent(name);
  const decodedTag = decodeURIComponent(tag);

  const [weaponStats, setWeaponStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWeapons() {
      setLoading(true);
      try {
        const [matchesRes, weaponsData] = await Promise.all([
          getMatches(region, decodedName, decodedTag, 10),
          getWeapons(),
        ]);

        if (!matchesRes.data) {
          setError("Could not load match data.");
          setLoading(false);
          return;
        }

        // Count kills per weapon from match kill events
        const weaponMap = {};

        matchesRes.data.forEach((match) => {
          if (!match.kills) return;
          match.kills.forEach((kill) => {
            // Only count OUR kills
            const killerName = kill.killer_display_name || "";
            if (!killerName.toLowerCase().includes(decodedName.toLowerCase())) return;

            const wName = kill.damage_weapon_name || "Unknown";
            if (!weaponMap[wName]) {
              weaponMap[wName] = {
                name: wName,
                kills: 0,
                icon: kill.damage_weapon_assets ? kill.damage_weapon_assets.display_icon : null,
              };
            }
            weaponMap[wName].kills++;
          });
        });

        // Try to get icons from valorant-api.com if missing
        Object.values(weaponMap).forEach((w) => {
          if (!w.icon) {
            const found = weaponsData.find(
              (wd) => wd.displayName.toLowerCase() === w.name.toLowerCase()
            );
            if (found) w.icon = found.displayIcon;
          }
        });

        // Sort by most kills
        const sorted = Object.values(weaponMap).sort((a, b) => b.kills - a.kills);
        setWeaponStats(sorted);
      } catch (err) {
        console.error(err);
        setError("Something went wrong.");
      }
      setLoading(false);
    }
    loadWeapons();
  }, [region, decodedName, decodedTag]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading weapon stats...</p>
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

  const totalKills = weaponStats.reduce((sum, w) => sum + w.kills, 0);

  return (
    <div className="page-content">
      <h2 className="section-title">Weapon Stats</h2>
      <p className="text-muted" style={{ marginBottom: "20px" }}>
        Based on recent competitive matches · {totalKills} total kills
      </p>

      {weaponStats.length === 0 ? (
        <div className="empty-state">
          <p className="text-muted" style={{ padding: "20px 0" }}>No weapon data available from recent matches.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Weapon</th>
              <th>Kills</th>
              <th>Kill %</th>
              <th>Usage</th>
            </tr>
          </thead>
          <tbody>
            {weaponStats.map((weapon) => (
              <tr key={weapon.name}>
                <td>
                  <div className="weapon-cell">
                    {weapon.icon && <img src={weapon.icon} alt={weapon.name} />}
                    <span>{weapon.name}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>{weapon.kills}</td>
                <td>
                  {totalKills > 0 ? ((weapon.kills / totalKills) * 100).toFixed(1) : 0}%
                </td>
                <td>
                  <div style={{
                    background: "var(--bg-input)", borderRadius: "4px",
                    height: "8px", width: "120px", overflow: "hidden",
                  }}>
                    <div style={{
                      background: "var(--red)", height: "100%", borderRadius: "4px",
                      width: totalKills > 0 ? `${(weapon.kills / totalKills) * 100}%` : "0%",
                    }}></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Weapons;
