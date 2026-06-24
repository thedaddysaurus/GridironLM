import React, { useState, useEffect } from "react";
import { RichRoster } from "../types";
import { Trophy, RefreshCw, Calendar, Search, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getOwnerTheme } from "../utils/theme";

interface StandingsViewProps {
  standings: RichRoster[];
  userRosterId: number;
  leagueId?: string;
  currentSeason?: string;
  ownerId?: string;
}

interface HistoricalSeasonBrief {
  leagueId: string;
  season: string;
  name: string;
}

export default function StandingsView({
  standings: initialStandings,
  userRosterId,
  leagueId,
  currentSeason = "2026",
  ownerId
}: StandingsViewProps) {
  const [seasons, setSeasons] = useState<HistoricalSeasonBrief[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(leagueId || "");
  const [selectedSeason, setSelectedSeason] = useState<string>(currentSeason);
  const [standings, setStandings] = useState<RichRoster[]>(initialStandings);
  const [loading, setLoading] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

  // Keep track of parent changes
  useEffect(() => {
    setStandings(initialStandings);
    setSelectedSeason(currentSeason);
    if (leagueId) {
      setSelectedLeagueId(leagueId);
    }
  }, [initialStandings, currentSeason, leagueId]);

  // Load seasons list
  useEffect(() => {
    if (!leagueId) return;
    async function loadSeasons() {
      setLoadingSeasons(true);
      try {
        const res = await fetch(`/api/sleeper/league/${leagueId}/history`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.seasons)) {
            const brief: HistoricalSeasonBrief[] = data.seasons.map((s: any) => ({
              leagueId: s.leagueId,
              season: s.season,
              name: s.name
            }));
            setSeasons(brief);
          }
        }
      } catch (err) {
        console.warn("Failed fetching historical seasons for standings.", err);
      } finally {
        setLoadingSeasons(false);
      }
    }
    loadSeasons();
  }, [leagueId]);

  // Handle season dropdown choice
  const handleSeasonChange = async (targetLeagueId: string, targetSeason: string) => {
    setSelectedLeagueId(targetLeagueId);
    setSelectedSeason(targetSeason);
    
    // If it's the current active league, fallback to initial props instantly
    if (targetLeagueId === leagueId) {
      setStandings(initialStandings);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/sleeper/league/${targetLeagueId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.standings)) {
          setStandings(data.standings);
        }
      }
    } catch (err) {
      console.error("Failed loading standings for custom season league ID: " + targetLeagueId, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="standings-view-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-sans font-semibold text-white/80 flex items-center gap-2">
          <Trophy className="text-[#ba8659] animate-pulse" size={18} />
          League Standings Board
        </h2>

        {/* Improved Interactive Dropdown with Glowing Slate Theme */}
        <div className="flex items-center gap-2 self-start sm:self-auto relative">
          <Calendar size={14} className="text-[#ba8659]" />
          <span className="text-xs text-white/45 font-mono">Select Season:</span>
          {loadingSeasons ? (
            <div className="w-24 h-8 bg-white/5 animate-pulse rounded border border-white/10" />
          ) : seasons.length > 0 ? (
            <div className="relative inline-block w-48 z-30" id="standings-season-dropdown-container">
              <button
                type="button"
                onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                className="w-full inline-flex justify-between items-center gap-2.5 px-3.5 py-2 border border-[#ba8659]/30 rounded-xl bg-[#090b0a] text-2xs font-sans font-semibold tracking-wide uppercase text-[#fcf9f5] shadow-xl hover:bg-slate-900 focus:outline-none cursor-pointer transition-all"
              >
                <span className="truncate">
                  {seasons.find(s => s.leagueId === selectedLeagueId)?.season || selectedSeason} {seasons.find(s => s.leagueId === selectedLeagueId)?.season === currentSeason ? "(Active)" : ""}
                </span>
                <ChevronDown size={12} className={`text-[#ba8659] transition-transform duration-200 ${seasonDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {seasonDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSeasonDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-full rounded-xl bg-[#090b0a] border border-[#ba8659]/20 shadow-2xl z-20 overflow-hidden backdrop-blur-xl"
                    >
                      <div className="p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
                        {seasons.map((s) => (
                          <button
                            key={s.leagueId}
                            onClick={() => {
                              handleSeasonChange(s.leagueId, s.season);
                              setSeasonDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-3xs font-sans font-semibold rounded-lg text-left transition-all cursor-pointer ${
                              selectedLeagueId === s.leagueId
                                ? "bg-white/10 text-white"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <span>{s.season} SEASON</span>
                            {s.season === currentSeason && (
                              <span className="text-[9px] text-[#ba8659] bg-[#ba8659]/10 px-1 py-0.5 rounded uppercase tracking-widest font-bold scale-90">Active</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <span className="text-xs font-mono font-bold text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
              {currentSeason}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-16 text-center space-y-4">
          <div className="flex justify-center">
            <RefreshCw className="animate-spin text-[#ba8659]" size={28} />
          </div>
          <p className="text-xs text-white/40 font-mono tracking-widest uppercase">Fetching {selectedSeason} Standings...</p>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-white/55 font-medium tracking-wider uppercase text-[10px]">
                  <th className="py-4 px-5 text-center w-14">Rank</th>
                  <th className="py-4 px-4">Franchise / Owner</th>
                  <th className="py-4 px-4 text-center">Record</th>
                  <th className="py-4 px-4 text-center">Win %</th>
                  <th className="py-4 px-4 text-right">Points For</th>
                  <th className="py-4 px-4 text-right pr-6">Points Against</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {standings.map((roster, index) => {
                  // Robust user checklist comparison targeting ownerId
                  const isUser = ownerId ? roster.owner_id === ownerId : roster.roster_id === userRosterId;
                  const wins = roster.settings.wins || 0;
                  const losses = roster.settings.losses || 0;
                  const ties = roster.settings.ties || 0;
                  const total = wins + losses + ties;
                  const winPct = total > 0 ? (wins / total) * 100 : 0;
                  const fpts = (roster.settings.fpts || 0) + (roster.settings.fpts_decimal || 0) * 0.01;
                  const fptsAgainst = (roster.settings.fpts_against || 0) + (roster.settings.fpts_against_decimal || 0) * 0.01;

                  // Owner details
                  const owner = roster.ownerDetails;
                  const avatarUrl = owner.avatar
                    ? `https://sleepercdn.com/avatars/thumbs/${owner.avatar}`
                    : null;
                  
                  const ownerTheme = getOwnerTheme(owner.user_id || owner.display_name);

                  return (
                    <tr
                      key={roster.roster_id}
                      className={`transition-all duration-200 ${
                        isUser
                          ? "bg-[#ba8659]/10 hover:bg-[#ba8659]/15 border-l-4 border-l-[#ba8659] font-semibold text-slate-100"
                          : "hover:bg-white/5 text-white/80"
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-4 px-5 text-center font-mono font-bold">
                        <div className="flex items-center justify-center">
                          {index === 0 ? (
                            <div className="w-6 h-6 rounded-md bg-[#ba8659]/20 text-[#ba8659] flex items-center justify-center border border-[#ba8659]/40 shadow-sm">
                              1
                            </div>
                          ) : index === 1 ? (
                            <div className="w-6 h-6 rounded-md bg-slate-100/15 text-slate-200 flex items-center justify-center border border-white/10 shadow-sm">
                              2
                            </div>
                          ) : index === 2 ? (
                            <div className="w-6 h-6 rounded-md bg-orange-700/15 text-orange-300 flex items-center justify-center border border-orange-700/25 shadow-sm">
                              3
                            </div>
                          ) : (
                            <span className="text-white/40">{index + 1}</span>
                          )}
                        </div>
                      </td>

                      {/* Franchise Details */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={owner.display_name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full border border-white/10"
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${ownerTheme.avatarBg} font-black flex items-center justify-center border border-white/10`}>
                              {owner.display_name[0]?.toUpperCase() || "O"}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold font-playbook ${isUser ? "text-[#ba8659] font-bold" : ownerTheme.text}`}>
                                {owner.team_name}
                              </span>
                              {isUser && (
                                <span className="text-[9px] font-typewriter font-semibold bg-[#ba8659]/15 text-[#ba8659] border border-[#ba8659]/25 px-1.5 py-0.5 rounded-md uppercase">
                                  My Team
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] opacity-75 font-sans block mt-0.5 ${ownerTheme.text}`}>
                              @{owner.display_name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Record */}
                      <td className="py-4 px-4 text-center font-mono text-sm font-semibold">
                        {wins}-{losses}-{ties}
                      </td>

                      {/* Win % */}
                      <td className="py-4 px-4 text-center font-mono text-white/50">
                        {winPct.toFixed(1)}%
                      </td>

                      {/* Points For */}
                      <td className={`py-4 px-4 text-right font-mono font-bold ${isUser ? 'text-[#ba8659]' : 'text-slate-200'}`}>
                        {fpts.toFixed(2)}
                      </td>

                      {/* Points Against */}
                      <td className="py-4 px-4 text-right pr-6 font-mono text-white/35 font-normal">
                        {fptsAgainst.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
