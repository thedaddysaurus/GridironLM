import React, { useState, useEffect } from "react";
import { Trophy, History, ShieldAlert, Award, Calendar, RefreshCw, BarChart3, Users2 } from "lucide-react";
import { motion } from "motion/react";

interface HistoryViewProps {
  leagueId: string;
  userRosterId: number;
}

interface HistoricalSeason {
  leagueId: string;
  season: string;
  name: string;
  totalRosters: number;
  champion: {
    ownerId: string;
    displayName: string;
    teamName: string;
    avatar: string | null;
    record: string;
    fpts: number;
  } | null;
  runnerUp: {
    ownerId: string;
    displayName: string;
    teamName: string;
    avatar: string | null;
    record: string;
    fpts: number;
  } | null;
}

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  teamName: string;
  avatar: string | null;
  seasonsCount: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
}

export default function HistoryView({ leagueId, userRosterId }: HistoryViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<HistoricalSeason[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sleeper/league/${leagueId}/history`);
        if (!res.ok) {
          throw new Error("Failed compiling league history records.");
        }
        const data = await res.json();
        setSeasons(data.seasons || []);
        setLeaderboard(data.leaderboard || []);
      } catch (err: any) {
        setError(err.message || "Unable to load league history statistics.");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [leagueId]);

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center space-y-4 shadow-xl shadow-black/10 animate-pulse">
        <div className="flex justify-center">
          <RefreshCw className="animate-spin text-purple-400" size={30} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-200">Replaying Historical Standings...</p>
          <p className="text-3xs font-mono text-white/40 uppercase tracking-widest">Compiling lifetime win ratios and points</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center space-y-3">
        <ShieldAlert className="mx-auto text-rose-500" size={32} />
        <h4 className="text-sm font-sans font-bold text-slate-200">History Load Issue</h4>
        <p className="text-xs text-white/50">{error}</p>
      </div>
    );
  }

  // Find all-time statistics leaders
  const topWins = [...leaderboard].sort((a, b) => b.wins - a.wins)[0];
  const topPoints = [...leaderboard].sort((a, b) => b.pointsFor - a.pointsFor)[0];

  return (
    <div className="space-y-6" id="history-view-container">
      {/* Overview stats header cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Seasons Tracked */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-black/5">
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-black">History depth</span>
            <h3 className="text-2xl font-mono font-black text-slate-100">{seasons.length} Seasons</h3>
            <p className="text-3xs text-white/40 font-sans">Multi-season synced ledger</p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/15 rounded-xl text-purple-400">
            <History size={20} />
          </div>
        </div>

        {/* All-Time Win Leader */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-black/5">
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-black">Career wins leader</span>
            <h3 className="text-lg font-sans font-black text-slate-100 truncate max-w-[170px]">
              {topWins ? topWins.displayName : "N/A"}
            </h3>
            <p className="text-3xs text-purple-300 font-mono font-bold">
              {topWins ? `${topWins.wins} Wins over ${topWins.seasonsCount} seasons` : ""}
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/15 rounded-xl text-indigo-400">
            <Trophy size={18} />
          </div>
        </div>

        {/* All-Time Scoring Leader */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-black/5">
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-black">Points captain</span>
            <h3 className="text-lg font-sans font-black text-slate-100 truncate max-w-[170px]">
              {topPoints ? topPoints.displayName : "N/A"}
            </h3>
            <p className="text-3xs text-purple-400 font-mono font-bold">
              {topPoints ? `${topPoints.pointsFor.toFixed(2)} FPTS` : ""}
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/15 rounded-xl text-purple-300">
            <BarChart3 size={18} />
          </div>
        </div>
      </div>

      {/* Chronicle of Seasons */}
      <div className="space-y-4">
        <h3 className="text-sm font-sans font-semibold text-white/85 flex items-center gap-2">
          <Calendar size={16} className="text-purple-400" />
          Season Champions Chronicle
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasons.map((season) => (
            <div 
              key={season.leagueId}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl shadow-black/10 relative overflow-hidden group hover:border-white/25 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-sans font-extrabold text-slate-100">{season.season} Season</h4>
                  <p className="text-[10px] text-white/40 truncate max-w-[160px]">{season.name}</p>
                </div>
                <span className="text-3xs font-mono bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 rounded text-purple-300 font-bold">
                  {season.totalRosters} Teams
                </span>
              </div>

              {/* Champion Box */}
              {season.champion ? (
                <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 p-3 rounded-xl space-y-2 relative">
                  <div className="absolute top-2.5 right-2.5 text-amber-400">
                    <Trophy size={14} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-purple-300 font-black">League Champion</span>
                    <h5 className="text-xs font-sans font-bold text-slate-200 mt-0.5 truncate">{season.champion.teamName}</h5>
                    <p className="text-[10px] text-white/50 block font-sans">@{season.champion.displayName}</p>
                  </div>
                  <div className="flex justify-between items-center text-3xs font-mono text-white/40 pt-1 border-t border-purple-500/10">
                    <span>Record: <strong className="text-slate-300">{season.champion.record}</strong></span>
                    <span>FPTS: <strong className="text-slate-300">{season.champion.fpts.toFixed(1)}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="bg-white/2 border border-white/5 p-3 rounded-xl text-center">
                  <p className="text-3xs italic text-white/30">No Champion Registered</p>
                </div>
              )}

              {/* Runner Up Box */}
              {season.runnerUp && (
                <div className="bg-white/2 border border-white/5 p-3 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-white/40 font-bold">Runner-Up</span>
                    <Award size={11} className="text-white/45" />
                  </div>
                  <div>
                    <h5 className="text-2xs font-sans font-bold text-slate-300 truncate">{season.runnerUp.teamName}</h5>
                    <p className="text-[10px] text-white/40 block font-sans">@{season.runnerUp.displayName}</p>
                  </div>
                  <div className="flex justify-between items-center text-3xs font-mono text-white/30 pt-1 border-t border-white/5">
                    <span>Record: {season.runnerUp.record}</span>
                    <span>{season.runnerUp.fpts.toFixed(1)} pts</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {seasons.length === 0 && (
            <div className="col-span-full bg-white/2 border border-white/5 rounded-2xl p-10 text-center">
              <p className="text-xs text-white/30 italic">No historical seasons were compiled for this league.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lifetime Leaderboard Board */}
      <div className="space-y-4">
        <h3 className="text-sm font-sans font-semibold text-white/85 flex items-center gap-2">
          <Users2 size={16} className="text-purple-400" />
          Lifetime Franchise Leaderboard (Career Records)
        </h3>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-white/55 font-medium tracking-wider uppercase text-[10px]">
                  <th className="py-4 px-5 text-center w-14 font-bold">Rank</th>
                  <th className="py-4 px-4 font-bold">Franchise / Owner</th>
                  <th className="py-4 px-4 text-center font-bold">Seasons</th>
                  <th className="py-4 px-4 text-center font-bold">Wins</th>
                  <th className="py-4 px-4 text-center font-bold">Losses</th>
                  <th className="py-4 px-4 text-center font-bold">Win Ratio</th>
                  <th className="py-4 px-4 text-right pr-6 font-bold">Total FPTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaderboard.map((member, idx) => {
                  const totalGames = member.wins + member.losses + member.ties;
                  const winPct = totalGames > 0 ? (member.wins / totalGames) * 100 : 0;
                  
                  return (
                    <tr 
                      key={member.userId}
                      className="hover:bg-white/5 text-white/80 transition-all duration-200"
                    >
                      {/* Rank */}
                      <td className="py-4 px-5 text-center font-mono text-white/40 font-bold">
                        {idx + 1}
                      </td>

                      {/* Franchise */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img 
                              src={`https://sleepercdn.com/avatars/thumbs/${member.avatar}`}
                              alt={member.displayName}
                              className="w-7 h-7 rounded-full border border-white/10 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-white/5 text-white/55 font-bold flex items-center justify-center border border-white/10 text-2xs">
                              {member.displayName[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">
                              {member.teamName}
                            </span>
                            <span className="text-[10px] text-white/40 block">
                              @{member.displayName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Seasons */}
                      <td className="py-4 px-4 text-center font-mono">
                        {member.seasonsCount}
                      </td>

                      {/* Wins */}
                      <td className="py-4 px-4 text-center font-mono text-emerald-400 font-semibold">
                        {member.wins}
                      </td>

                      {/* Losses */}
                      <td className="py-4 px-4 text-center font-mono text-rose-400/80">
                        {member.losses}
                      </td>

                      {/* Win % */}
                      <td className="py-4 px-4 text-center font-mono text-white/50">
                        {winPct.toFixed(1)}%
                      </td>

                      {/* Career Points */}
                      <td className="py-4 px-4 text-right pr-6 font-mono font-semibold text-purple-300">
                        {member.pointsFor.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-white/30 italic">
                      No matching franchise historical records compiled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
