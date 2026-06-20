import React, { useEffect, useState } from "react";
import { ArrowRight, RefreshCw, Plus, Minus, Calendar, DollarSign, Search, Tag, Inbox, TrendingUp, Award } from "lucide-react";
import { getOwnerTheme } from "../utils/theme";
import { motion } from "motion/react";

interface PlayerDetails {
  id: string;
  full_name: string;
  position: string;
  team: string | null;
}

interface RichTransactionItem {
  player: PlayerDetails;
  rosterId: number;
  ownerName: string;
  teamName: string;
  userId: string;
}

interface RichDraftPick {
  season: string;
  round: number;
  receiverRosterId: number;
  receiverName: string;
  receiverTeam: string;
  senderRosterId: number;
  senderName: string;
  senderTeam: string;
  originalOwnerRosterId: number;
  originalOwnerName: string;
  originalOwnerTeam: string;
}

interface Transaction {
  transaction_id: string;
  type: "trade" | "free_agent" | "waiver" | "commissioner";
  status: string;
  created: number;
  status_updated: number;
  week: number;
  roster_ids: number[];
  waiver_budget: Array<{ sender: number; receiver: number; amount: number }>;
  richAdds: RichTransactionItem[];
  richDrops: RichTransactionItem[];
  richDraftPicks: RichDraftPick[];
}

interface Owner {
  rosterId: number;
  displayName: string;
  teamName: string;
  avatar: string | null;
  userId: string;
}

interface TransactionsViewProps {
  leagueId: string;
  userRosterId: number;
  mode: "all" | "trades";
}

