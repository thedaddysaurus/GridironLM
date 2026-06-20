import React, { useState, useEffect } from "react";
import { LeagueDetails, RichRoster, SleeperUser } from "../types";
import { Trophy, Compass, TrendingUp, Users, Flame, Award, ChevronRight, History, Calendar } from "lucide-react";
import { motion } from "motion/react";

interface LeaguesOverviewProps {
  leagues: LeagueDetails[];
  user: SleeperUser | null;
  username: string;
  onSelectLeague: (leagueId: string) => void;
}

interface LifetimeRollup {
  lifetimeWins: number;
  lifetimeLosses: number;
  lifetimeTies: number;
  lifetimePoints: number;
  totalSeasons: number;
  seasons: {
    leagueId: string;
    name: string;
    season: string;
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
  }[];
}

export default function LeaguesOverview({ leagues, user, username, onSelectLeague }: LeaguesOverviewProps) {
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeRollup | null>(null);
  const [loadingLifetime, setLoadingLifetime] = useState(false);

  // 1. Calculate Local Current-Season Fallback Aggregate Statistics
  let totalWins = 0;
  let totalLosses = 0;
  let totalTies = 0;
  let aggregatePoints = 0;
  const playerCounts: Record<string, { name: string; pos: string; count: number; team: string | null }> = {};

  leagues.forEach((l) => {
    if (l.userRoster) {
      const parent = l.userRoster;
      totalWins += parent.settings.wins || 0;
      totalLosses += parent.settings.losses || 0;
      totalTies += parent.settings.ties || 0;
      
      const pts = (parent.settings.fpts || 0) + (parent.settings.fpts_decimal || 0) * 0.01;
      aggregatePoints += pts;

      // Track player ownership duplicates across all leagues
      parent.players.forEach((p) => {
        if (!playerCounts[p.id]) {
          playerCounts[p.id] = { name: p.full_name, pos: p.position, team: p.team, count: 0 };
        }
        playerCounts[p.id].count += 1;
      });
    }
  });

  useEffect(() => {
    if (!user) return;
    async function fetchLifetime() {
      setLoadingLifetime(true);
      try {
        const res = await fetch(`/api/sleeper/user/${user.user_id}/lifetime-rollup`);
        if (res.ok) {
          const data = await res.json();
          console.log("FRONTEND: LIFETIME ROLLUP RECEIVED:", data);
          setLifetimeStats(data);
        } else {
          console.error("FRONTEND: LIFETIME API ERROR STATUS:", res.status);
        }
      } catch (err) {
        console.error("Failed loading lifetime rollup stats:", err);
      } finally {
        setLoadingLifetime(false);
      }
    }
    fetchLifetime();
  }, [user]);

  const activeWins = lifetimeStats ? lifetimeStats.lifetimeWins : totalWins;
  const activeLosses = lifetimeStats ? lifetimeStats.lifetimeLosses : totalLosses;
  const activeTies = lifetimeStats ? lifetimeStats.lifetimeTies : totalTies;
  const activePoints = lifetimeStats ? lifetimeStats.lifetimePoints : aggregatePoints;

  const totalGames = activeWins + activeLosses + activeTies;
  const winRate = totalGames > 0 ? (activeWins / totalGames) * 100 : 0;

  // Sorting owned players to show "dynasty anchors" (owned in multiple leagues)
  const dynastyAnchors = Object.values(playerCounts)
    .filter((p) => p.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-8" id="leagues-overview-container">
      {/* 2. Bento Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="bento-matrix">
        
        {/* Record & Win Rate */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-xl shadow-black/10"
          id="stat-record"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-all text-purple-400">
            <Trophy size={100} />
          </div>
          <p className="text-xs font-mono font-medium tracking-widest text-white/40 uppercase flex items-center gap-1">
            {lifetimeStats ? "Lifetime Total Record" : "Dynasty Record"}
            {loadingLifetime && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping inline-block"></span>}
          </p>
          <h3 className="text-4xl font-mono font-bold text-white tracking-tight mt-2">
            {activeWins}-{activeLosses}-{activeTies}
          </h3>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs font-semibold px-2  py-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/15">
              {winRate.toFixed(1)}% Win Rate
            </span>
            <span className="text-[10px] text-white/35 font-mono uppercase">
              {lifetimeStats ? "Across All Seasons" : "Current Season"}
            </span>
          </div>
        </motion.div>

        {/* Aggregate Points Scored */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-xl shadow-black/10"
          id="stat-points"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-all text-blue-400">
            <Flame size={100} />
          </div>
          <p className="text-xs font-mono font-medium tracking-widest text-white/40 uppercase flex items-center gap-1">
            {lifetimeStats ? "Lifetime Cumulative Points" : "Cumulative Scoring"}
            {loadingLifetime && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block"></span>}
          </p>
          <h3 className="text-4xl font-mono font-bold text-white tracking-tight mt-2">
            {activePoints.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-2xs text-white/40 mt-4 font-sans">
            {lifetimeStats ? "Lifetime consolidated stats ledger" : "Fantasy Points across all roster settings"}
          </p>
        </motion.div>

        {/* Combined League Count */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-xl shadow-black/10"
          id="stat-leagues"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-all text-emerald-400">
            <Users size={100} />
          </div>
          <p className="text-xs font-mono font-medium tracking-widest text-white/40 uppercase">Total Seasons</p>
          <h3 className="text-4xl font-sans font-bold text-white tracking-tight mt-2">
            {lifetimeStats ? lifetimeStats.totalSeasons : leagues.length}
          </h3>
          <p className="text-xs text-emerald-400 font-sans mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {lifetimeStats ? "Multi-season history synced" : "Live Sleeper sync active"}
          </p>
        </motion.div>

        {/* Power Anchor */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-xl shadow-black/10"
          id="stat-anchors"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-all text-pink-400">
            <Award size={100} />
          </div>
          <p className="text-xs font-mono font-medium tracking-widest text-white/40 uppercase">Dynasty Anchor</p>
          {dynastyAnchors.length > 0 ? (
            <div className="mt-2.5">
              <h4 className="text-lg font-sans font-bold text-slate-200 tracking-tight truncate">
                {dynastyAnchors[0].name}
              </h4>
              <p className="text-xs text-white/40 font-sans mt-0.5">
                {dynastyAnchors[0].pos} - {dynastyAnchors[0].team || "FA"}
              </p>
              <span className="inline-block mt-3.5 text-xs px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 font-mono">
                Owned in {dynastyAnchors[0].count} Leagues
              </span>
            </div>
          ) : (
            <div className="mt-2.5">
              <h4 className="text-sm font-sans font-semibold text-slate-400">Diversified Rosters</h4>
              <p className="text-xs text-slate-500 mt-2">No player owned across multiple teams.</p>
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 3. Leagues detailed list */}
        <div className="lg:col-span-2 space-y-4" id="leagues-grid-list">
          <h2 className="text-lg font-sans font-semibold text-white/80 flex items-center gap-2">
            <Compass className="text-purple-400" size={18} />
            My Dynasty Franchises
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {leagues.map((leg, index) => {
              const roster = leg.userRoster;
              if (!roster) return null;

              // Extract owner's standings place (rank)
              const rankIndex = leg.standings.findIndex((s) => s.owner_id === roster.owner_id);
              const rankText = rankIndex !== -1 ? `#${rankIndex + 1}` : "N/A";

              const pct = (roster.settings.wins / ((roster.settings.wins + roster.settings.losses + roster.settings.ties) || 1) * 100);

              return (
                <motion.div
                  key={leg.leagueId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  onClick={() => onSelectLeague(leg.leagueId)}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 rounded-xl p-5 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group transition-all duration-300 shadow-lg shadow-black/10"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-md font-sans font-semibold text-slate-100 group-hover:text-purple-300 transition-colors">
                        {leg.name}
                      </h3>
                      <span className="text-2xs font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50 uppercase">
                        Season {leg.season}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-sans text-slate-400">
                      <p className="flex items-center gap-1">
                        Team: <span className="font-medium text-slate-300">{roster.ownerDetails.team_name}</span>
                      </p>
                      <span className="text-white/10">•</span>
                      <p>
                        Record: <span className="font-mono text-slate-300">{roster.settings.wins}-{roster.settings.losses}-{roster.settings.ties}</span>
                      </p>
                      <span className="text-white/10">•</span>
                      <p>
                        Rank: <span className="font-mono text-purple-300 font-semibold">{rankText}</span> / {leg.totalRosters}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t border-white/10 md:border-t-0 pt-4 md:pt-0">
                    <div className="text-left md:text-right">
                      <p className="text-2xs font-mono uppercase tracking-wider text-white/40">Points Scored</p>
                      <p className="text-sm font-mono font-medium text-purple-300 mt-0.5">
                        {((roster.settings.fpts || 0) + (roster.settings.fpts_decimal || 0) * 0.01).toFixed(2)}
                      </p>
                    </div>

                    <div className="text-xs bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 flex items-center gap-1 group-hover:bg-white/15 transition-all text-white/85">
                      View Hub
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 4. Column: Key Dynasty Keystone Players */}
        <div className="space-y-4">
          <h2 className="text-lg font-sans font-semibold text-white/80 flex items-center gap-2">
            <TrendingUp className="text-purple-400" size={18} />
            Ownership Anchors
          </h2>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl shadow-black/10">
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              These are the core NFL players that {username} has anchored their dynasty franchises with, owned in multiple leagues:
            </p>

            {dynastyAnchors.length > 0 ? (
              <div className="space-y-3 pt-2">
                {dynastyAnchors.map((anchor, i) => {
                  // Standard Position Colors
                  let posColor = "bg-white/5 text-white/40 border border-white/5";
                  if (anchor.pos === "QB") posColor = "bg-rose-500/15 text-rose-400 border border-rose-500/20";
                  else if (anchor.pos === "RB") posColor = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
                  else if (anchor.pos === "WR") posColor = "bg-blue-500/15 text-blue-400 border border-blue-500/20";
                  else if (anchor.pos === "TE") posColor = "bg-amber-500/15 text-amber-400 border border-amber-500/20";

                  return (
                    <div key={i} className="flex justify-between items-center bg-white/2 border border-white/5 rounded-xl p-3 hover:bg-white/5 transition-all duration-200">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{anchor.name}</p>
                        <p className="text-2xs text-white/40 mt-0.5">{anchor.team || "Free Agent"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded ${posColor}`}>
                          {anchor.pos}
                        </span>
                        <span className="text-xs font-mono font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/20 px-2 py-0.5 rounded">
                          x{anchor.count} Leagues
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs font-sans text-slate-500">No duplicates found across teams.</p>
                <p className="text-2xs font-sans text-slate-600 mt-1">This user has diversified rosters.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Developer Diagnostics Disclosure Panel */}
      <div className="mt-12 border-t border-white/5 pt-8">
        <details className="group bg-slate-900/45 border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-400">
          <summary className="cursor-pointer select-none font-sans font-semibold text-slate-300 hover:text-white flex items-center gap-2">
            <History size={14} className="text-purple-400 group-open:rotate-90 transition-transform" />
            Sleeper API & Sync Engine Diagnostics
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/10 ml-auto">
              Inspect Raw JSON Payload
            </span>
          </summary>
          <div className="mt-4 space-y-4 font-mono text-2xs leading-relaxed max-w-full overflow-x-auto">
            <div>
              <p className="text-slate-200 font-semibold mb-1">Lifetime Rollup Sync State:</p>
              <pre className="p-3 bg-black/40 rounded-lg text-emerald-400 border border-white/5 overflow-x-auto max-h-60 scrollbar-thin">
                {JSON.stringify(lifetimeStats, null, 2)}
              </pre>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-300">Client User ID:</span> <span className="text-purple-300 font-bold">{user?.user_id || "None"}</span>
              </div>
              <div>
                <span className="text-slate-300">Client Username:</span> <span className="text-purple-300 font-bold">{username}</span>
              </div>
              <div>
                <span className="text-slate-300">Server Sync Core:</span> <span className="text-emerald-400 font-bold">Live Link Connected</span>
              </div>
            </div>
          </div>
        </details>
      </div>

    </div>
  );
}
