import React, { useState } from "react";
import { RichRoster, Player } from "../types";
import { Search, User2, Zap, Hourglass } from "lucide-react";
import { motion } from "motion/react";

// Deterministic performance trend generator to keep graphs stable and realistic per player
function getPlayerPerformanceTrend(playerId: string, position: string) {
  let hash = 0;
  const str = playerId || "unknown";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let base = 15;
  let variance = 8;
  if (position === "QB") { base = 18; variance = 10; }
  else if (position === "RB") { base = 10; variance = 12; }
  else if (position === "WR") { base = 9; variance = 11; }
  else if (position === "TE") { base = 6; variance = 8; }

  const scores: number[] = [];
  for (let w = 0; w < 4; w++) {
    const seed = Math.sin(hash + w) * 10000;
    const randomVal = seed - Math.floor(seed);
    const p = Math.round((base + randomVal * variance) * 10) / 10;
    scores.push(p);
  }
  
  return scores;
}

function PlayerSparkline({ playerId, position }: { playerId: string; position: string }) {
  const isKeyPosition = ["QB", "RB", "WR", "TE"].includes(position);
  if (!isKeyPosition) return null;

  const points = getPlayerPerformanceTrend(playerId, position);
  
  const max = Math.max(...points) || 1;
  const min = Math.min(...points) || 0;
  const range = max - min === 0 ? 1 : max - min;

  const width = 50;
  const height = 18;
  const paddingY = 2;
  const stepX = width / (points.length - 1);
  
  const coordinates = points.map((p, idx) => {
    const x = idx * stepX;
    const y = height - paddingY - ((p - min) / range) * (height - 2 * paddingY);
    return { x, y };
  });

  const linePath = coordinates.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;

  let strokeColor = "#a27248";
  let fillColor = "rgba(162, 114, 72, 0.12)";
  if (position === "QB") {
    strokeColor = "#ff007f";
    fillColor = "rgba(255, 0, 127, 0.08)";
  } else if (position === "RB") {
    strokeColor = "#00c176";
    fillColor = "rgba(0, 193, 118, 0.08)";
  } else if (position === "WR") {
    strokeColor = "#56b2e6";
    fillColor = "rgba(86, 178, 230, 0.08)";
  } else if (position === "TE") {
    strokeColor = "#f5a623";
    fillColor = "rgba(245, 166, 35, 0.08)";
  }

  const trendPct = ((points[3] - points[0]) / (points[0] || 1)) * 100;
  const isUp = trendPct >= 0;

  return (
    <div className="flex items-center gap-2 group/sparkline relative">
      <div className="w-12 h-4.5 relative flex items-center">
        <svg width={width} height={height} className="overflow-visible">
          <path d={areaPath} fill={fillColor} />
          <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          {coordinates.map((c, idx) => (
            <circle
              key={idx}
              cx={c.x}
              cy={c.y}
              r={idx === 3 ? "1.75" : "0.75"}
              fill={idx === 3 ? strokeColor : "#ffffff"}
              stroke={idx === 3 ? "#ffffff" : "none"}
              strokeWidth="0.5"
            />
          ))}
        </svg>
      </div>

      <div className="flex flex-col text-right select-none min-w-[34px] leading-none mb-0.5">
        <span className="text-[9px] font-mono font-bold text-slate-300">
          {points[3].toFixed(1)}
        </span>
        <span className={`text-[8px] font-mono font-medium ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isUp ? "↑" : "↓"}{Math.abs(trendPct).toFixed(0)}%
        </span>
      </div>

      <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/sparkline:block z-50 bg-[#121110]/95 border border-white/10 rounded-lg p-2 shadow-2xl backdrop-blur-md pointer-events-none min-w-[130px]">
        <div className="text-[8px] text-white/40 font-mono font-bold tracking-wider mb-1 uppercase text-left">
          {position} 4-Week FPTS
        </div>
        <div className="flex items-center justify-between gap-1">
          {points.map((p, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1">
              <span className="text-[7px] text-white/30 font-mono">W{idx + 1}</span>
              <span className="text-[9px] font-semibold font-mono text-slate-300 mt-0.5">{p.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface RosterViewProps {
  roster: RichRoster;
  rosterPositions: string[];
}

export default function RosterView({ roster, rosterPositions }: RosterViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPos, setSelectedPos] = useState<string>("ALL");

  // Helper: Get color classes by player position matching Sleeper's authentic solid designs
  const getPositionTag = (pos: string) => {
    switch (pos) {
      case "QB":
        return "bg-[#ff007f] text-white font-extrabold text-[10px] uppercase font-mono shadow-sm border border-pink-500/20";
      case "RB":
        return "bg-[#00c176] text-white font-extrabold text-[10px] uppercase font-mono shadow-sm border border-emerald-500/20";
      case "WR":
        return "bg-[#56b2e6] text-slate-900 font-black text-[10px] uppercase font-mono shadow-sm border border-blue-400/20";
      case "TE":
        return "bg-[#f5a623] text-white font-extrabold text-[10px] uppercase font-mono shadow-sm border border-amber-500/20";
      default:
        return "bg-purple-600 text-white font-extrabold text-[10px] uppercase font-mono shadow-sm border border-purple-500/20";
    }
  };

  // Helper: Display initials or fallback avatar when image is missing
  const PlayerAvatar = ({ player }: { player: Player }) => {
    const [imgErr, setImgErr] = useState(false);
    const initials = player.first_name[0] + (player.last_name[0] || "");
    const headshotUrl = `https://sleepercdn.com/content/uploads/thumbs/${player.id}.png`;

    if (imgErr || !player.id) {
      let bgGrad = "from-slate-800 to-slate-900 text-slate-400";
      if (player.position === "QB") bgGrad = "from-[#ff007f]/20 to-[#ff007f]/40 text-rose-200 border-[#ff007f]/30";
      else if (player.position === "RB") bgGrad = "from-[#00c176]/20 to-[#00c176]/40 text-emerald-200 border-[#00c176]/30";
      else if (player.position === "WR") bgGrad = "from-[#56b2e6]/20 to-[#56b2e6]/40 text-blue-200 border-[#56b2e6]/30";
      else if (player.position === "TE") bgGrad = "from-[#f5a623]/20 to-[#f5a623]/40 text-amber-200 border-[#f5a623]/30";

      return (
        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-br ${bgGrad} border`}>
          {initials}
        </div>
      );
    }

    return (
      <div className="w-11 h-11 rounded-full bg-slate-950 border border-slate-850 overflow-hidden relative">
        <img
          src={headshotUrl}
          alt={player.full_name}
          referrerPolicy="no-referrer"
          onError={() => setImgErr(true)}
          className="w-full h-full object-cover scale-110 translate-y-0.5"
        />
      </div>
    );
  };

  // Organize starters matching league roster positions (Starters only)
  // Usually rosterPositions has positions like ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'BN', 'BN'...]
  // We align starters with these positions in order
  const startersInOrder: { positionLabel: string; player: Player | null }[] = [];
  const startersPool = [...roster.starters];

  // Filters out BN positions for structural starters layout
  const starterPositionsOnly = rosterPositions.filter((pos) => pos !== "BN");

  starterPositionsOnly.forEach((posLabel) => {
    // Find first matching player of position in pool, or fallback for FLEX
    let playerIdx = -1;
    if (posLabel === "FLEX" || posLabel === "SUPER_FLEX") {
      playerIdx = startersPool.findIndex((p) => ["RB", "WR", "TE", "QB"].includes(p.position));
    } else {
      playerIdx = startersPool.findIndex((p) => p.position === posLabel);
    }

    if (playerIdx !== -1) {
      startersInOrder.push({
        positionLabel: posLabel,
        player: startersPool.splice(playerIdx, 1)[0]
      });
    } else {
      // No player found for slot
      startersInOrder.push({
        positionLabel: posLabel,
        player: null
      });
    }
  });

  // Remaining starters in pool (if any mismatch) appended as FLEX or generic
  startersPool.forEach((p) => {
    startersInOrder.push({
      positionLabel: p.position,
      player: p
    });
  });

  // Filter Bench players
  const filteredBench = roster.bench.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.team && p.team.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPos = selectedPos === "ALL" || p.position === selectedPos;
    return matchesSearch && matchesPos;
  });

  const positionsList = ["ALL", "QB", "RB", "WR", "TE"];

  return (
    <div className="space-y-8" id="roster-view-container">
      {/* Starting Lineup Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="roster-layouts">
        
        {/* Starters Lineup Card */}
        <div className="space-y-4" id="starters-lineup">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-sans font-semibold text-white/80 flex items-center gap-2">
              <Zap className="text-purple-400" size={18} />
              Starting Roster Lineup
            </h2>
            <span className="text-2xs font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40">
              {roster.starters.length} Active Slots
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-5 space-y-3.5 shadow-xl shadow-black/10">
            {startersInOrder.map((slot, index) => {
              const p = slot.player;
              const hasP = p !== null;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                    hasP 
                      ? "bg-white/2 border-white/5 hover:bg-white/5" 
                      : "bg-white/1 border-white/5 border-dashed"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Position Label Display */}
                    <span className="w-14 text-center text-[10px] font-mono font-black tracking-widest px-2 py-1 rounded bg-white/5 text-white/70 uppercase border border-white/5">
                      {slot.positionLabel === "SUPER_FLEX" ? "SF" : slot.positionLabel}
                    </span>

                    {hasP ? (
                      <div className="flex items-center gap-3">
                        <PlayerAvatar player={p} />
                        <div>
                          <p className="text-sm font-sans font-semibold text-slate-200">{p.full_name}</p>
                          <div className="flex items-center gap-2 text-2xs text-white/40 font-sans mt-0.5">
                            <span className="font-semibold text-slate-300">{p.team || "FA"}</span>
                            <span>•</span>
                            <span>Age {p.age || "N/A"}</span>
                            <span>•</span>
                            <span>{p.years_exp ? `${p.years_exp} Yrs Exp` : "Rookie"}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs font-mono text-white/30 italic">Unfilled Slot</p>
                    )}
                  </div>

                  {hasP && (
                    <div className="flex items-center gap-3">
                      <PlayerSparkline playerId={p.id} position={p.position} />
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${getPositionTag(p.position)}`}>
                        {p.position}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bench & Depth Chart Card */}
        <div className="space-y-4" id="bench-lineup">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-lg font-sans font-semibold text-white/80 flex items-center gap-2">
              <Hourglass className="text-purple-400" size={18} />
              Bench & Depth Chart
            </h2>
            
            <span className="text-2xs font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 place-self-start md:place-self-auto">
              Total depth: {roster.bench.length} Players
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-5 shadow-xl shadow-black/10">
            {/* Search and Filters bar */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-white/30" size={16} />
                <input
                  type="text"
                  placeholder="Search player name or team..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 font-sans transition-all"
                />
              </div>

              {/* Pos Filter Buttons */}
              <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                {positionsList.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setSelectedPos(pos)}
                    className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                      selectedPos === pos
                        ? "bg-white/15 border border-white/10 text-white shadow-md magnet-glow"
                        : "text-white/40 hover:text-white/80 hover:bg-white/5"
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Bench Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[640px] overflow-y-auto pr-1">
              {filteredBench.length > 0 ? (
                filteredBench.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center p-3 rounded-xl bg-white/2 border border-white/5 hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <PlayerAvatar player={p} />
                      <div>
                        <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px] md:max-w-[140px]">{p.full_name}</p>
                        <p className="text-[10px] text-white/40 font-mono mt-0.5">
                          <span className="font-bold text-white/65">{p.team || "FA"}</span>
                          {" • "}
                          <span>Age {p.age || "N/A"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <PlayerSparkline playerId={p.id} position={p.position} />
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${getPositionTag(p.position)}`}>
                        {p.position}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-1 md:col-span-2 text-center py-10">
                  <p className="text-xs font-sans text-white/30">No bench players match current criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
