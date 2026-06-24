import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw, Zap } from "lucide-react";

interface TrendingItem {
  player_id: string;
  count: number;
  player: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    position: string;
    team: string | null;
    age: number | null;
    years_exp: number | null;
  };
}

export default function TrendingTicker() {
  const [adds, setAdds] = useState<TrendingItem[]>([]);
  const [drops, setDrops] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"adds" | "drops">("adds");

  async function fetchTrending() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sleeper/trending?lookback_hours=24&limit=25");
      if (!res.ok) throw new Error("Could not load trending players");
      const data = await res.json();
      setAdds(data.adds || []);
      setDrops(data.drops || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrending();
  }, []);

  const activeList = type === "adds" ? adds : drops;

  return (
    <div className="w-full bg-[#0c0f0e]/95 border-b border-white/5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:h-10 pointer-events-auto relative z-30" id="trending-ticker-container">
      {/* Top Controls Row for Mobile, Left Panel for Desktop */}
      <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto h-9 sm:h-full px-3 sm:px-4 border-b sm:border-b-0 sm:border-r border-white/5 shrink-0 bg-[#0e0d0c] relative z-20" id="ticker-badge-panel">
        <div className="flex items-center gap-1.5">
          <Zap className="text-[#ba8659] animate-pulse" size={12} />
          <span className="text-[10px] font-sans font-extrabold tracking-wider uppercase text-slate-300 animate-pulse">NFL TRENDING</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Adds/Drops Filter Buttons */}
          <div className="flex items-center gap-0.5 p-0.5 bg-white/5 rounded-lg border border-white/10">
            <button
              onClick={() => setType("adds")}
              className={`px-2 py-0.5 rounded text-[9px] font-sans font-black uppercase transition-all cursor-pointer ${
                type === "adds"
                  ? "bg-[#ba8659]/20 text-[#ba8659] border border-[#ba8659]/30 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Adds
            </button>
            <button
              onClick={() => setType("drops")}
              className={`px-2 py-0.5 rounded text-[9px] font-sans font-black uppercase transition-all cursor-pointer ${
                type === "drops"
                  ? "bg-[#a27248]/20 text-[#cca57d] border border-[#a27248]/30 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Drops
            </button>
          </div>

          {/* Sync Button on Mobile inside this row */}
          <button 
            onClick={fetchTrending}
            disabled={loading}
            className="sm:hidden p-1 text-slate-400 hover:text-white transition-all rounded bg-white/5 border border-white/10 cursor-pointer disabled:opacity-50"
            title="Sync Live Transactions"
          >
            <RefreshCw size={10} className={loading ? "animate-spin text-[#ba8659]" : ""} />
          </button>
        </div>
      </div>

      {/* Ticker Content Section */}
      <div className="flex-1 overflow-hidden relative h-8 sm:h-full flex items-center select-none" id="ticker-scroll-track">
        {loading ? (
          <div className="flex items-center gap-2 pl-4 text-3xs font-mono text-white/45">
            <RefreshCw className="animate-spin text-[#ba8659]" size={11} />
            <span>Scanning transaction activity across Sleeper networks...</span>
          </div>
        ) : error ? (
          <span className="pl-4 text-3xs font-mono text-rose-400">Offline: {error}</span>
        ) : activeList.length === 0 ? (
          <span className="pl-4 text-3xs font-mono text-white/40">No major roster adjustments detected in last 24h</span>
        ) : (
          <div className="flex items-center gap-12 whitespace-nowrap animate-marquee h-full pl-4">
            {/* Displaying duplicated list to ensure contiguous loop */}
            {[...activeList, ...activeList].map((item, idx) => {
              const getPositionColor = (pos: string) => {
                switch (pos) {
                  case "QB": return "bg-[#ff007f]/10 text-[#ff007f] border-[#ff007f]/20";
                  case "RB": return "bg-[#00c176]/10 text-[#00c176] border-[#00c176]/20";
                  case "WR": return "bg-[#e2b13c]/10 text-[#e2b13c] border-[#e2b13c]/20";
                  case "TE": return "bg-[#f5a623]/10 text-[#f5a623] border-[#f5a623]/20";
                  default: return "bg-purple-500/10 text-purple-400 border-purple-500/20";
                }
              };
              return (
                <div key={`${item.player_id}-${idx}`} className="flex items-center gap-2 h-full py-1.5">
                  {/* Player Image Thumbnail */}
                  <div className="w-5 h-5 rounded-full bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    <img 
                      src={`https://sleepercdn.com/content/nfl/players/thumbs/${item.player_id}.jpg`}
                      alt={item.player.full_name}
                      className="w-full h-full object-cover scale-110 translate-y-0.5"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="text-[7px] font-sans font-bold text-white/40">
                      {item.player.full_name ? item.player.full_name.split(" ").map(n => n[0]).join("") : "U"}
                    </span>
                  </div>

                  {/* Player Stats Details */}
                  <span className="text-3xs font-sans font-bold text-slate-200">
                    {item.player.full_name}
                  </span>

                  <span className="text-[9px] font-mono text-white/40 shrink-0">
                    {item.player.team || "FA"}
                  </span>

                  <span className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded border ${getPositionColor(item.player.position)}`}>
                    {item.player.position}
                  </span>

                  {/* Roster Velocity Add/Drop volume level */}
                  <span className="flex items-center gap-0.5 text-[9px] font-mono font-bold ml-1">
                    {type === "adds" ? (
                      <TrendingUp className="text-[#00c176] shrink-0" size={10} />
                    ) : (
                      <TrendingDown className="text-rose-400 shrink-0" size={10} />
                    )}
                    <span className={type === "adds" ? "text-[#00c176]" : "text-rose-400"}>
                      +{item.count.toLocaleString()}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trigger Sync Data button (Desktop only) */}
      <button 
        onClick={fetchTrending}
        disabled={loading}
        className="hidden sm:flex px-3.5 border-l border-white/5 text-slate-400 hover:text-white transition-all h-full bg-[#0e0d0c] items-center justify-center cursor-pointer disabled:opacity-50 relative z-20"
        title="Sync Live Transactions"
        id="ticker-sync-btn"
      >
        <RefreshCw size={11} className={loading ? "animate-spin text-[#ba8659]" : ""} />
      </button>
    </div>
  );
}