export default function TransactionsView({ leagueId, userRosterId, mode }: TransactionsViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sleeper/league/${leagueId}/transactions`);
        if (!res.ok) {
          throw new Error("Failed to fetch transactions.");
        }
        const data = await res.json();
        if (active) {
          // If we are in "trades" mode, filter strictly for trade type transactions
          setTransactions(data.transactions || []);
          setOwners(data.owners || []);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Could not load transactions.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [leagueId]);

  // Filter transactions based on mode, search query and type filter
  const filtered = transactions.filter((t) => {
    // 1. Mode check
    if (mode === "trades" && t.type !== "trade") {
      return false;
    }

    // 2. Type filter
    if (typeFilter !== "ALL" && t.type !== typeFilter) {
      return false;
    }

    // 3. Search query check
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();

    // Check player names involved
    const playersMatch = 
      t.richAdds.some(item => item.player.full_name.toLowerCase().includes(query)) ||
      t.richDrops.some(item => item.player.full_name.toLowerCase().includes(query));

    // Check owner names involved
    const ownerMatch = 
      t.richAdds.some(item => item.ownerName.toLowerCase().includes(query) || item.teamName.toLowerCase().includes(query)) ||
      t.richDrops.some(item => item.ownerName.toLowerCase().includes(query) || item.teamName.toLowerCase().includes(query));

    return playersMatch || ownerMatch;
  });

  // Unique formatting for player positions (Sleeper colors)
  const getPositionTagStyle = (pos: string) => {
    switch (pos) {
      case "QB":
        return "bg-[#ff007f] text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded";
      case "RB":
        return "bg-[#00c176] text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded";
      case "WR":
        return "bg-[#56b2e6] text-slate-900 font-mono text-[9px] font-black px-1.5 py-0.5 rounded";
      case "TE":
        return "bg-[#f5a623] text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded";
      default:
        return "bg-purple-600 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded";
    }
  };

  // Compile trade metrics (most traded players and positions) from the complete transactions dataset
  const tradesOnly = transactions.filter((t) => t.type === "trade");
  
  const playerTradeCounts: Record<string, { full_name: string; position: string; team: string | null; count: number }> = {};
  const positionTradeCounts: Record<string, number> = {};

  tradesOnly.forEach((t) => {
    t.richAdds.forEach((add) => {
      const p = add.player;
      if (!p || !p.id) return;
      if (!playerTradeCounts[p.id]) {
        playerTradeCounts[p.id] = {
          full_name: p.full_name,
          position: p.position,
          team: p.team,
          count: 0
        };
      }
      playerTradeCounts[p.id].count += 1;
    });

    t.richAdds.forEach((add) => {
      if (add.player && add.player.position) {
        const pos = add.player.position;
        positionTradeCounts[pos] = (positionTradeCounts[pos] || 0) + 1;
      }
    });
  });

  const topTradedPlayers = Object.entries(playerTradeCounts)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topTradedPositions = Object.entries(positionTradeCounts)
    .map(([position, count]) => ({ position, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" id="tx-loading-spinner">
        <RefreshCw className="text-purple-400 animate-spin mb-3" size={28} />
        <p className="text-xs text-slate-400 font-sans">
          Downloading and indexing {mode === "trades" ? "league trades ledger" : "waiver and transactions history"}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-xs font-sans text-center" id="tx-error-message">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6" id="transactions-view-root">
      {/* Top 5 Most Traded Bento Grid */}
      {mode === "trades" && topTradedPlayers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="trades-leaderboard-grid">
          {/* Most Traded Players Card */}
          <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-sans font-bold text-slate-200 tracking-wider uppercase flex items-center gap-2">
              <TrendingUp className="text-purple-400" size={14} />
              🔥 Most Traded Players (Season Top 5)
            </h3>
            <div className="divide-y divide-white/5 space-y-2.5">
              {topTradedPlayers.map((tp, idx) => {
                const getPositionColor = (pos: string) => {
                  switch (pos) {
                    case "QB": return "bg-[#ff007f]/20 text-[#ff007f] border-[#ff007f]/30";
                    case "RB": return "bg-[#00c176]/20 text-[#00c176] border-[#00c176]/30";
                    case "WR": return "bg-[#56b2e6]/20 text-[#56b2e6] border-[#56b2e6]/30";
                    case "TE": return "bg-[#f5a623]/20 text-[#f5a623] border-[#f5a623]/30";
                    default: return "bg-purple-500/20 text-purple-300 border-purple-500/30";
                  }
                };
                return (
                  <div key={tp.id} className="flex items-center justify-between pt-2.5 first:pt-0">
                    <div className="flex items-center gap-3">
                      {/* Rank Number */}
                      <span className="text-2xs font-mono font-bold text-slate-500 w-4">#{idx+1}</span>
                      {/* Player Headshot Avatar with standard error handling */}
                      <div className="w-8 h-8 rounded-full bg-slate-950 border border-white/5 overflow-hidden flex items-center justify-center">
                        <img 
                          src={`https://sleepercdn.com/content/nfl/players/thumbs/${tp.id}.jpg`}
                          alt={tp.full_name}
                          className="w-full h-full object-cover scale-110 translate-y-0.5"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="text-[9px] font-bold font-sans text-white/50">
                          {tp.full_name.split(" ").map(n => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-sans font-bold text-slate-200">{tp.full_name}</p>
                        <p className="text-4xs text-white/40">{tp.team || "FA"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${getPositionColor(tp.position)}`}>
                        {tp.position}
                      </span>
                      <span className="text-2xs font-mono font-black text-purple-300 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                        {tp.count}x Traded
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Most Traded Positions Card */}
          <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-sans font-bold text-slate-200 tracking-wider uppercase flex items-center gap-2">
              <Award className="text-purple-400" size={14} />
              🎯 Most Traded Positions (Total Volume)
            </h3>
            <div className="divide-y divide-white/5 space-y-2.5">
              {topTradedPositions.map((tp, idx) => {
                const getPositionColor = (pos: string) => {
                  switch (pos) {
                    case "QB": return "bg-[#ff007f] text-white";
                    case "RB": return "bg-[#00c176] text-white";
                    case "WR": return "bg-[#56b2e6] text-slate-900 font-bold";
                    case "TE": return "bg-[#f5a623] text-white";
                    default: return "bg-purple-600 text-white";
                  }
                };
                return (
                  <div key={tp.position} className="flex items-center justify-between pt-2.5 first:pt-0">
                    <div className="flex items-center gap-3">
                      <span className="text-2xs font-mono font-bold text-slate-500 w-4">#{idx+1}</span>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-3xs font-extrabold shadow ${getPositionColor(tp.position)}`}>
                        {tp.position}
                      </span>
                      <div>
                        <p className="text-xs font-sans font-semibold text-slate-200">
                          {tp.position === "QB" ? "Quarterback" : tp.position === "RB" ? "Running Back" : tp.position === "WR" ? "Wide Receiver" : tp.position === "TE" ? "Tight End" : "Other Position"}s
                        </p>
                        <p className="text-3xs text-white/45 font-mono">League roster prioritization velocity</p>
                      </div>
                    </div>
                    <span className="text-2xs font-mono font-black text-purple-300 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                      {tp.count} Traded
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/3 border border-white/5 rounded-2xl p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by player or manager..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-sans text-slate-200 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        </div>

        {mode !== "trades" && (
          <div className="flex gap-1.5 overflow-x-auto scroller-hidden">
            {["ALL", "trade", "waiver", "free_agent"].map((t) => {
              const label = t === "ALL" ? "All Activity" : t === "trade" ? "Trades" : t === "waiver" ? "Waiver Wire" : "Free Agents";
              const isSelected = typeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 text-3xs font-sans font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-200"
                      : "bg-white/5 border-white/5 text-white/55 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Transactions Container */}
      {filtered.length === 0 ? (
        <div className="bg-white/3 border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <Inbox className="text-white/25 mb-3 animate-pulse" size={32} />
          <h3 className="text-xs font-sans font-bold text-slate-300">No Transactions Found</h3>
          <p className="text-3xs text-slate-500 font-sans mt-1 max-w-xs">
            {searchQuery ? "Try searching for a different name or position." : `There are no recorded ${mode === "trades" ? "trades" : "transactions"} in this league season.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((t) => {
            const dateStr = new Date(t.created).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });

            // 1. TRADE HIGH-FIDELITY VISUALIZER
            if (t.type === "trade") {
              // Group added assets (players & draft picks) by the roster that received them
              const recipientMap = new Map<number, { owner: string; team: string; userId: string; players: PlayerDetails[]; picks: RichDraftPick[] }>();

              // Help guarantee any roster involved is listed even if they only gave away picks but received nothing
              t.roster_ids.forEach((rid) => {
                const specOwner = owners.find(o => o.rosterId === rid);
                recipientMap.set(rid, {
                  owner: specOwner?.displayName || `Roster ${rid}`,
                  team: specOwner?.teamName || `Roster ${rid}`,
                  userId: specOwner?.userId || "",
                  players: [],
                  picks: []
                });
              });

              t.richAdds.forEach((item) => {
                const data = recipientMap.get(item.rosterId);
                if (data) {
                  data.players.push(item.player);
                }
              });

              t.richDraftPicks.forEach((pick) => {
                const data = recipientMap.get(pick.receiverRosterId);
                if (data) {
                  data.picks.push(pick);
                }
              });

              // Convert map to array and only keep those who actually received an asset
              const activeRecipients = Array.from(recipientMap.entries())
                .filter(([_, data]) => data.players.length > 0 || data.picks.length > 0);

              const tradeTheme = getOwnerTheme(t.transaction_id);

              return (
                <div
                  key={t.transaction_id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all"
                  id={`trade-${t.transaction_id}`}
                >
                  {/* Trade Header */}
                  <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-white/2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
                        BLOCKBUSTER TRADE
                      </span>
                      <span className="text-3xs font-mono text-white/40">Week {t.week}</span>
                    </div>
                    <span className="text-3xs font-mono text-white/40 flex items-center gap-1.5">
                      <Calendar size={10} className="text-white/30" />
                      {dateStr}
                    </span>
                  </div>

                  {/* Recipients Layout */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeRecipients.length === 0 ? (
                      <p className="text-3xs text-slate-500 italic">No assets registered in transfer ledger.</p>
                    ) : (
                      activeRecipients.map(([rid, data], index) => {
                        const ownerTheme = getOwnerTheme(data.userId || data.owner);
                        return (
                          <div
                            key={rid}
                            className={`p-4 bg-white/2 rounded-xl border border-white/5 relative hover:border-white/15 transition-all shadow-sm`}
                          >
                            <div className="absolute top-3 right-3 text-3xs font-mono text-white/10 font-bold">
                              #{(index + 1)}
                            </div>

                            {/* Owner Tag Header */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${ownerTheme.avatarBg} border border-white/20`} />
                              <div>
                                <h4 className={`text-xs font-sans font-extrabold ${ownerTheme.text}`}>
                                  {data.team}
                                </h4>
                                <p className="text-3xs opacity-60 font-sans">@{data.owner}</p>
                              </div>
                              <span className="text-[8px] font-mono uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded ml-auto text-slate-400 font-bold">
                                RECEIVES
                              </span>
                            </div>

                            {/* Assets Listed */}
                            <div className="space-y-2">
                              {data.players.length === 0 && data.picks.length === 0 && (
                                <p className="text-4xs text-white/30 italic">No assets transferred.</p>
                              )}

                              {data.players.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5"
                                >
                                  <div>
                                    <span className="text-xs font-sans font-bold text-slate-200">
                                      {p.full_name}
                                    </span>
                                    <span className="text-4xs text-white/40 block">
                                      {p.team || "FA"}
                                    </span>
                                  </div>
                                  <span className={getPositionTagStyle(p.position)}>
                                    {p.position}
                                  </span>
                                </div>
                              ))}

                              {data.picks.map((pick, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="flex items-center justify-between p-2 bg-purple-500/5 rounded-lg border border-purple-500/10"
                                >
                                  <div>
                                    <span className="text-xs font-sans font-bold text-slate-200">
                                      {pick.season} Rd {pick.round} Draft Pick
                                    </span>
                                    <span className="text-4xs text-white/45 block">
                                      Original: {pick.originalOwnerTeam}
                                    </span>
                                  </div>
                                  <span className="bg-purple-950/40 text-purple-300 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-purple-500/25">
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
                </div>
              );
            }

            // 2. STANDARD TRANSACTION (Waiver, Free Agents, Commissioner) VISUALIZER
            const isWaiver = t.type === "waiver";
            const typeLabel = t.type === "waiver" ? "Waiver Claim" : t.type === "free_agent" ? "Free Agent Sign" : t.type.toUpperCase();
            const typeBadgeStyle = isWaiver
              ? "bg-emerald-500/15 text-emerald-300 border shadow-sm border-emerald-500/35"
              : "bg-blue-500/15 text-blue-300 border shadow-sm border-blue-500/35";

            // Identify the primary owner (typically waivers/FA adds only impact one primary roster)
            const mainOwnerName = t.richAdds[0]?.ownerName || t.richDrops[0]?.ownerName || `Roster ${t.roster_ids[0]}`;
            const mainTeamName = t.richAdds[0]?.teamName || t.richDrops[0]?.teamName || `Roster ${t.roster_ids[0]}`;
            const mainOwnerUserId = t.richAdds[0]?.userId || t.richDrops[0]?.userId || "";
            const mainTheme = getOwnerTheme(mainOwnerUserId || mainOwnerName);

            // Calculate FAAB bid if exists
            const bidAmount = t.waiver_budget?.length > 0 ? t.waiver_budget[0].amount : null;

            return (
              <div
                key={t.transaction_id}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-all shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                id={`tx-${t.transaction_id}`}
              >
                {/* Left Info Column: Manager Tag & Badge */}
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full bg-gradient-to-br ${mainTheme.avatarBg} border border-white/20`} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className={`text-xs font-sans font-extrabold ${mainTheme.text}`}>
                        {mainTeamName}
                      </h4>
                      <span className="text-[10px] text-white/30">•</span>
                      <span className={`text-[8px] tracking-wider uppercase font-mono font-black px-1.5 py-0.5 rounded ${typeBadgeStyle}`}>
                        {typeLabel}
                      </span>
                      {bidAmount !== null && (
                        <span className="text-[8px] font-mono bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                          <DollarSign size={8} />
                          {bidAmount} FAAB
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/40 font-sans block mt-0.5">
                      @{mainOwnerName} • Week {t.week}
                    </span>
                  </div>
                </div>

                {/* Center / Right Column: Adds & Drops comparison block */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 self-start md:self-auto w-full md:w-auto">
                  
                  {/* Add action */}
                  {t.richAdds.length > 0 && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                        <Plus size={12} />
                      </div>
                      <div>
                        {t.richAdds.map((add, addIdx) => (
                          <div key={addIdx} className="flex items-center gap-2">
                            <span className="text-xs font-sans font-bold text-slate-200">
                              {add.player.full_name}
                            </span>
                            <span className={getPositionTagStyle(add.player.position)}>
                              {add.player.position}
                            </span>
                            <span className="text-4xs text-white/30 font-mono">
                              {add.player.team || "FA"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flow Arrow */}
                  {t.richAdds.length > 0 && t.richDrops.length > 0 && (
                    <ArrowRight className="text-white/20 hidden md:block" size={14} />
                  )}

                  {/* Drop Action */}
                  {t.richDrops.length > 0 && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-sm">
                        <Minus size={12} />
                      </div>
                      <div>
                        {t.richDrops.map((drop, dropIdx) => (
                          <div key={dropIdx} className="flex items-center gap-2 opacity-65">
                            <span className="text-xs font-sans text-slate-300 line-through">
                              {drop.player.full_name}
                            </span>
                            <span className="bg-slate-800 text-slate-400 font-mono text-[9px] px-1 rounded [text-decoration:none]">
                              {drop.player.position}
                            </span>
                            <span className="text-4xs text-white/30 font-mono [text-decoration:none]">
                              {drop.player.team || "FA"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date Badge */}
                  <span className="text-[10px] font-mono text-white/30 flex items-center gap-1 border-t border-white/5 pt-2 md:pt-0 md:border-0 w-full md:w-auto text-left md:text-right">
                    <Calendar size={10} className="text-white/20" />
                    {dateStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
