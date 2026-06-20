import React, { useState, useEffect } from "react";
import { SleeperUser, LeagueDetails } from "./types";
import LeaguesOverview from "./components/LeaguesOverview";
import RosterView from "./components/RosterView";
import StandingsView from "./components/StandingsView";
import MatchupsView from "./components/MatchupsView";
import HistoryView from "./components/HistoryView";
import TransactionsView from "./components/TransactionsView";
import GridironLogo from "./components/GridironLogo";
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
  History
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Main States (defaulting to empty or loaded from localStorage)
  const [usernameInput, setUsernameInput] = useState(() => localStorage.getItem("sleeper_username") || "");
  const [activeUsername, setActiveUsername] = useState(() => localStorage.getItem("sleeper_username") || "");
  const [user, setUser] = useState<SleeperUser | null>(null);
  const [leagues, setLeagues] = useState<LeagueDetails[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Loading progression states
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  
  // Cache check state
  const [cacheStatus, setCacheStatus] = useState({ loaded: false, error: "", playerCount: 0 });
  
  // Navigation Tabs: "overview" or the leagueId of the active franchise
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Sub-tabs for specific league homepages: "roster" | "matchup" | "standings" | "ai" | "history" | "trades" | "transactions"
  const [activeSubTab, setActiveSubTab] = useState<"roster" | "matchup" | "standings" | "ai" | "history" | "trades" | "transactions">("roster");

  // 1. Check Sleeper players caching status from server
  async function checkCacheStatus() {
    try {
      const res = await fetch("/api/players/status");
      if (res.ok) {
        const status = await res.json();
        setCacheStatus(status);
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

  // 2. Fetch user and their subsequent leagues
  async function loadDynastyHub(targetUsername: string) {
    setLoadingUser(true);
    setError(null);
    setLeagues([]);
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
      // Persist successful username search
      localStorage.setItem("sleeper_username", targetUsername);

      // Step B: Fetch leagues
      setLoadingLeagues(true);
      const leaguesRes = await fetch(`/api/sleeper/leagues/${userData.user_id}`);
      if (!leaguesRes.ok) {
        throw new Error("Failed fetching leagues from Sleeper databank.");
      }
      const rawLeagues: any[] = await leaguesRes.json();

      if (!Array.isArray(rawLeagues) || rawLeagues.length === 0) {
        setLeagues([]);
        setLoadingLeagues(false);
        return;
      }

      // Filter to NFL leagues (which the endpoint does by default, but double-check)
      // Step C: Fetch detailed details for each league in parallel
      const detailPromises = rawLeagues.map(async (leg): Promise<LeagueDetails | null> => {
        try {
          const detailRes = await fetch(`/api/sleeper/league/${leg.league_id}?userId=${userData.user_id}`);
          if (detailRes.ok) {
            return await detailRes.json();
          }
          return null;
        } catch (err) {
          console.error(`Failed loading league details for ${leg.league_id}`, err);
          return null;
        }
      });

      const detailsList = await Promise.all(detailPromises);
      const activeDetails = detailsList.filter((d): d is LeagueDetails => d !== null);

      setLeagues(activeDetails);

    } catch (err: any) {
      setError(err.message || "Failed initializing Dynasty Hub.");
    } finally {
      setLoadingUser(false);
      setLoadingLeagues(false);
    }
  }

  // Initial load: Only load if we have a saved user in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sleeper_username");
    if (saved) {
      loadDynastyHub(saved);
    }
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (usernameInput.trim()) {
      loadDynastyHub(usernameInput.trim());
    }
  }

  // Find active league data
  const currentSelectedLeague = leagues.find((l) => l.leagueId === activeTab);

  return (
    <div className="min-h-screen bg-[#0e0d0c] text-slate-100 flex flex-col relative overflow-hidden selection:bg-purple-500/20 selection:text-purple-200">
      
      {/* Mesh Background Layer */}
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-950 rounded-full blur-[160px]"></div>
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-blue-950 rounded-full blur-[140px]"></div>
      </div>

      {/* Upper Players cache header banner */}
      {!cacheStatus.loaded && (
        <div className="bg-white/5 backdrop-blur-md border-b border-white/10 px-4 py-2 flex items-center justify-between text-xs text-slate-300 font-mono relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <span>Sleeper NFL Players database is compiling on server startup... ({cacheStatus.playerCount} players indexed)</span>
          </div>
          <span className="text-slate-400">Standings lists are active; roster details are updating</span>
        </div>
      )}

      {/* Global Application Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-55 px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 relative">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 cursor-pointer select-none relative z-10" onClick={() => setActiveTab("overview")}>
          <GridironLogo size={38} animate={true} />
          <div>
            <h1 className="text-md font-sans font-black tracking-widest text-slate-100 uppercase">
              GRIDIRON<span className="text-purple-400">LM</span>
            </h1>
            <p className="text-[10px] text-white/50 font-sans tracking-wide">Your intelligence is artificial.</p>
          </div>
        </div>

        {/* Sleeper user Search form and indicators */}
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto relative z-10">
          
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full md:w-64">
            <Search className="absolute left-3 text-white/40" size={15} />
            <input
              type="text"
              placeholder="Sleeper Username..."
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-20 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all font-sans shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-2.5 py-1 text-[10px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-sans font-semibold rounded-lg text-white shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              Search
            </button>
          </form>

          {/* Sync badge info */}
          <div className="flex items-center gap-2 self-start md:self-auto font-mono text-2xs bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white/60 shadow-sm">
            <Globe size={11} className="text-emerald-400 animate-pulse" />
            <span>Synced: <strong className="text-purple-300">@{activeUsername}</strong></span>
          </div>
        </div>

      </header>

      {/* Main Container screen slots */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 relative z-10">
        
        {/* Loading Overlay */}
        {(loadingUser || loadingLeagues) ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <div className="p-4 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <RefreshCw className="animate-spin text-amber-400" size={26} />
            </div>
            <div className="space-y-1">
              <p className="text-md font-sans font-semibold text-slate-200">Querying Sleeper API Matrix...</p>
              <p className="text-xs text-slate-500 font-sans max-w-sm">Aggregating roster standings and game schedules for {activeUsername || "Sleeper User"}</p>
            </div>
          </div>
        ) : !user ? (
          /* IMPRESSIVE WELCOME LANDING SCREEN */
          <div className="max-w-3xl mx-auto py-12 px-4 space-y-12">
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-2">
                <GridironLogo size={84} className="filter drop-shadow-[0_10px_20px_rgba(186,134,89,0.25)]" animate={true} />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono">
                <Zap size={12} className="animate-bounce" />
                The Ultimate Fantasy Dynasty Command Center
              </div>
              <h2 className="text-4xl font-sans font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-100 to-indigo-300 bg-clip-text text-transparent">
                Unlock Your Gridiron Empire
              </h2>
              <p className="text-sm text-slate-400 max-w-lg mx-auto font-sans leading-relaxed">
                GridironLM compiles your complete Sleeper League histories, active rosters, power ratings, and matchups. Powered by real-time Sleeper API synchronization.
              </p>
            </div>

            {/* Main search card */}
            <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="space-y-6">
                <div className="space-y-2 text-center md:text-left">
                  <h3 className="text-lg font-sans font-bold text-slate-100 flex items-center justify-center md:justify-start gap-2">
                    <Search size={18} className="text-purple-400" />
                    Enter Username to Sync
                  </h3>
                  <p className="text-xs text-slate-400">
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
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 shadow-inner"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-sm font-semibold rounded-xl text-white shadow-lg transition-all hover:scale-102 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} />
                    Get Started
                  </button>
                </form>

                <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                    <Globe size={12} className="text-emerald-400" />
                    Secure integration • Standard Sleeper Public APIs
                  </div>
                  
                  {/* Demo/Preview Trigger */}
                  <button
                    onClick={() => {
                      setUsernameInput("VaderFC");
                      loadDynastyHub("VaderFC");
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 font-sans font-medium transition-colors flex items-center gap-1 bg-purple-500/5 border border-purple-500/10 rounded-lg px-3 py-1 cursor-pointer"
                  >
                    <span>Browse with Demo Account (@VaderFC)</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                <div className="p-2 w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <History size={16} />
                </div>
                <h4 className="text-xs font-sans font-bold text-slate-200">Lifetime Ledger Rollup</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Deep indexes multiple seasons (2021-2026) to compile structural win/loss records and cumulative scores.
                </p>
              </div>

              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                <div className="p-2 w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Trophy size={16} />
                </div>
                <h4 className="text-xs font-sans font-bold text-slate-200">Interactive Sub-Tabs</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Real-time rosters, points-scored, and weekly head-to-head match-up scores mapped seamlessly.
                </p>
              </div>

              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                <div className="p-2 w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
                <h4 className="text-xs font-sans font-bold text-slate-200">Active Matchup Tracking</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
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
                onClick={() => loadDynastyHub("VaderFC")}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border border-white/10 rounded-xl text-2xs text-white cursor-pointer shadow-md transition-all"
              >
                Explore Demo (VaderFC)
              </button>
            </div>
          </div>
        ) : leagues.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-sm font-sans text-slate-400">No active dynasty rosters found for user <strong className="text-purple-400">@{activeUsername}</strong> on Sleeper.</p>
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
            <div className="flex items-center gap-1.5 border-b border-white/10 overflow-x-auto pb-px" id="dynasty-tab-rail">
              
              {/* Main Summary hub tab */}
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-3 text-xs font-sans font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer rounded-t-lg ${
                  activeTab === "overview"
                    ? "border-b-purple-500 text-white bg-white/5"
                    : "border-b-transparent text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Compass size={14} />
                Overview Hub
              </button>

              {/* Dynamic league homepage tabs */}
              {leagues.map((leg) => (
                <button
                  key={leg.leagueId}
                  onClick={() => {
                    setActiveTab(leg.leagueId);
                    setActiveSubTab("roster"); // Reset sub tab
                  }}
                  className={`px-4 py-3 text-xs font-sans font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer rounded-t-lg ${
                    activeTab === leg.leagueId
                      ? "border-b-purple-500 text-white bg-white/5"
                      : "border-b-transparent text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Activity size={13} />
                  {leg.name}
                </button>
              ))}

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
                              NFL {currentSelectedLeague.season} Status: {currentSelectedLeague.status}
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

                      {/* Homepage Interior Sub-Tabs: Navigation for this specific league */}
                      <div className="flex gap-1.5 p-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl max-w-2xl overflow-x-auto scroller-hidden">
                        <button
                          onClick={() => setActiveSubTab("roster")}
                          className={`flex-1 min-w-[70px] py-1.5 px-3 text-2xs font-sans font-bold tracking-wide rounded-lg text-center transition-all cursor-pointer ${
                            activeSubTab === "roster"
                              ? "bg-white/15 border border-white/10 text-white shadow-lg"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          Roster
                        </button>
                        <button
                          onClick={() => setActiveSubTab("matchup")}
                          className={`flex-1 min-w-[70px] py-1.5 px-3 text-2xs font-sans font-bold tracking-wide rounded-lg text-center transition-all cursor-pointer ${
                            activeSubTab === "matchup"
                              ? "bg-white/15 border border-white/10 text-white shadow-lg"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          Matchup
                        </button>
                        <button
                          onClick={() => setActiveSubTab("standings")}
                          className={`flex-1 min-w-[75px] py-1.5 px-3 text-2xs font-sans font-bold tracking-wide rounded-lg text-center transition-all cursor-pointer ${
                            activeSubTab === "standings"
                              ? "bg-white/15 border border-white/10 text-white shadow-lg"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          Standings
                        </button>
                        <button
                          onClick={() => setActiveSubTab("trades")}
                          className={`flex-1 min-w-[70px] py-1.5 px-3 text-2xs font-sans font-bold tracking-wide rounded-lg text-center transition-all cursor-pointer ${
                            activeSubTab === "trades"
                              ? "bg-white/15 border border-white/10 text-white shadow-lg"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          Trades
                        </button>
                        <button
                          onClick={() => setActiveSubTab("transactions")}
                          className={`flex-1 min-w-[85px] py-1.5 px-3 text-2xs font-sans font-bold tracking-wide rounded-lg text-center transition-all cursor-pointer ${
                            activeSubTab === "transactions"
                              ? "bg-white/15 border border-white/10 text-white shadow-lg"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          Transactions
                        </button>
                        <button
                          onClick={() => setActiveSubTab("history")}
                          className={`flex-1 min-w-[100px] py-1.5 px-3 text-2xs font-sans font-bold tracking-wide rounded-lg text-center transition-all cursor-pointer ${
                            activeSubTab === "history"
                              ? "bg-white/15 border border-white/10 text-white shadow-lg"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          History & Stats
                        </button>
                      </div>

                      {/* Homepage Interior Switch */}
                      <div className="pt-2">
                        {activeSubTab === "roster" && currentSelectedLeague.userRoster && (
                          <RosterView 
                            roster={currentSelectedLeague.userRoster} 
                            rosterPositions={currentSelectedLeague.rosterPositions} 
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

      {/* Global Footer */}
      <footer className="border-t border-white/10 py-6 mt-12 bg-white/2 relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-3 text-white/40 text-3xs font-mono">
          <p>© 2026 Gridiron LM - Pulled securely from Sleeper Open Developer Databanks</p>
          <div className="flex items-center gap-4">
            <span>Sleeper Database Live Sync</span>
            <span>•</span>
            <span>Server-side Caching Active</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
