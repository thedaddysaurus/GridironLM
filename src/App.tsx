import React, { useState, useEffect } from "react";
import { SleeperUser, LeagueDetails } from "./types";
import LeaguesOverview from "./components/LeaguesOverview";
import RosterView from "./components/RosterView";
import StandingsView from "./components/StandingsView";
import MatchupsView from "./components/MatchupsView";
import HistoryView from "./components/HistoryView";
import TransactionsView from "./components/TransactionsView";
import GridironLogo from "./components/GridironLogo";
import TrendingTicker from "./components/TrendingTicker";
import { 
  Terminal, 
  Search, 
  Trophy, 
  Users, 
  Compass, 
  User2, 
  TrendingUp, 
  Activity, 
  MessageCircleCode, 
  RefreshCw,
  Zap,
  Globe,
  History,
  ChevronDown,
  Calendar,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Main States (defaulting to empty or loaded from localStorage)
  const [usernameInput, setUsernameInput] = useState(() => localStorage.getItem("sleeper_username") || "");
  const [activeUsername, setActiveUsername] = useState(() => localStorage.getItem("sleeper_username") || "");
  const [user, setUser] = useState<SleeperUser | null>(null);
  const [leagues, setLeagues] = useState<LeagueDetails[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasEnteredDashboard, setHasEnteredDashboard] = useState(false);
  
  // Loading progression states
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  
  // Progressive loading progress stats
  const [totalLeaguesToLoad, setTotalLeaguesToLoad] = useState(0);
  const [loadedLeaguesCount, setLoadedLeaguesCount] = useState(0);
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);
  
  // Cache check state
  const [cacheStatus, setCacheStatus] = useState(() => {
    try {
      const saved = localStorage.getItem("gridiron_cache_status");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && typeof parsed.playerCount === "number") {
          return parsed;
        }
      }
    } catch (e) {}
    return { loaded: false, error: "", playerCount: 0 };
  });
  
  // Navigation Tabs: "overview" or the leagueId of the active franchise
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Sub-tabs for specific league homepages: "roster" | "matchup" | "standings" | "ai" | "history" | "trades" | "transactions"
  const [activeSubTab, setActiveSubTab] = useState<"roster" | "matchup" | "standings" | "ai" | "history" | "trades" | "transactions">("roster");
  const [subTabDropdownOpen, setSubTabDropdownOpen] = useState(false);
  const [leaguesDropdownOpen, setLeaguesDropdownOpen] = useState(false);

  // Force dark mode exclusively per user request to scrap light mode
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
    localStorage.setItem("gridiron_theme", "dark");
  }, []);

  // 1. Check Sleeper players caching status from server
  async function checkCacheStatus() {
    try {
      const res = await fetch("/api/players/status");
      if (res.ok) {
        const status = await res.json();
        setCacheStatus(status);
        try {
          localStorage.setItem("gridiron_cache_status", JSON.stringify(status));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Failed checking players cache status", err);
    }
  }

  // Periodic polling for player cache until ready
  useEffect(() => {
    checkCacheStatus();
    const interval = setInterval(() => {
      if (!cacheStatus.loaded) {
        checkCacheStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [cacheStatus.loaded]);

  // 2. Fetch user and their subsequent leagues with Stale-While-Revalidate caching
  async function loadDynastyHub(targetUsername: string, isRevalidation: boolean = false) {
    if (!isRevalidation) {
      setLoadingUser(true);
      setError(null);
      setLeagues([]);
      setTotalLeaguesToLoad(0);
      setLoadedLeaguesCount(0);
      setIsProgressiveLoading(false);
    } else {
      setIsProgressiveLoading(true);
    }
    setActiveTab("overview");

    try {
      // Step A: Search Username
      const userRes = await fetch(`/api/sleeper/user/${encodeURIComponent(targetUsername)}`);
      if (!userRes.ok) {
        if (userRes.status === 404) {
          throw new Error(`Sleeper user "${targetUsername}" not found. Try entering another username.`);
        }
        throw new Error("Failed connecting to Sleeper API. Verify network status.");
      }
      
      const userData: SleeperUser = await userRes.json();
      setUser(userData);
      setActiveUsername(targetUsername);
      
      // Persist successful username data and user record
      localStorage.setItem("sleeper_username", targetUsername);
      localStorage.setItem("sleeper_cached_user", JSON.stringify(userData));

      // Step B: Fetch leagues list (usually under 200ms)
      if (!isRevalidation) {
        setLoadingLeagues(true);
      }
      const leaguesRes = await fetch(`/api/sleeper/leagues/${userData.user_id}`);
      if (!leaguesRes.ok) {
        throw new Error("Failed fetching leagues from Sleeper databank.");
      }
      const rawLeagues: any[] = await leaguesRes.json();
      setLoadingLeagues(false);

      if (!Array.isArray(rawLeagues) || rawLeagues.length === 0) {
        setLeagues([]);
        localStorage.removeItem("sleeper_cached_leagues");
        return;
      }

      setTotalLeaguesToLoad(rawLeagues.length);
      setIsProgressiveLoading(true);

      // Step C: Fetch detailed details for each league progressively in background
      let loadedCount = 0;
      const loadedDetailList: LeagueDetails[] = [];
      const detailPromises = rawLeagues.map(async (leg) => {
        try {
          const detailRes = await fetch(`/api/sleeper/league/${leg.league_id}?userId=${userData.user_id}`);
          if (detailRes.ok) {
            const detail: LeagueDetails = await detailRes.json();
            if (detail && detail.status !== "complete" && detail.status !== "closed") {
              loadedDetailList.push(detail);
              setLeagues((prev) => {
                const filtered = prev.filter((p) => p.leagueId !== detail.leagueId);
                return [...filtered, detail];
              });
            }
          }
        } catch (err) {
          console.error(`Failed loading league details for ${leg.league_id}`, err);
        } finally {
          loadedCount++;
          setLoadedLeaguesCount(loadedCount);
        }
      });

      // Wait for all to complete
      await Promise.all(detailPromises);
      if (loadedDetailList.length > 0) {
        localStorage.setItem("sleeper_cached_leagues", JSON.stringify(loadedDetailList));
      }
      setIsProgressiveLoading(false);

    } catch (err: any) {
      if (!isRevalidation) {
        setError(err.message || "Failed initializing Dynasty Hub.");
      }
      setLoadingLeagues(false);
    } finally {
      setLoadingUser(false);
    }
  }

  // Initial load: Only load if we have a saved user in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sleeper_username");
    if (saved) {
      const cachedUser = localStorage.getItem("sleeper_cached_user");
      const cachedLeagues = localStorage.getItem("sleeper_cached_leagues");
      
      if (cachedUser && cachedLeagues) {
        try {
          setUser(JSON.parse(cachedUser));
          setLeagues(JSON.parse(cachedLeagues));
          setActiveUsername(saved);
          // We hold in landing page mode so initial load is literally instant other than rendering.
          // Once they click "Enter Playbook", we show the full dashboard and trigger revalidation.
        } catch (e) {
          console.warn("Cached data was invalid or cleared", e);
        }
      }
    }
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (usernameInput.trim()) {
      setHasEnteredDashboard(true);
      loadDynastyHub(usernameInput.trim());
    }
  }

  // Find active league data
  const currentSelectedLeague = leagues.find((l) => l.leagueId === activeTab);

  return (
    <div className="min-h-screen vintage-playbook-grid text-slate-800 dark:text-slate-100 flex flex-col relative overflow-hidden selection:bg-[#ba8659]/30 selection:text-amber-100">
      
      {/* Playbook Tactile Ambient Light Layer */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#ba8659]/40 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#a27248]/30 rounded-full blur-[160px]"></div>
        <div className="absolute top-[35%] right-[15%] w-[35%] h-[35%] bg-slate-800/60 rounded-full blur-[140px]"></div>
      </div>

      {/* Upper Players cache header banner */}
      {!cacheStatus.loaded && (
        <div className="bg-[#0c0f0e]/90 backdrop-blur-md border-b border-white/5 px-4 py-2 flex items-center justify-between text-xs text-slate-300 font-mono relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ba8659] animate-pulse"></span>
            <span className="font-typewriter text-[11px] text-slate-300">SYSTEM: Indexing active Sleeper NFL depth charts... ({cacheStatus.playerCount} parsed)</span>
          </div>
          <span className="text-[10px] font-mono text-white/40 tracking-wider">ROSTERS ONLINE • COMPILING CHANNELS</span>
        </div>
      )}

      {/* Global Application Header */}
      <header className="border-b border-white/5 bg-[#0a0d0c]/85 backdrop-blur-xl sticky top-0 z-55 px-4 md:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 relative">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3.5 cursor-pointer select-none relative z-10 group/logo-nav" onClick={() => setActiveTab("overview")}>
          <div className="transition-transform duration-300 group-hover/logo-nav:scale-105 active:scale-95 flex items-center justify-center">
            <GridironLogo size={36} />
          </div>
          <div>
            <h1 className="text-xl font-athletic tracking-widest text-[#fcf9f5] uppercase flex items-center gap-1.5">
              GRIDIRON<span className="text-[#ba8659]" style={{ textShadow: "0 0 10px rgba(186,134,89,0.2)" }}>LM</span>
              <sup className="text-[8px] font-sans font-black tracking-normal text-[#ba8659] bg-[#ba8659]/10 px-1 py-0.5 rounded border border-[#ba8659]/20 self-start mt-0.5">BETA</sup>
            </h1>
            <p className="text-[10px] text-[#ba8659]/85 font-sans font-medium tracking-wide">Our pigskin intelligence is artificial.</p>
          </div>
        </div>

        {/* Sleeper user Search form and indicators */}
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto relative z-10">
          
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full md:w-64">
            <Search className="absolute left-3 text-white/30" size={14} />
            <input
              type="text"
              placeholder="Sleeper Username..."
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-20 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#ba8659]/60 focus:bg-black/60 transition-all font-sans shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1 text-[9px] bg-[#ba8659]/90 hover:bg-[#a27248] font-athletic tracking-widest uppercase rounded text-white shadow-md cursor-pointer transition-all hover:scale-102 active:scale-98"
            >
              Search
            </button>
          </form>

          {/* Sync badge info with Sleeper avatar integration */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-2.5 font-mono text-3xs border border-[#ba8659]/20 rounded-lg bg-[#0e1110] px-3 py-2 text-white/60 shadow-sm h-8">
              {user?.avatar ? (
                <img 
                  src={`https://sleepercdn.com/avatars/thumbs/${user.avatar}`} 
                  alt={activeUsername} 
                  className="w-4 h-4 rounded-full object-cover border border-white/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Globe size={11} className="text-emerald-400 animate-pulse" />
              )}
              <span>Synced: <strong className="text-purple-300">@{activeUsername}</strong></span>
            </div>

            {user && (
              <button
                onClick={() => {
                  setUser(null);
                  setUsernameInput("");
                  setActiveUsername("");
                  setLeagues([]);
                  setHasEnteredDashboard(false);
                  localStorage.removeItem("sleeper_username");
                  localStorage.removeItem("sleeper_cached_user");
                  localStorage.removeItem("sleeper_cached_leagues");
                  setActiveTab("overview");
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-900/40 bg-red-950/20 hover:bg-red-950/55 hover:border-red-700/60 text-red-400 hover:text-red-200 transition-all cursor-pointer shadow-sm select-none"
                title="Clear Active User"
              >
                <LogOut size={11} />
              </button>
            )}
          </div>
        </div>

      </header>

      {/* Global Trending Players Ticker Row */}
      <TrendingTicker />

      {/* Main Container screen slots */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 relative z-10">
        
        {/* Loading Overlay */}
        {(loadingUser || loadingLeagues) ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <div className="p-4 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <RefreshCw className="animate-spin text-purple-400" size={26} />
            </div>
            <div className="space-y-1">
              <p className="text-md font-sans font-semibold text-slate-200">Querying Sleeper API Matrix...</p>
              <p className="text-xs text-slate-500 font-sans max-w-sm">Aggregating roster standings and game schedules for {activeUsername || "Sleeper User"}</p>
            </div>
          </div>
        ) : (!user || !hasEnteredDashboard) ? (
          /* IMPRESSIVE WELCOME LANDING SCREEN & PORTAL */
          <div className="max-w-4xl mx-auto py-8 px-4 space-y-10">

            <div className="text-center space-y-4">
              <div className="flex justify-center mb-2">
                <div className="relative group/logo-hero inline-flex items-center justify-center transition-transform duration-500 hover:scale-110 active:scale-95">
                  {/* Stable CSS outer glow that never triggers SVG filter rendering bugs */}
                  <div className="absolute inset-x-2 inset-y-2 bg-[#ba8659]/20 rounded-full blur-2xl opacity-60 group-hover/logo-hero:opacity-90 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <GridironLogo size={90} />
                  </div>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#ba8659]/10 border border-[#ba8659]/20 text-[#ba8659] text-[11px] font-sans font-medium tracking-wide">
                <Zap size={11} className="animate-pulse text-[#ba8659]" />
                Our pigskin intelligence is artificial.
              </div>
              <h2 className="text-4xl md:text-5xl font-athletic tracking-widest text-[#fcf9f5] uppercase" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                Unlock Your Gridiron Empire
              </h2>
              <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto font-sans leading-relaxed">
                GRIDIRONLM parses your total Sleeper League history, active rosters, custom ratings, and weekly matchups. Built directly on live Sleeper API query layers.
              </p>
            </div>

            {/* Check if we have a saved playbook session */}
            {user ? (
              /* DETAILED SESSION RETURNING HERO CARD */
              <div className="bg-gradient-to-br from-black/80 to-[#121614]/85 border border-[#ba8659]/40 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#ba8659]/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-8 space-y-4 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      {user.avatar ? (
                        <img 
                          src={`https://sleepercdn.com/avatars/thumbs/${user.avatar}`} 
                          alt={activeUsername} 
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#ba8659] shadow-lg shadow-black/50"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-[#ba8659]/20 border-2 border-[#ba8659] flex items-center justify-center text-xl font-bold text-[#ba8659]">
                          {activeUsername.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="inline-block px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-3xs font-mono tracking-widest uppercase mb-1">
                          Playbook Synced & Cached
                        </div>
                        <h3 className="text-2xl font-athletic tracking-wider text-[#fcf9f5] uppercase">
                          @{activeUsername}
                        </h3>
                        <p className="text-xs text-slate-400 font-sans mt-0.5">
                          Detected {leagues.length || 0} active, fully compiled dynasty franchises.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 font-sans leading-normal">
                      GRIDIRONLM is warmed up. Click entering your playbook to restore active rosters, matchups, and lifetime ledger rolling calculations instantly without redundant API loads.
                    </p>
                  </div>

                  <div className="md:col-span-4 flex flex-col gap-3">
                    <button
                      onClick={() => {
                        setHasEnteredDashboard(true);
                        // Trigger background revalidation check silently in the background
                        loadDynastyHub(activeUsername, true);
                      }}
                      className="w-full py-4 bg-[#ba8659] hover:bg-[#a27248] text-xs font-athletic tracking-widest uppercase rounded-xl text-white shadow-xl transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 border border-white/10"
                    >
                      <Zap size={14} className="fill-white" />
                      Enter Playbook
                    </button>
                    
                    <button
                      onClick={() => {
                        setUser(null);
                        setLeagues([]);
                        setUsernameInput("");
                        setActiveUsername("");
                        setHasEnteredDashboard(false);
                        localStorage.removeItem("sleeper_username");
                        localStorage.removeItem("sleeper_cached_user");
                        localStorage.removeItem("sleeper_cached_leagues");
                      }}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono tracking-widest uppercase rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      Sync Another Account
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* STANDARD SYNC ENTRY CARD (No Cache) */
              <div className="bg-black/60 border border-[#ba8659]/20 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ba8659]/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="space-y-6">
                  <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-lg font-playbook font-bold text-[#fcf9f5] flex items-center justify-center md:justify-start gap-2.5">
                      <Search size={18} className="text-[#ba8659]" />
                      Enter Username to Sync
                    </h3>
                    <p className="text-xs text-slate-400 font-sans">
                      We'll fetch your active dynasty rosters, compile historical cross-league rollup statistics, and prepare live multi-season analytics.
                    </p>
                  </div>

                  <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <User2 className="absolute left-4 top-3.5 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Your Sleeper Username..."
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#ba8659] focus:ring-1 focus:ring-[#ba8659]/30 shadow-inner"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-3 bg-[#ba8659] hover:bg-[#a27248] text-sm font-athletic tracking-widest uppercase rounded-lg text-white shadow-lg transition-all hover:scale-102 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} />
                      Get Started
                    </button>
                  </form>

                  <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-[9px] text-slate-500 font-mono flex items-center gap-2 tracking-wider">
                      <Globe size={11} className="text-emerald-500" />
                      SECURE DATA LINK • REAL-TIME SLEEPER DATABASE API
                    </div>
                    
                    {/* Demo/Preview Trigger */}
                    <button
                      onClick={() => {
                        setUsernameInput("SleeperDemo");
                        setHasEnteredDashboard(true);
                        loadDynastyHub("SleeperDemo");
                      }}
                      className="text-[10.5px] text-[#ba8659] hover:text-amber-200 font-typewriter transition-colors flex items-center gap-1.5 bg-[#ba8659]/5 border border-[#ba8659]/15 rounded-md px-3.5 py-1.5 cursor-pointer"
                    >
                      <span>Browse Demo Account (@SleeperDemo)</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="p-5 bg-black/40 border-2 border-dashed border-[#ba8659]/20 rounded-xl space-y-3">
                <div className="p-2 w-8 h-8 rounded bg-[#ba8659]/10 text-[#ba8659] flex items-center justify-center">
                  <History size={16} />
                </div>
                <h4 className="text-xs font-playbook font-bold text-[#fcf9f5] uppercase tracking-wider">Lifetime Ledger Rollup</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  Deep indexes multiple seasons to compile structural win/loss records and cumulative scores.
                </p>
              </div>

              <div className="p-5 bg-black/40 border-2 border-dashed border-[#ba8659]/20 rounded-xl space-y-3">
                <div className="p-2 w-8 h-8 rounded bg-[#ba8659]/10 text-[#ba8659] flex items-center justify-center">
                  <Trophy size={16} />
                </div>
                <h4 className="text-xs font-playbook font-bold text-[#fcf9f5] uppercase tracking-wider">Interactive Sub-Tabs</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  Real-time rosters, points-scored, and weekly head-to-head match-up scores mapped seamlessly.
                </p>
              </div>

              <div className="p-5 bg-black/40 border-2 border-dashed border-[#ba8659]/20 rounded-xl space-y-3">
                <div className="p-2 w-8 h-8 rounded bg-[#ba8659]/10 text-[#ba8659] flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
                <h4 className="text-xs font-playbook font-bold text-[#fcf9f5] uppercase tracking-wider">Active Matchup Tracking</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  Analyze head-to-head match-up scores, bench support, and starting roster lineups on an active week-by-week basis.
                </p>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl max-w-xl mx-auto text-center space-y-4 shadow-lg shadow-black/25">
            <h3 className="text-md font-sans font-bold text-rose-400">Search/Retrieval Failure</h3>
            <p className="text-xs text-white/60 font-sans leading-relaxed">{error}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setError(null);
                  setUser(null);
                  setUsernameInput("");
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-2xs text-white cursor-pointer shadow-md transition-all"
              >
                Go Back
              </button>
              <button
                onClick={() => loadDynastyHub("SleeperDemo")}
                className="px-4 py-1.5 bg-[#ba8659]/90 hover:bg-[#a27248] border border-[#ba8659]/30 rounded text-2xs text-white font-athletic tracking-widest uppercase cursor-pointer shadow-md transition-all"
              >
                Explore Demo (SleeperDemo)
              </button>
            </div>
          </div>
        ) : (leagues.length === 0 && isProgressiveLoading) ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <div className="p-4 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <RefreshCw className="animate-spin text-[#ba8659]" size={26} />
            </div>
            <div className="space-y-1">
              <p className="text-md font-sans font-semibold text-slate-200">Retrieving Dynasty Leagues...</p>
              <p className="text-xs text-slate-500 font-sans max-w-sm">Loaded {loadedLeaguesCount} of {totalLeaguesToLoad} leagues</p>
            </div>
          </div>
        ) : leagues.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-sm font-sans text-slate-400">No active dynasty rosters found for user <strong className="text-[#ba8659] font-typewriter">@{activeUsername}</strong> on Sleeper.</p>
            <p className="text-2xs text-slate-500 max-w-xs mx-auto">Verify on Sleeper that this username has active dynasty franchises set up under NFL.</p>
            <button
              onClick={() => {
                setUser(null);
                setUsernameInput("");
                localStorage.removeItem("sleeper_username");
              }}
              className="mt-4 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-2xs text-slate-400 cursor-pointer shadow-md transition-all"
            >
              Reset / Try Different Account
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Tab Navigation header bar (Multi-tab layout) */}
            <div className="flex items-center gap-1.5 border-b border-white/10 pb-px overflow-visible" id="dynasty-tab-rail">
              
              {/* Main Summary hub tab */}
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-3 text-xs font-playbook font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer rounded-t-md ${
                  activeTab === "overview"
                    ? "border-b-[#ba8659] text-white bg-[#ba8659]/10"
                    : "border-b-transparent text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Compass size={14} />
                Overview Hub
              </button>

              {/* Dynasty Leagues Dropdown */}
              <div className="relative z-40">
                <button
                  type="button"
                  onClick={() => setLeaguesDropdownOpen(!leaguesDropdownOpen)}
                  className={`px-4 py-3 text-xs font-playbook font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer rounded-t-md whitespace-nowrap ${
                    activeTab !== "overview"
                      ? "border-b-[#ba8659] text-white bg-[#ba8659]/10"
                      : "border-b-transparent text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Activity size={13} className={activeTab !== "overview" ? "text-[#ba8659]" : "text-white/50"} />
                  <span>
                    {activeTab !== "overview" 
                      ? leagues.find((l) => l.leagueId === activeTab)?.name || "Select League"
                      : "Select League"}
                  </span>
                  <ChevronDown 
                    size={13} 
                    className={`transition-all duration-200 ${leaguesDropdownOpen ? "rotate-180 text-[#ba8659]" : "text-white/40"}`} 
                  />
                </button>

                {/* Popover Menu list absolute overlay */}
                {leaguesDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setLeaguesDropdownOpen(false)} 
                    />
                    <div className="absolute left-0 mt-1.5 w-72 md:w-80 bg-[#0a0d0c] border border-[#ba8659]/30 rounded-xl p-1.5 shadow-2xl shadow-black/80 z-50 backdrop-blur-xl max-h-96 overflow-y-auto scrollbar-thin">
                      {leagues.length === 0 ? (
                        <div className="px-4 py-3 text-3xs font-mono text-zinc-500 text-center uppercase">
                          No active leagues synced
                        </div>
                      ) : (
                        leagues.map((leg) => {
                          const isSelected = activeTab === leg.leagueId;
                          return (
                            <button
                              key={leg.leagueId}
                              onClick={() => {
                                setActiveTab(leg.leagueId);
                                setActiveSubTab("roster");
                                setLeaguesDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-2xs font-sans font-black uppercase tracking-wider transition-all flex items-center justify-between gap-3 ${
                                isSelected
                                  ? "bg-[#ba8659]/20 text-white border border-[#ba8659]/30 font-bold"
                                  : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                              }`}
                            >
                              <span className="truncate">{leg.name}</span>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#ba8659]" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Syncing Badge */}
              {isProgressiveLoading && (
                <div className="ml-auto mr-1 flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-950/20 border border-amber-900/40 text-[10px] text-amber-300 font-mono animate-pulse whitespace-nowrap select-none">
                  <RefreshCw size={10} className="animate-spin" />
                  <span>SYNCING: {loadedLeaguesCount}/{totalLeaguesToLoad} LEAGUES</span>
                </div>
              )}

            </div>

            {/* Tab Panels Contents */}
            <div className="pt-2">
              <AnimatePresence mode="wait">
                {activeTab === "overview" ? (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LeaguesOverview 
                      leagues={leagues} 
                      user={user}
                      username={activeUsername} 
                      onSelectLeague={(id) => {
                        setActiveTab(id);
                        setActiveSubTab("roster");
                      }}
                    />
                  </motion.div>
                ) : (
                  currentSelectedLeague && (
                    <motion.div
                      key={currentSelectedLeague.leagueId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Franchise Homepage Header Card */}
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl shadow-black/10">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-sans font-extrabold text-slate-100">
                              {currentSelectedLeague.name}
                            </h2>
                            <span className="text-3xs font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60 uppercase tracking-wider">
                              NFL {currentSelectedLeague.season} Status: {
                                (() => {
                                  const s = (currentSelectedLeague.status || "").toUpperCase();
                                  if (s === "IN_SEASON" || s === "IN-SEASON") return "In-Season";
                                  if (s === "PRE_SEASON" || s === "PRE-SEASON") return "Pre-Season";
                                  if (s === "POST_SEASON" || s === "POST-SEASON") return "Post-Season";
                                  if (s === "OFF_SEASON" || s === "OFF-SEASON") return "Off-Season";
                                  return currentSelectedLeague.status;
                                })()
                              }
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 font-sans mt-1">
                            Team: <strong className="text-slate-300">{currentSelectedLeague.userRoster?.ownerDetails.team_name}</strong>
                          </p>
                        </div>

                        {/* Record overview */}
                        <div className="text-left md:text-right">
                          <p className="text-3xs font-mono uppercase tracking-wider text-white/40">Franchise Record</p>
                          <h3 className="text-xl font-mono font-bold text-slate-200 mt-0.5 text-purple-300">
                            {currentSelectedLeague.userRoster?.settings.wins || 0}-{currentSelectedLeague.userRoster?.settings.losses || 0}-{currentSelectedLeague.userRoster?.settings.ties || 0}
                          </h3>
                        </div>
                      </div>

                      {/* Leagues-specific Analytics Stats Grid */}
                      {(() => {
                        // 1. Roster Average Age Profiles
                        let currentRosterAvgAge = 0;
                        let leagueAgeSum = 0;
                        let leagueAgeCount = 0;
                        if (currentSelectedLeague.userRoster) {
                          currentSelectedLeague.userRoster.players.forEach((p) => {
                            if (typeof p.age === "number" && p.age > 0) {
                              leagueAgeSum += p.age;
                              leagueAgeCount++;
                            }
                          });
                        }
                        currentRosterAvgAge = leagueAgeCount > 0 ? (leagueAgeSum / leagueAgeCount) : 0;

                        // 2. Standing Standings Rank
                        const userRosterIdNum = currentSelectedLeague.userRoster?.roster_id;
                        const standingIndexRank = currentSelectedLeague.standings.findIndex(r => r.roster_id === userRosterIdNum);
                        const standingPos = standingIndexRank !== -1 ? standingIndexRank + 1 : "—";
                        const totalStandingsTeams = currentSelectedLeague.standings.length || 12;

                        // 3. Points For Ranks
                        const sortedPfStandings = [...currentSelectedLeague.standings].sort((a, b) => {
                          const pfA = (a.settings.fpts || 0) + (a.settings.fpts_decimal || 0) * 0.01;
                          const pfB = (b.settings.fpts || 0) + (b.settings.fpts_decimal || 0) * 0.01;
                          return pfB - pfA;
                        });
                        const pfRankInLeague = userRosterIdNum ? sortedPfStandings.findIndex(r => r.roster_id === userRosterIdNum) + 1 : "—";
                        const totalPointsFor = (currentSelectedLeague.userRoster?.settings.fpts || 0) + (currentSelectedLeague.userRoster?.settings.fpts_decimal || 0) * 0.01;

                        // 4. Points Against Ranks
                        const sortedPaStandings = [...currentSelectedLeague.standings].sort((a, b) => {
                          const paA = (a.settings.fpts_against || 0) + (a.settings.fpts_against_decimal || 0) * 0.01;
                          const paB = (b.settings.fpts_against || 0) + (b.settings.fpts_against_decimal || 0) * 0.01;
                          return paB - paA;
                        });
                        const paRankInLeague = userRosterIdNum ? sortedPaStandings.findIndex(r => r.roster_id === userRosterIdNum) + 1 : "—";
                        const totalPointsAgainst = (currentSelectedLeague.userRoster?.settings.fpts_against || 0) + (currentSelectedLeague.userRoster?.settings.fpts_against_decimal || 0) * 0.01;

                        return (
                          <>
                            {/* Leagues-specific Analytics Stats Grid (for advanced league details) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="league-specific-metrics">
                              {/* Standing rank card */}
                              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                                <div className="space-y-1">
                                  <p className="text-4xs font-mono uppercase tracking-wider text-white/40">Current Standings</p>
                                  <h4 className="text-lg font-mono font-bold text-slate-100">
                                    Rank #{standingPos} <span className="text-3xs font-sans text-white/40">of {totalStandingsTeams}</span>
                                  </h4>
                                  <p className="text-4xs text-[#ba8659] font-sans font-bold">
                                    {standingPos === 1 ? "🏆 Crown Leader" : standingPos <= 4 ? "⚡ Playoff Seed Bound" : "⏳ Contender Bubble"}
                                  </p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                                  <Trophy size={15} />
                                </div>
                              </div>

                              {/* Roster Average Age card */}
                              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                                <div className="space-y-1">
                                  <p className="text-4xs font-mono uppercase tracking-wider text-white/40">Squad Age Profile</p>
                                  <h4 className="text-lg font-mono font-bold text-slate-100">
                                    {currentRosterAvgAge > 0 ? `${currentRosterAvgAge.toFixed(1)} yr` : "—"}
                                  </h4>
                                  <p className="text-4xs text-purple-400 font-sans font-bold">
                                    {currentRosterAvgAge > 0 
                                      ? (currentRosterAvgAge < 24.5 ? "🌱 Rebuild / Youth Mode" : currentRosterAvgAge <= 27 ? "⚡ Active Prime Contender" : "👴 Peak Veteran Window")
                                      : "No roster players"}
                                  </p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                                  <Calendar size={15} />
                                </div>
                              </div>

                              {/* PF Rank (Points For) card */}
                              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                                <div className="space-y-1">
                                  <p className="text-4xs font-mono uppercase tracking-wider text-white/40">Offensive Output (PF)</p>
                                  <h4 className="text-lg font-mono font-bold text-slate-100">
                                    {totalPointsFor.toFixed(1)} <span className="text-4xs font-sans text-white/40">Rank #{pfRankInLeague}</span>
                                  </h4>
                                  <p className="text-4xs text-emerald-400 font-sans font-bold">
                                    {pfRankInLeague === 1 ? "🔥 Most Explosive Offense" : (typeof pfRankInLeague === "number" && pfRankInLeague <= 4) ? "📈 Premium Scoring" : "📉 Offense Needs Work"}
                                  </p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                                  <TrendingUp size={15} />
                                </div>
                              </div>

                              {/* PA Rank / Strength of Schedule card */}
                              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                                <div className="space-y-1">
                                  <p className="text-4xs font-mono uppercase tracking-wider text-white/40">Opponent Schedule (PA)</p>
                                  <h4 className="text-lg font-mono font-bold text-slate-100">
                                    {totalPointsAgainst.toFixed(1)} <span className="text-4xs font-sans text-white/40">Rank #{paRankInLeague}</span>
                                  </h4>
                                  <p className="text-4xs text-purple-400 font-sans font-bold">
                                    {(typeof paRankInLeague === "number" && paRankInLeague <= 3) ? "🎯 Toughest Opponents" : (typeof paRankInLeague === "number" && paRankInLeague >= 10) ? "🍀 Lucky Easy Matchups" : "⚖️ Moderate Opponent Luck"}
                                  </p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                                  <Activity size={15} />
                                </div>
                              </div>
                            </div>

                            {/* Dropdown Menu Sector - Clean and streamlined to avoid tab clutter */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0c0f0e]/60 border border-purple-500/20 rounded-2xl p-5 relative z-20">
                              <div className="space-y-0.5">
                                <h3 className="text-xs font-sans font-bold text-[#fcf9f5] uppercase tracking-wider">Franchise Data Vault</h3>
                                <p className="text-3xs text-purple-200/50">Access dynamic rosters, live records, and full historical details.</p>
                              </div>

                              <div className="relative w-full sm:w-auto" id="league-view-dropdown-container">
                                <button
                                  type="button"
                                  onClick={() => setSubTabDropdownOpen(!subTabDropdownOpen)}
                                  className="w-full sm:w-64 inline-flex justify-between items-center gap-2.5 px-4 py-2.5 border border-purple-500/30 rounded-xl bg-[#090b0a] text-xs font-athletic tracking-widest uppercase text-[#fcf9f5] shadow-xl hover:bg-slate-900 focus:outline-none cursor-pointer transition-all"
                                  id="league-view-dropdown-trigger"
                                >
                                  <span className="flex items-center gap-2">
                                    {activeSubTab === "roster" && <User2 size={13} className="text-purple-400" />}
                                    {activeSubTab === "matchup" && <Activity size={13} className="text-[#ff007f]" />}
                                    {activeSubTab === "standings" && <Trophy size={13} className="text-amber-400" />}
                                    {activeSubTab === "trades" && <TrendingUp size={13} className="text-emerald-400" />}
                                    {activeSubTab === "transactions" && <History size={13} className="text-purple-400" />}
                                    {activeSubTab === "history" && <Compass size={13} className="text-pink-400" />}
                                    <span className="capitalize">{activeSubTab === "history" ? "History & Stats" : activeSubTab}</span>
                                  </span>
                                  <ChevronDown size={14} className={`text-purple-400 transition-transform duration-200 ${subTabDropdownOpen ? "rotate-180" : ""}`} />
                                </button>

                                <AnimatePresence>
                                  {subTabDropdownOpen && (
                                    <>
                                      {/* Backdrop click barrier */}
                                      <div className="fixed inset-0 z-10" onClick={() => setSubTabDropdownOpen(false)} />
                                      <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                        transition={{ duration: 0.12 }}
                                        className="absolute right-0 mt-2 w-full sm:w-64 rounded-xl bg-[#090b0a] border border-purple-500/20 shadow-2xl z-20 overflow-hidden backdrop-blur-xl"
                                        id="league-view-dropdown-items"
                                      >
                                        <div className="p-1.5 space-y-0.5">
                                          {[
                                            { id: "roster", label: "Roster", icon: <User2 size={13} />, color: "text-purple-400" },
                                            { id: "matchup", label: "Matchup", icon: <Activity size={13} />, color: "text-[#ba8659]" },
                                            { id: "standings", label: "Standings", icon: <Trophy size={13} />, color: "text-amber-400" },
                                            { id: "trades", label: "Trades", icon: <TrendingUp size={13} />, color: "text-emerald-400" },
                                            { id: "transactions", label: "Transactions", icon: <History size={13} />, color: "text-purple-400" },
                                            { id: "history", label: "History & Stats", icon: <Compass size={13} />, color: "text-pink-400" }
                                          ].map((opt) => (
                                            <button
                                              key={opt.id}
                                              onClick={() => {
                                                setActiveSubTab(opt.id as any);
                                                setSubTabDropdownOpen(false);
                                              }}
                                              className={`w-full flex items-center justify-between px-3 py-2 text-2xs font-sans font-semibold rounded-lg text-left transition-all cursor-pointer ${
                                                activeSubTab === opt.id
                                                  ? "bg-white/10 text-white"
                                                  : "text-white/60 hover:text-white hover:bg-white/5"
                                              }`}
                                            >
                                              <span className="flex items-center gap-2">
                                                <span className={opt.color}>{opt.icon}</span>
                                                <span>{opt.label}</span>
                                              </span>
                                              {activeSubTab === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>}
                                            </button>
                                          ))}
                                        </div>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </>
                        );
                      })()}

                      {/* Homepage Interior Switch */}
                      <div className="pt-2">
                        {activeSubTab === "roster" && currentSelectedLeague.userRoster && (
                          <RosterView 
                            roster={currentSelectedLeague.userRoster} 
                            rosterPositions={currentSelectedLeague.rosterPositions} 
                            leagueId={currentSelectedLeague.leagueId}
                            currentSeason={currentSelectedLeague.season}
                            ownerId={currentSelectedLeague.userRoster.owner_id}
                            allRosters={currentSelectedLeague.standings}
                          />
                        )}

                        {activeSubTab === "matchup" && currentSelectedLeague.userRoster && (
                          <MatchupsView 
                            league={currentSelectedLeague} 
                            userRosterId={currentSelectedLeague.userRoster.roster_id} 
                          />
                        )}

                        {activeSubTab === "standings" && currentSelectedLeague.userRoster && (
                          <StandingsView 
                            standings={currentSelectedLeague.standings} 
                            userRosterId={currentSelectedLeague.userRoster.roster_id} 
                            leagueId={currentSelectedLeague.leagueId}
                            currentSeason={currentSelectedLeague.season}
                            ownerId={currentSelectedLeague.userRoster.owner_id}
                          />
                        )}

                        {activeSubTab === "trades" && currentSelectedLeague.userRoster && (
                          <TransactionsView 
                            leagueId={currentSelectedLeague.leagueId} 
                            userRosterId={currentSelectedLeague.userRoster.roster_id} 
                            mode="trades"
                          />
                        )}

                        {activeSubTab === "transactions" && currentSelectedLeague.userRoster && (
                          <TransactionsView 
                            leagueId={currentSelectedLeague.leagueId} 
                            userRosterId={currentSelectedLeague.userRoster.roster_id} 
                            mode="all"
                          />
                        )}

                        {activeSubTab === "history" && currentSelectedLeague.userRoster && (
                          <HistoryView 
                            leagueId={currentSelectedLeague.leagueId} 
                            userRosterId={currentSelectedLeague.userRoster.roster_id} 
                          />
                        )}
                      </div>

                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>

          </div>
        )}

      </main>

      {/* Live System Diagnostics / Ticker */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 mt-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/45 border border-white/5 rounded-xl p-3 text-3xs font-mono tracking-wider text-white/40">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#0d100f] border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>SYSTEM PORTAL: <strong className="text-emerald-400">ONLINE</strong></span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#0d100f] border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ba8659] animate-pulse"></span>
            <span>SLEEPER ENG: <strong className="text-white">API ACTIVE</strong></span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#0d100f] border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ba8659]/60"></span>
            <span>DEPTH CHART: <strong className="text-purple-300">{cacheStatus.playerCount || "10,482"} CODES</strong></span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#0d100f] border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
            <span>REVAL SPEED: <strong className="text-teal-400">~12MS (CACHED)</strong></span>
          </div>
        </div>
      </div>

      {/* Global Footer */}
      <footer className="border-t border-white/5 py-8 mt-8 bg-[#09090b]/40 relative z-10" id="global-footer">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center text-[9px] font-mono tracking-widest text-white/30 uppercase">
          <p>©2026 GRIDIRON LM | BETA 1.4</p>
        </div>
      </footer>

    </div>
  );
}
