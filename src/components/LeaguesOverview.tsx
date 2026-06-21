import React, { useState, useEffect } from "react";
import { LeagueDetails, RichRoster, SleeperUser } from "../types";
import { Trophy, Compass, TrendingUp, Users, Flame, Award, ChevronRight, History, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "motion/react";
import { getOwnerTheme } from "../utils/theme";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from "recharts";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#121614] border border-[#ba8659]/30 rounded-xl p-3 shadow-xl backdrop-blur-md">
        <p className="text-2xs font-mono font-bold text-[#cca57d] uppercase tracking-wider mb-1">{data.season} Season</p>
        <p className="text-xs font-sans font-bold text-white leading-snug">{data.fullName}</p>
        <div className="mt-2 text-3xs font-mono space-y-1 text-slate-300">
          <p className="flex justify-between gap-6">
            <span>Points For:</span>
            <span className="font-semibold text-emerald-400">{data.points.toLocaleString()} fpts</span>
          </p>
          <p className="flex justify-between gap-6">
            <span>Record:</span>
            <span className="font-semibold text-purple-300">{data.wins}W - {data.losses}L</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

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
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [expandedTrades, setExpandedTrades] = useState<Record<string, boolean>>({});
  const [chartType, setChartType] = useState<"bar" | "radar">("bar");

  const toggleTrade = (id: string) => {
    setExpandedTrades(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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

    async function fetchRecentTrades() {
      setLoadingTrades(true);
      try {
        const res = await fetch(`/api/sleeper/user/${user.user_id}/recent-trades`);
        if (res.ok) {
          const data = await res.json();
          console.log("FRONTEND: RECENT TRADES RECEIVED:", data.trades);
          setRecentTrades(data.trades || []);
        } else {
          console.error("FRONTEND: RECENT TRADES API ERROR STATUS:", res.status);
        }
      } catch (err) {
        console.error("Failed loading combined recent trades:", err);
      } finally {
        setLoadingTrades(false);
      }
    }

    fetchLifetime();
    fetchRecentTrades();
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

  // Compute global average age across all rosters for Dynasty insight
  let totalAgeSum = 0;
  let totalPlayersWithAge = 0;
  leagues.forEach((l) => {
    if (l.userRoster) {
      l.userRoster.players.forEach((p) => {
        if (typeof p.age === "number" && p.age > 0) {
          totalAgeSum += p.age;
          totalPlayersWithAge++;
        }
      });
    }
  });
  const avgSquadAge = totalPlayersWithAge > 0 ? (totalAgeSum / totalPlayersWithAge) : 0;

  // Compute 2026 Season Combined Record (for all 2026 leagues)
  let wins2026 = 0;
  let losses2026 = 0;
  let ties2026 = 0;
  let count2026Leagues = 0;

  if (lifetimeStats && lifetimeStats.seasons && lifetimeStats.seasons.length > 0) {
    lifetimeStats.seasons.forEach((s) => {
      if (s.season === "2026") {
        wins2026 += s.wins || 0;
        losses2026 += s.losses || 0;
        ties2026 += s.ties || 0;
        count2026Leagues++;
      }
    });
  } else {
    leagues.forEach((l) => {
      if (l.season === "2026" && l.userRoster) {
        wins2026 += l.userRoster.settings.wins || 0;
        losses2026 += l.userRoster.settings.losses || 0;
        ties2026 += l.userRoster.settings.ties || 0;
        count2026Leagues++;
      }
    });
  }

  // Compare current active dynasty leagues. If they have 0 points (e.g. 2026 preseason),
  // fallback to their most recent completed season's points (e.g. 2025) from lifetimeStats to ensure data is displayed.
  const chartData = leagues
    .map((leg) => {
      const roster = leg.userRoster;
      if (!roster) return null;

      let pointsFor = (roster.settings.fpts || 0) + (roster.settings.fpts_decimal || 0) * 0.01;
      let displaySeason = leg.season;

      if (pointsFor === 0 && lifetimeStats && lifetimeStats.seasons) {
        // Look up previous year's points for the same league (cleaned name match or same league ID)
        const nameClean = leg.name.replace(/\s*\d{4}\s*$/i, "").trim().toLowerCase();
        const matches = lifetimeStats.seasons.filter((s: any) => {
          const sNameClean = s.name.replace(/\s*\d{4}\s*$/i, "").trim().toLowerCase();
          return (sNameClean === nameClean || s.leagueId === leg.leagueId) && (s.fpts || 0) > 0;
        });

        if (matches.length > 0) {
          // Sort most recent first
          matches.sort((a: any, b: any) => b.season.localeCompare(a.season));
          pointsFor = matches[0].fpts || 0;
          displaySeason = `${matches[0].season} (Prev)`;
        }
      }

      return {
        name: leg.name.length > 18 ? leg.name.substring(0, 16) + "..." : leg.name,
        fullName: leg.name,
        points: parseFloat(pointsFor.toFixed(2)),
        wins: roster.settings.wins || 0,
        losses: roster.settings.losses || 0,
        season: displaySeason,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-8" id="leagues-overview-container">
      {/* 2. Bento Stats Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5" id="bento-matrix">
        
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

        {/* Combined 2026 Season Record */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-xl shadow-black/10"
          id="stat-2026-record"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-all text-[#ba8659]">
            <Award size={100} />
          </div>
          <p className="text-xs font-mono font-medium tracking-widest text-white/40 uppercase">Combined 2026 Record</p>
          <h3 className="text-4xl font-mono font-bold text-[#ba8659] tracking-tight mt-2">
            {wins2026}-{losses2026}-{ties2026}
          </h3>
          <p className="text-2xs text-[#ba8659]/80 mt-4 font-sans font-medium">
            {count2026Leagues > 0 
              ? `Unified record across ${count2026Leagues} active 2026 leagu${count2026Leagues > 1 ? "es" : "e"}`
              : "No active 2026 leagues found"}
          </p>
        </motion.div>

        {/* Aggregate Points Scored */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-xl shadow-black/10"
          id="stat-points"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-all text-amber-500">
            <Flame size={100} />
          </div>
          <p className="text-xs font-mono font-medium tracking-widest text-white/40 uppercase flex items-center gap-1">
            {lifetimeStats ? "Lifetime Cumulative Points" : "Cumulative Scoring"}
            {loadingLifetime && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block"></span>}
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
          transition={{ duration: 0.3, delay: 0.15 }}
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
          transition={{ duration: 0.3, delay: 0.2 }}
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

        {/* Global Roster Age Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-xl shadow-black/10"
          id="stat-avg-age"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-all text-[#ba8659]">
            <Calendar size={100} />
          </div>
          <p className="text-xs font-mono font-medium tracking-widest text-white/40 uppercase">Global Squad Age</p>
          <h3 className="text-4xl font-mono font-bold text-white tracking-tight mt-2">
            {avgSquadAge > 0 ? `${avgSquadAge.toFixed(1)} yr` : "—"}
          </h3>
          <p className="text-2xs text-[#ba8659]/80 mt-4 font-sans font-medium">
            {avgSquadAge > 0 
              ? (avgSquadAge < 24.5 ? "🔥 Dynasty Rebuild / Youth" : avgSquadAge <= 27 ? "🏆 Championship Prime" : "⏳ Veteran Win-Now Window")
              : "No rostered players to aggregate"}
          </p>
        </motion.div>
      </div>

      {/* 2.5 Points For Variance bento box */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-black/10 flex flex-col gap-6"
        id="points-variance-bento-card"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-sans font-semibold text-white/90 flex items-center gap-2">
              <Flame className="text-[#cca57d]" size={20} />
              Franchise Scoring & Performance Variance
            </h2>
            <p className="text-xs text-white/40 font-sans mt-0.5">
              Comparative analysis of Points For across active dynasty leagues to measure scoring trends and team strengths
            </p>
          </div>
          <div className="flex bg-black/30 border border-white/15 p-1 rounded-lg shrink-0 gap-1" id="chart-toggle-options">
            <button
              onClick={() => setChartType("bar")}
              className={`px-3 py-1 rounded text-2xs font-sans font-semibold transition-all cursor-pointer ${
                chartType === "bar" ? "bg-[#ba8659]/20 text-[#cca57d] border border-[#ba8659]/30" : "text-white/50 hover:text-white"
              }`}
            >
              Bar Graph
            </button>
            <button
              onClick={() => setChartType("radar")}
              className={`px-3 py-1 rounded text-2xs font-sans font-semibold transition-all cursor-pointer ${
                chartType === "radar" ? "bg-[#ba8659]/20 text-[#cca57d] border border-[#ba8659]/30" : "text-white/50 hover:text-white"
              }`}
            >
              Radar Chart
            </button>
          </div>
        </div>

        {/* Chart rendering wrapper */}
        <div className="h-[280px] w-full relative">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex flex-col justify-center items-center bg-black/10 rounded-xl border border-white/5 p-4 text-center">
              <Flame size={28} className="text-white/20 animate-pulse mb-2" />
              <p className="text-xs font-sans text-stone-300">No scoring data available to visualize yet</p>
              <p className="text-4xs font-mono text-white/30 mt-0.5">Active rosters must be synced with Sleeper API</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#cca57d" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#ba8659" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#ffffff40" 
                    fontSize={9} 
                    fontFamily="Inter, sans-serif"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#ffffff40" 
                    fontSize={9} 
                    fontFamily="JetBrains Mono, monospace"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="points" 
                    fill="url(#barGradient)" 
                    radius={[6, 6, 0, 0]}
                    animationDuration={600}
                  />
                </BarChart>
              ) : (
                <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="#ffffff0d" />
                  <PolarAngleAxis 
                    dataKey="name" 
                    tick={{ fill: "#ffffff60", fontSize: 8, fontFamily: "Inter, sans-serif" }} 
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 'auto']} 
                    tick={{ fill: "#ffffff30", fontSize: 8, fontFamily: "JetBrains Mono, monospace" }} 
                    stroke="#ffffff10"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Radar 
                    name="Points" 
                    dataKey="points" 
                    stroke="#cca57d" 
                    fill="#ba8659" 
                    fillOpacity={0.25} 
                    animationDuration={600}
                  />
                </RadarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 3. Leagues detailed list */}
        <div className="lg:col-span-2 space-y-8" id="leagues-grid-list">
          {/* My Dynasty Franchises Bento Box */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-black/10 space-y-6"
            id="franchises-bento-card"
          >
            <div>
              <h2 className="text-lg font-sans font-semibold text-white/80 flex items-center gap-2">
                <Compass className="text-purple-400" size={18} />
                My Dynasty Franchises
              </h2>
              <p className="text-xs text-white/40 font-sans mt-0.5">
                Active franchise directories with live Standings and cumulative scores
              </p>
            </div>

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
          </motion.div>

          {/* My 5 Recent Trades Bento Box */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-black/10 space-y-6"
            id="recent-trades-hub-panel"
          >
            <div>
              <h2 className="text-lg font-sans font-semibold text-white/80 flex items-center gap-2">
                <History className="text-[#ba8659]" size={18} />
                Recent Trade History (5 Most Recent Deals)
              </h2>
              <p className="text-xs text-white/40 font-sans mt-0.5">
                Activity feed showing transactions executed across all unified league offices
              </p>
            </div>

            {loadingTrades ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#ba8659] animate-spin mb-4" />
                <p className="text-xs font-sans text-slate-400">Scanning ledger tables across all active leagues...</p>
              </div>
            ) : recentTrades && recentTrades.length > 0 ? (
              <div className="space-y-4">
                {recentTrades.slice(0, 5).map((t) => {
                  const dateStr = new Date(t.created).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  // Group added assets (players & draft picks) by the roster that received them
                  const recipientMap = new Map<number, { owner: string; team: string; userId: string; players: any[]; picks: any[] }>();

                  t.richAdds.forEach((item: any) => {
                    if (!recipientMap.has(item.rosterId)) {
                      recipientMap.set(item.rosterId, {
                        owner: item.ownerName,
                        team: item.teamName,
                        userId: item.userId,
                        players: [],
                        picks: []
                      });
                    }
                    recipientMap.get(item.rosterId)!.players.push(item.player);
                  });

                  t.richDraftPicks.forEach((pick: any) => {
                    if (!recipientMap.has(pick.receiverRosterId)) {
                      recipientMap.set(pick.receiverRosterId, {
                        owner: pick.receiverName,
                        team: pick.receiverTeam,
                        userId: "",
                        players: [],
                        picks: []
                      });
                    }
                    recipientMap.get(pick.receiverRosterId)!.picks.push(pick);
                  });

                  const activeRecipients = Array.from(recipientMap.entries());
                  const isExpanded = !!expandedTrades[t.transaction_id];
                  const playersExchanged = t.richAdds.map((item: any) => item.player?.full_name).filter(Boolean);
                  const picksExchanged = t.richDraftPicks.map((pick: any) => `${pick.season} Rd ${pick.round}`).filter(Boolean);
                  const summaryText = [...playersExchanged, ...picksExchanged].join(", ") || "No players/picks resolved";

                  return (
                    <div 
                      key={t.transaction_id}
                      className="bg-[#0c0f0e]/60 border border-[#ba8659]/15 rounded-xl overflow-hidden hover:border-[#ba8659]/25 transition-all shadow-md"
                    >
                      <button 
                        onClick={() => toggleTrade(t.transaction_id)}
                        className="w-full text-left px-4 py-2.5 border-b border-white/5 flex flex-wrap items-center justify-between bg-black/20 gap-2 hover:bg-black/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-sans font-black uppercase tracking-wider px-2 py-0.5 bg-[#ba8659]/10 text-[#cca57d] border border-[#ba8659]/20 rounded">
                            {t.leagueName}
                          </span>
                          <span className="text-3xs font-mono text-white/40">Week {t.week}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-3xs font-sans text-white/40 flex items-center gap-1.5">
                            <Calendar size={10} className="text-[#ba8659]/75" />
                            {dateStr}
                          </span>
                          <div className="text-white/40 hover:text-[#cca57d] transition-colors">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </div>
                      </button>

                      {!isExpanded ? (
                        <div 
                          onClick={() => toggleTrade(t.transaction_id)}
                          className="px-4 py-2.5 bg-black/5 hover:bg-black/15 transition-all text-stone-300 flex items-center justify-between gap-4 text-2xs font-sans cursor-pointer"
                        >
                          <span className="text-white/50 truncate flex-1">
                            <strong className="text-[#cca57d]/80 uppercase tracking-wide mr-1.5 text-[9px] font-bold">Assets:</strong>
                            {summaryText}
                          </span>
                          <span className="text-[9px] font-sans text-[#ba8659]/80 shrink-0 uppercase tracking-widest bg-[#ba8659]/5 px-2 py-0.5 rounded border border-[#ba8659]/10 leading-none">
                            Show details
                          </span>
                        </div>
                      ) : (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-black/10">
                          {activeRecipients.length === 0 ? (
                            <p className="text-3xs text-slate-500 italic pb-1">No assets registered in transfer ledger.</p>
                          ) : (
                            activeRecipients.map(([rid, data]: any, idx) => {
                              const ownerTheme = getOwnerTheme(data.userId || data.owner);
                              return (
                                <div key={rid} className="p-3 bg-black/20 rounded-lg border border-white/5 relative">
                                  <span className="absolute top-2 right-2 text-[8px] font-mono font-bold text-[#ba8659]/70 uppercase tracking-widest bg-[#ba8659]/5 px-1.5 py-0.5 rounded border border-[#ba8659]/10">
                                    RECEIVES
                                  </span>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${ownerTheme.avatarBg} border border-white/20`} />
                                    <div>
                                      <h4 className={`text-2xs font-sans font-bold ${ownerTheme.text}`}>
                                        {data.team}
                                      </h4>
                                      <p className="text-3xs text-white/40 font-mono">@{data.owner}</p>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    {data.players.map((p: any) => {
                                      let posStyle = "bg-[#ba8659]/15 text-[#ba8659] border-[#ba8659]/20";
                                      if (p.position === "QB") posStyle = "bg-[#ff007f]/15 text-[#ff007f] border-[#ff007f]/20";
                                      else if (p.position === "RB") posStyle = "bg-[#00c176]/15 text-[#00c176] border-[#00c176]/20";
                                      else if (p.position === "WR") posStyle = "bg-[#e2b13c]/15 text-[#e2b13c] border-[#e2b13c]/20";
                                      else if (p.position === "TE") posStyle = "bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/20";

                                      return (
                                        <div key={p.id} className="flex items-center justify-between p-1.5 bg-white/2 rounded border border-white/5">
                                          <div className="flex flex-col">
                                            <span className="text-2xs font-sans font-semibold text-stone-200 leading-tight">{p.full_name}</span>
                                            <span className="text-4xs text-white/40 font-mono leading-none">{p.team || "FA"}</span>
                                          </div>
                                          <span className={`text-[8px] font-mono font-black px-1.5 py-0.2 rounded border ${posStyle}`}>
                                            {p.position}
                                          </span>
                                        </div>
                                      );
                                    })}

                                    {data.picks.map((pick: any, pIdx: number) => (
                                      <div key={pIdx} className="flex items-center justify-between p-1.5 bg-[#ba8659]/5 rounded border border-[#ba8659]/15">
                                        <div className="flex flex-col">
                                          <span className="text-2xs font-sans font-semibold text-stone-200 leading-tight">
                                            {pick.season} Rd {pick.round} Pick
                                          </span>
                                          <span className="text-4xs text-white/40 block leading-none">
                                            Original: {pick.originalOwnerTeam}
                                          </span>
                                        </div>
                                        <span className="bg-[#ba8659]/15 text-[#cca57d] font-mono text-[8px] font-bold px-1 py-0.2 rounded border border-[#ba8659]/25">
                                          PICK
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/3 border border-white/5 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                <History className="text-white/25 mb-2 animate-pulse" size={24} />
                <h3 className="text-xs font-sans font-semibold text-slate-300">No Recent Trades Found</h3>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                  There are no recorded trade block deals involving you across active leagues.
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* 4. Column: Key Dynasty Keystone Players */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-black/10 space-y-4 h-fit text-slate-100"
          id="anchors-bento-box"
        >
          <div>
            <h2 className="text-lg font-sans font-semibold text-white/80 flex items-center gap-2 animate-pulse">
              <TrendingUp className="text-purple-400" size={18} />
              Ownership Anchors
            </h2>
            <p className="text-xs text-white/40 font-sans mt-0.5">
              Player holdings anchored across multiple core roster configurations
            </p>
          </div>

          <p className="text-xs text-white/50 leading-relaxed font-sans pt-1">
            These are the core NFL players that {username} has anchored their dynasty franchises with, owned in multiple leagues:
          </p>

          {dynastyAnchors.length > 0 ? (
            <div className="space-y-3 pt-2">
              {dynastyAnchors.map((anchor, i) => {
                // Standard Position Colors
                let posColor = "bg-white/5 text-white/40 border border-white/5";
                if (anchor.pos === "QB") posColor = "bg-rose-500/15 text-rose-400 border border-rose-500/20";
                else if (anchor.pos === "RB") posColor = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
                else if (anchor.pos === "WR") posColor = "bg-[#e2b13c]/15 text-[#e2b13c] border border-[#e2b13c]/20";
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
                      <span className="text-xs font-mono font-semibold text-[#ba8659] bg-[#ba8659]/10 border border-[#ba8659]/20 px-2 py-0.5 rounded">
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
        </motion.div>
      </div>

    </div>
  );
}
