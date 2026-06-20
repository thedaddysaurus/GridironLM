import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory player cache
let playersCache: Record<string, {
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  years_exp: number | null;
}> = {};

let playersLoaded = false;
let playersLoadingError = "";

const PLAYERS_CACHE_FILE = path.join(process.cwd(), "compact_players.json");

// background load players database with file-system caching and deferred background downloader
async function loadSleeperPlayers() {
  try {
    // 1. Try to load from local file cache first
    try {
      const stats = await fs.promises.stat(PLAYERS_CACHE_FILE);
      const fileAgeMs = Date.now() - stats.mtimeMs;
      // Stale if older than 24 hours
      if (fileAgeMs < 24 * 60 * 60 * 1000) {
        console.log("Loading NFL players from local compact cache file...");
        const rawData = await fs.promises.readFile(PLAYERS_CACHE_FILE, "utf-8");
        const cached = JSON.parse(rawData);
        if (cached && typeof cached === "object" && Object.keys(cached).length > 1000) {
          playersCache = cached;
          playersLoaded = true;
          console.log(`Loaded ${Object.keys(playersCache).length} players instantly from local cache.`);
          return;
        }
      }
    } catch {
      // Local cache file not found or invalid, continue to fetch from Sleeper API
    }

    // Delay the download if we don't have local cached files, allowing the server to initialize first
    // without blocking incoming asset requests or locking the single-threaded CPU
    console.log("Scheduling NFL Players database download from Sleeper...");
    setTimeout(async () => {
      try {
        console.log("Starting NFL Players data download from Sleeper...");
        const res = await fetch("https://api.sleeper.app/v1/players/nfl");
        if (!res.ok) {
          throw new Error(`Sleeper players API returned status ${res.status}`);
        }
        const allPlayers: Record<string, any> = await res.json();
        
        const compactPlayers: typeof playersCache = {};
        let count = 0;
        
        for (const [id, p] of Object.entries(allPlayers)) {
          if (p.position && (p.active || p.team)) {
            compactPlayers[id] = {
              first_name: p.first_name || "",
              last_name: p.last_name || "",
              full_name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
              position: p.position || "",
              team: p.team || null,
              age: p.age || null,
              years_exp: p.years_exp || null
            };
            count++;
          }
        }
        
        playersCache = compactPlayers;
        playersLoaded = true;
        console.log(`Successfully cached ${count} active NFL players from Sleeper.`);

        // Save compacted database locally for instant subsequent boot times
        await fs.promises.writeFile(PLAYERS_CACHE_FILE, JSON.stringify(compactPlayers), "utf-8");
        console.log("Compact players cache saved successfully to disk.");
      } catch (err: any) {
        playersLoadingError = err.message || String(err);
        console.error("Failed to load Sleeper players (background download):", err);
      }
    }, 4500); // 4.5 seconds delay allows Express & Vite to bind and serve client packages/views first
  } catch (err: any) {
    playersLoadingError = err.message || String(err);
    console.error("Unexpected error in players loader setup:", err);
  }
}

// Fire off player loading asynchronously so server startup is instant
loadSleeperPlayers();

// API: Check players cache status
app.get("/api/players/status", (req, res) => {
  res.json({
    loaded: playersLoaded,
    error: playersLoadingError,
    playerCount: Object.keys(playersCache).length
  });
});

// Helper: Resolve player details
function resolvePlayer(id: string) {
  if (playersCache[id]) {
    return { id, ...playersCache[id] };
  }
  return {
    id,
    first_name: "Unknown",
    last_name: "Player",
    full_name: `Unknown Player (${id})`,
    position: "N/A",
    team: null,
    age: null,
    years_exp: null
  };
}

// Shared memory cache for Sleeper API calls with short-lived and long-lived TTLs to make page loading lightning fast
const sleeperCache = new Map<string, { data: any; expiry: number }>();

async function fetchWithCache(url: string, ttlMs: number = 5 * 60 * 1000) {
  const cached = sleeperCache.get(url);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw { status: 404, message: `Sleeper entity not found at ${url}` };
    }
    throw new Error(`Sleeper API responded with ${res.status} for URL: ${url}`);
  }
  const data = await res.json();
  sleeperCache.set(url, { data, expiry: Date.now() + ttlMs });
  return data;
}

// API: Sleeper Username search lookup
app.get("/api/sleeper/user/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const targetUrl = `https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`;
    const userData = await fetchWithCache(targetUrl, 60 * 60 * 1000); // Cache user for 1 hr
    if (!userData) {
      return res.status(404).json({ error: "Empty response from Sleeper" });
    }
    res.json(userData);
  } catch (error: any) {
    console.error("Error looking up user:", error);
    if (error.status === 404) {
      return res.status(404).json({ error: "Sleeper user not found" });
    }
    res.status(500).json({ error: error.message || "Failed to fetch user" });
  }
});

// API: Sleeper NFL Trending Adds and Drops with resolved player details
app.get("/api/sleeper/trending", async (req, res) => {
  const lookback_hours = parseInt(req.query.lookback_hours as string) || 24;
  const limit = parseInt(req.query.limit as string) || 20;
  
  try {
    const addUrl = `https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=${lookback_hours}&limit=${limit}`;
    const dropUrl = `https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=${lookback_hours}&limit=${limit}`;
    
    // Fetch both adds and drops in parallel
    const [addsRaw, dropsRaw] = await Promise.all([
      fetchWithCache(addUrl, 10 * 60 * 1000), // Cache for 10 minutes
      fetchWithCache(dropUrl, 10 * 60 * 1000)
    ]);
    
    const adds = (addsRaw || []).map((item: any) => {
      const resolved = resolvePlayer(item.player_id);
      return {
        ...item,
        player: resolved
      };
    });

    const drops = (dropsRaw || []).map((item: any) => {
      const resolved = resolvePlayer(item.player_id);
      return {
        ...item,
        player: resolved
      };
    });

    res.json({ adds, drops });
  } catch (error: any) {
    console.error("Error fetching trending data:", error);
    res.status(500).json({ error: error.message || "Failed to fetch trending players" });
  }
});

// API: Fetch user leagues across 2025 and 2026 seasons to ensure completeness
app.get("/api/sleeper/leagues/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    // We poll seasons from 2020 to 2026 to catch both active and historical dynasty settings
    const seasons = ["2020", "2021", "2022", "2023", "2024", "2025", "2026"];
    const allLeaguesMap = new Map<string, any>();

    const fetchPromises = seasons.map(async (season) => {
      try {
        const url = `https://api.sleeper.app/v1/user/${userId}/leagues/nfl/${season}`;
        const ttl = (season === "2026" || season === "2025") ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000; // past is cached 24 hours
        const leagues = await fetchWithCache(url, ttl);
        if (Array.isArray(leagues)) {
          leagues.forEach((l) => {
            allLeaguesMap.set(l.league_id, l);
          });
        }
      } catch (err) {
        console.error(`Failed to fetch leagues for season ${season}:`, err);
      }
    });

    await Promise.all(fetchPromises);
    const combinedLeagues = Array.from(allLeaguesMap.values());

    // Filter to Dynasty leagues of active seasons (2025 and 2026) that are not complete
    const activeDynastyLeagues = combinedLeagues.filter((l) => {
      const isDynasty = l.settings?.type === 2 || String(l.settings?.type) === "2";
      const isCurrent = parseInt(l.season || "0", 10) >= 2025;
      const isNotComplete = l.status !== "complete" && l.status !== "closed";
      return isDynasty && isCurrent && isNotComplete;
    });

    // Deduplicate rolled-over leagues (prevent "doubled up" leagues by season rollover)
    const previousIds = new Set<string>();
    activeDynastyLeagues.forEach((l) => {
      if (l.previous_league_id && l.previous_league_id !== "0") {
        previousIds.add(l.previous_league_id);
      }
    });

    // Keep only leagues that are NOT marked as a prior season ID of another loaded league
    const currentActiveLeaguesOnly = activeDynastyLeagues.filter((l) => !previousIds.has(l.league_id));

    res.json(currentActiveLeaguesOnly);
  } catch (error: any) {
    console.error("Error fetching combined leagues:", error);
    res.status(500).json({ error: error.message || "Failed to fetch leagues" });
  }
});

// API: Get fully resolved league dashboard data by leagueId
app.get("/api/sleeper/league/:leagueId", async (req, res) => {
  const { leagueId } = req.params;
  const userQueryId = req.query.userId as string || "";

  try {
    // 1. Fetch primary assets in parallel using in-memory cache
    const leagueUrl = `https://api.sleeper.app/v1/league/${leagueId}`;
    const rostersUrl = `https://api.sleeper.app/v1/league/${leagueId}/rosters`;
    const usersUrl = `https://api.sleeper.app/v1/league/${leagueId}/users`;

    const [leagueData, rostersData, usersData] = await Promise.all([
      fetchWithCache(leagueUrl, 5 * 60 * 1000), // 5 min cache
      fetchWithCache(rostersUrl, 5 * 60 * 1000),
      fetchWithCache(usersUrl, 15 * 60 * 1000)   // 15 min cache for users
    ]);

    // Map users for fast lookup: user_id -> user object
    const usersMap: Record<string, any> = {};
    if (Array.isArray(usersData)) {
      usersData.forEach((u) => {
        usersMap[u.user_id] = {
          user_id: u.user_id,
          username: u.username,
          display_name: u.display_name,
          avatar: u.avatar,
          team_name: u.metadata?.team_name || `${u.display_name}'s Team`
        };
      });
    }

    // Determine week for matchups
    let currentWeek = 1;
    if (leagueData?.settings?.current_week) {
      currentWeek = leagueData.settings.current_week;
    }
    // If status is post-season or complete, fallback or use week 18 as maximum
    if (currentWeek > 18) currentWeek = 18;
    if (currentWeek < 1) currentWeek = 1;

    // Fetch matchups for current active week using cache
    let matchupsData: any[] = [];
    try {
      const matchupsUrl = `https://api.sleeper.app/v1/league/${leagueId}/matchups/${currentWeek}`;
      matchupsData = await fetchWithCache(matchupsUrl, 5 * 60 * 1000);
    } catch (mErr) {
      console.warn("Failed to fetch matchups for week:", currentWeek, mErr);
    }

    // Map matchups by roster_id for lookup
    const matchupsMap: Record<number, any> = {};
    if (Array.isArray(matchupsData)) {
      matchupsData.forEach((m) => {
        matchupsMap[m.roster_id] = m;
      });
    }

    // 2. Resolve players and assemble rich rosters
    let userRoster: any = null;
    const resolvedRosters = Array.isArray(rostersData) ? rostersData.map((rost: any) => {
      const owner = usersMap[rost.owner_id] || {
        user_id: rost.owner_id,
        username: "Unknown Owner",
        display_name: "Unknown Owner",
        team_name: `Roster ${rost.roster_id}`
      };

      // Resolve players on roster
      const playersList = Array.isArray(rost.players) 
        ? rost.players.map((pid: string) => resolvePlayer(pid))
        : [];

      // Resolve starting lineup
      const startersList = Array.isArray(rost.starters)
        ? rost.starters.map((pid: string) => resolvePlayer(pid))
        : [];

      // Bench is players excluding starters
      const starterIds = new Set(rost.starters || []);
      const benchList = playersList.filter((p) => !starterIds.has(p.id));

      const rosterMatchup = matchupsMap[rost.roster_id] || null;

      const richRoster = {
        roster_id: rost.roster_id,
        owner_id: rost.owner_id,
        settings: rost.settings || {},
        ownerDetails: owner,
        players: playersList,
        starters: startersList,
        bench: benchList,
        pointsThisWeek: rosterMatchup ? rosterMatchup.points : 0,
        matchupId: rosterMatchup ? rosterMatchup.matchup_id : null,
        startersIdsWithPoints: rosterMatchup ? rosterMatchup.starters_points || {} : {}
      };

      if (userQueryId && rost.owner_id === userQueryId) {
        userRoster = richRoster;
      } else if (!userQueryId && rost.roster_id === 1) {
        // Fallback default
        userRoster = richRoster;
      }

      return richRoster;
    }) : [];

    // Order standings: order rosters by Wins high to low, then Fpts desc
    const standings = [...resolvedRosters].sort((a, b) => {
      const aWins = a.settings.wins || 0;
      const bWins = b.settings.wins || 0;
      if (bWins !== aWins) return bWins - aWins;
      
      const aFpts = (a.settings.fpts || 0) + (a.settings.fpts_decimal || 0) * 0.01;
      const bFpts = (b.settings.fpts || 0) + (b.settings.fpts_decimal || 0) * 0.01;
      return bFpts - aFpts;
    });

    // 3. Assemble matches list for matchmaking widgets
    const matchGroups: Record<number, any[]> = {};
    resolvedRosters.forEach((r) => {
      if (r.matchupId !== null) {
        if (!matchGroups[r.matchupId]) {
          matchGroups[r.matchupId] = [];
        }
        matchGroups[r.matchupId].push({
          roster_id: r.roster_id,
          team_name: r.ownerDetails.team_name,
          username: r.ownerDetails.display_name,
          avatar: r.ownerDetails.avatar,
          owner_id: r.owner_id,
          points: r.pointsThisWeek
        });
      }
    });

    const activeMatches = Object.entries(matchGroups).map(([matchupId, teams]) => ({
      matchupId: Number(matchupId),
      teams
    }));

    res.json({
      leagueId,
      name: leagueData.name,
      status: leagueData.status,
      season: leagueData.season,
      totalRosters: leagueData.settings?.total_rosters || 12,
      currentWeek,
      userRoster,
      standings,
      matches: activeMatches,
      rosterPositions: leagueData.roster_positions || []
    });

  } catch (error: any) {
    console.error(`Error loading league ${leagueId} details:`, error);
    res.status(500).json({ error: error.message || "Failed to load league details." });
  }
});

// API: Global Lifetime Statistics Rollup across all historical and active leagues
app.get("/api/sleeper/user/:userId/lifetime-rollup", async (req, res) => {
  const { userId } = req.params;
  try {
    const seasons = ["2020", "2021", "2022", "2023", "2024", "2025", "2026"];
    const allLeaguesMap = new Map<string, any>();

    // Fetch initial active leagues using cache
    await Promise.all(seasons.map(async (season) => {
      try {
        const url = `https://api.sleeper.app/v1/user/${userId}/leagues/nfl/${season}`;
        const ttl = (season === "2026" || season === "2025") ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const leagues = await fetchWithCache(url, ttl);
        if (Array.isArray(leagues)) {
          leagues.forEach((l) => allLeaguesMap.set(l.league_id, l));
        }
      } catch (err) {
        console.error(`Rollup: Failed fetching active leagues for ${season}:`, err);
      }
    }));

    const combinedActive = Array.from(allLeaguesMap.values());
    const previousIds = new Set<string>();
    combinedActive.forEach((l) => {
      if (l.previous_league_id && l.previous_league_id !== "0") {
        previousIds.add(l.previous_league_id);
      }
    });

    const activeRoots = combinedActive.filter((l) => !previousIds.has(l.league_id));

    const historicalLeagueIds = new Set<string>();
    const leagueIdToData = new Map<string, any>();

    // Crawl back parent leagues depth-wise
    const crawlPromises = activeRoots.map(async (rootLeague) => {
      let currentId: string | null = rootLeague.league_id;
      let depth = 0;
      const maxDepth = 6; // Deep history crawl
      while (currentId && depth < maxDepth) {
        if (historicalLeagueIds.has(currentId)) {
          break;
        }
        historicalLeagueIds.add(currentId);
        
        try {
          const lUrl = `https://api.sleeper.app/v1/league/${currentId}`;
          const leagueData = await fetchWithCache(lUrl, 24 * 60 * 60 * 1000); // Historical is highly static, cache 24h
          leagueIdToData.set(currentId, leagueData);
          currentId = (leagueData.previous_league_id && leagueData.previous_league_id !== "0") ? leagueData.previous_league_id : null;
        } catch (err) {
          console.error(`Rollup: Failed to fetch league ${currentId}:`, err);
          break;
        }
        depth++;
      }
    });

    await Promise.all(crawlPromises);

    let totalWins = 0;
    let totalLosses = 0;
    let totalTies = 0;
    let cumulativePoints = 0;
    let totalSeasons = 0;
    const compiledSeasons: any[] = [];

    // Fetch rosters for all resolved leagues using caching
    const rosterPromises = Array.from(historicalLeagueIds).map(async (lId) => {
      try {
        const rUrl = `https://api.sleeper.app/v1/league/${lId}/rosters`;
        const leagueInfo = leagueIdToData.get(lId);
        const isCurrentSeason = leagueInfo?.season === "2026" || leagueInfo?.season === "2025";
        const ttl = isCurrentSeason ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000;

        const rosters = await fetchWithCache(rUrl, ttl);
        if (Array.isArray(rosters)) {
          const myRoster = rosters.find(
            (r) => 
              String(r.owner_id).trim() === String(userId).trim() || 
              (Array.isArray(r.co_owners) && r.co_owners.map(co => String(co).trim()).includes(String(userId).trim()))
          );
          if (myRoster) {
            const wins = myRoster.settings?.wins || 0;
            const losses = myRoster.settings?.losses || 0;
            const ties = myRoster.settings?.ties || 0;
            const fpts = (myRoster.settings?.fpts || 0) + (myRoster.settings?.fpts_decimal || 0) * 0.01;
            
            const leagueData = leagueIdToData.get(lId);
            const seasonYear = leagueData?.season || "N/A";
            const leagueName = leagueData?.name || `League ${lId}`;

            totalWins += wins;
            totalLosses += losses;
            totalTies += ties;
            cumulativePoints += fpts;
            totalSeasons += 1;

            compiledSeasons.push({
              leagueId: lId,
              name: leagueName,
              season: seasonYear,
              wins,
              losses,
              ties,
              fpts
            });
          }
        }
      } catch (err) {
        console.error(`Rollup: Failed fetching rosters for league ${lId}:`, err);
      }
    });

    await Promise.all(rosterPromises);

    res.json({
      lifetimeWins: totalWins,
      lifetimeLosses: totalLosses,
      lifetimeTies: totalTies,
      lifetimePoints: cumulativePoints,
      totalSeasons,
      seasons: compiledSeasons.sort((a, b) => b.season.localeCompare(a.season)),
      // Debug fields
      debug: {
        userId,
        seasonsScanned: seasons,
        activeLeaguesCount: combinedActive.length,
        activeRoots: activeRoots.map(l => ({ id: l.league_id, name: l.name })),
        historicalLeagueIds: Array.from(historicalLeagueIds),
        leaguesDetails: Array.from(leagueIdToData.entries()).map(([k, v]) => ({ id: k, name: v.name, prev: v.previous_league_id, season: v.season })),
        compiledSeasonsCount: compiledSeasons.length
      }
    });
  } catch (error: any) {
    console.error("Error building global user lifetime rollup:", error);
    res.status(500).json({ error: error.message || "Failed building global user lifetime rollup." });
  }
});

// API: Detailed League History & All-Time Stats Rollup
app.get("/api/sleeper/league/:leagueId/history", async (req, res) => {
  const { leagueId } = req.params;
  try {
    const seasonsList: any[] = [];
    let currentId: string | null = leagueId;
    
    // Support climbing up to 15 seasons deep for history to ensure we go back to 2022 and prior
    let depth = 0;
    const maxDepth = 15;
    
    // Roster aggregation for career / all-time stats
    const allTimeStats: Record<string, {
      userId: string;
      displayName: string;
      teamName: string;
      avatar: string | null;
      seasonsCount: number;
      wins: number;
      losses: number;
      ties: number;
      pointsFor: number;
    }> = {};

    while (currentId && depth < maxDepth) {
      try {
        const leagueUrl = `https://api.sleeper.app/v1/league/${currentId}`;
        const leagueData = await fetchWithCache(leagueUrl, 24 * 60 * 60 * 1000);
        if (!leagueData || !leagueData.season) break;
        
        const isCurrentSeason = leagueData.season === "2026" || leagueData.season === "2025";
        const rostersTtl = isCurrentSeason ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const usersTtl = isCurrentSeason ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

        const rostersUrl = `https://api.sleeper.app/v1/league/${currentId}/rosters`;
        const usersUrl = `https://api.sleeper.app/v1/league/${currentId}/users`;
        
        const [rosters, users] = await Promise.all([
          fetchWithCache(rostersUrl, rostersTtl).catch(() => []),
          fetchWithCache(usersUrl, usersTtl).catch(() => [])
        ]);
        
        const usersMap: Record<string, any> = {};
        if (Array.isArray(users)) {
          users.forEach((u) => {
            usersMap[u.user_id] = {
              user_id: u.user_id,
              display_name: u.display_name,
              avatar: u.avatar || null,
              team_name: u.metadata?.team_name || `${u.display_name}'s Team`
            };
          });
        }
        
        if (Array.isArray(rosters) && rosters.length > 0) {
          const sortedRankings = [...rosters].map((r) => {
            const owner = usersMap[r.owner_id] || {
              user_id: r.owner_id,
              display_name: "Unknown Owner",
              team_name: `Roster ${r.roster_id}`
            };
            const fpts = (r.settings?.fpts || 0) + (r.settings?.fpts_decimal || 0) * 0.01;
            const wins = r.settings?.wins || 0;
            const losses = r.settings?.losses || 0;
            const ties = r.settings?.ties || 0;
            
            return {
              roster_id: r.roster_id,
              owner_id: r.owner_id,
              ownerDetails: owner,
              wins,
              losses,
              ties,
              fpts
            };
          }).sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.fpts - a.fpts;
          });

          const champ = sortedRankings[0];
          const runner = sortedRankings[1];
          
          seasonsList.push({
            leagueId: currentId,
            season: leagueData.season,
            name: leagueData.name,
            totalRosters: rosters.length,
            champion: champ ? {
              ownerId: champ.owner_id,
              displayName: champ.ownerDetails.display_name,
              teamName: champ.ownerDetails.team_name,
              avatar: champ.ownerDetails.avatar,
              record: `${champ.wins}-${champ.losses}-${champ.ties}`,
              fpts: champ.fpts
            } : null,
            runnerUp: runner ? {
              ownerId: runner.owner_id,
              displayName: runner.ownerDetails.display_name,
              teamName: runner.ownerDetails.team_name,
              avatar: runner.ownerDetails.avatar,
              record: `${runner.wins}-${runner.losses}-${runner.ties}`,
              fpts: runner.fpts
            } : null
          });

          // All-time statistics consolidation
          sortedRankings.forEach((r) => {
            if (!r.owner_id) return;
            const key = r.owner_id;
            if (!allTimeStats[key]) {
              allTimeStats[key] = {
                userId: r.owner_id,
                displayName: r.ownerDetails.display_name,
                teamName: r.ownerDetails.team_name,
                avatar: r.ownerDetails.avatar,
                seasonsCount: 0,
                wins: 0,
                losses: 0,
                ties: 0,
                pointsFor: 0
              };
            }
            const stat = allTimeStats[key];
            stat.seasonsCount += 1;
            stat.wins += r.wins;
            stat.losses += r.losses;
            stat.ties += r.ties;
            stat.pointsFor += r.fpts;
          });
        }
        
        currentId = (leagueData.previous_league_id && leagueData.previous_league_id !== "0") ? leagueData.previous_league_id : null;
        depth++;
      } catch (innerErr) {
        console.error(`Error loading historical season for league ID ${currentId}:`, innerErr);
        break;
      }
    }

    const leaderboard = Object.values(allTimeStats).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointsFor - a.pointsFor;
    });

    res.json({
      seasons: seasonsList,
      leaderboard: leaderboard
    });
  } catch (error: any) {
    console.error("Error building league history:", error);
    res.status(500).json({ error: error.message || "Failed compiling league history." });
  }
});

// API: Detailed transactions (waiver, trades, free agency) for a league
app.get("/api/sleeper/league/:leagueId/transactions", async (req, res) => {
  const { leagueId } = req.params;
  try {
    const rostersUrl = `https://api.sleeper.app/v1/league/${leagueId}/rosters`;
    const usersUrl = `https://api.sleeper.app/v1/league/${leagueId}/users`;

    const [rostersData, usersData] = await Promise.all([
      fetchWithCache(rostersUrl, 5 * 60 * 1000).catch(() => []),
      fetchWithCache(usersUrl, 15 * 60 * 1000).catch(() => [])
    ]);

    const usersMap: Record<string, any> = {};
    if (Array.isArray(usersData)) {
      usersData.forEach((u) => {
        usersMap[u.user_id] = u;
      });
    }

    const rosterIdToOwner: Record<string, { display_name: string; team_name: string; avatar: string | null; user_id: string }> = {};
    if (Array.isArray(rostersData)) {
      rostersData.forEach((r) => {
        const ownerId = r.owner_id;
        const u = usersMap[ownerId] || {};
        const displayName = u.display_name || u.username || `Owner ${ownerId || r.roster_id}`;
        let teamName = displayName;
        if (u.metadata && u.metadata.team_name) {
          teamName = u.metadata.team_name;
        }
        rosterIdToOwner[String(r.roster_id)] = {
          display_name: displayName,
          team_name: teamName,
          avatar: u.avatar || null,
          user_id: ownerId
        };
      });
    }

    // Fetch transactions in parallel for weeks 1 through 18
    const promises = Array.from({ length: 18 }, (_, i) => {
      const week = i + 1;
      const url = `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`;
      return fetchWithCache(url, 10 * 60 * 1000).catch(() => []); // 10 min cache
    });

    const results = await Promise.all(promises);
    const allRawTransactions = results.flat();

    // Deduplicate and process transactions
    const seenIds = new Set<string>();
    const processedTransactions: any[] = [];

    allRawTransactions.forEach((t: any) => {
      if (!t || !t.transaction_id || seenIds.has(t.transaction_id)) return;
      seenIds.add(t.transaction_id);

      // Map adds/drops with full player details and owner info
      const richAdds = Object.entries(t.adds || {}).map(([pid, rid]) => {
        const rIdStr = String(rid);
        const owner = rosterIdToOwner[rIdStr] || { display_name: `Roster ${rid}`, team_name: `Roster ${rid}`, user_id: "" };
        return {
          player: resolvePlayer(pid),
          rosterId: rid,
          ownerName: owner.display_name,
          teamName: owner.team_name,
          userId: owner.user_id
        };
      });

      const richDrops = Object.entries(t.drops || {}).map(([pid, rid]) => {
        const rIdStr = String(rid);
        const owner = rosterIdToOwner[rIdStr] || { display_name: `Roster ${rid}`, team_name: `Roster ${rid}`, user_id: "" };
        return {
          player: resolvePlayer(pid),
          rosterId: rid,
          ownerName: owner.display_name,
          teamName: owner.team_name,
          userId: owner.user_id
        };
      });

      const richDraftPicks = (t.draft_picks || []).map((pick: any) => {
        const receiver = rosterIdToOwner[String(pick.roster_id)] || { display_name: `Roster ${pick.roster_id}`, team_name: `Roster ${pick.roster_id}` };
        const sender = rosterIdToOwner[String(pick.previous_roster_id)] || { display_name: `Roster ${pick.previous_roster_id}`, team_name: `Roster ${pick.previous_roster_id}` };
        const originalOwner = rosterIdToOwner[String(pick.owner_id)] || { display_name: `Roster ${pick.owner_id}`, team_name: `Roster ${pick.owner_id}` };
        return {
          season: pick.season,
          round: pick.round,
          receiverRosterId: pick.roster_id,
          receiverName: receiver.display_name,
          receiverTeam: receiver.team_name,
          senderRosterId: pick.previous_roster_id,
          senderName: sender.display_name,
          senderTeam: sender.team_name,
          originalOwnerRosterId: pick.owner_id,
          originalOwnerName: originalOwner.display_name,
          originalOwnerTeam: originalOwner.team_name
        };
      });

      processedTransactions.push({
        transaction_id: t.transaction_id,
        type: t.type, // 'trade', 'free_agent', 'waiver', 'commissioner'
        status: t.status,
        created: t.created || t.status_updated,
        status_updated: t.status_updated,
        week: t.leg,
        roster_ids: t.roster_ids,
        waiver_budget: t.waiver_budget || [],
        richAdds,
        richDrops,
        richDraftPicks
      });
    });

    // Sort transactions by date descending (newest first)
    processedTransactions.sort((a, b) => b.created - a.created);

    res.json({
      transactions: processedTransactions,
      owners: Object.entries(rosterIdToOwner).map(([rid, owner]) => ({
        rosterId: parseInt(rid),
        displayName: owner.display_name,
        teamName: owner.team_name,
        avatar: owner.avatar,
        userId: owner.user_id
      }))
    });
  } catch (error: any) {
    console.error("Error loading transactions:", error);
    res.status(500).json({ error: error.message || "Failed loading transactions data." });
  }
});

// API: Retrieve user's 10 most recent trades across all leagues
app.get("/api/sleeper/user/:userId/recent-trades", async (req, res) => {
  const { userId } = req.params;
  try {
    const seasons = ["2020", "2021", "2022", "2023", "2024", "2025", "2026"];
    const allLeaguesMap = new Map<string, any>();

    // Obtain leagues (cached)
    await Promise.all(seasons.map(async (season) => {
      try {
        const url = `https://api.sleeper.app/v1/user/${userId}/leagues/nfl/${season}`;
        const ttl = (season === "2026" || season === "2025") ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const leagues = await fetchWithCache(url, ttl);
        if (Array.isArray(leagues)) {
          leagues.forEach((l) => allLeaguesMap.set(l.league_id, l));
        }
      } catch (err) {
        console.error(`Recent trades leagues fetch: Failed for season ${season}:`, err);
      }
    }));

    const leagues = Array.from(allLeaguesMap.values());
    const allUserTrades: any[] = [];

    await Promise.all(leagues.map(async (league) => {
      const leagueId = league.league_id;
      try {
        const rostersUrl = `https://api.sleeper.app/v1/league/${leagueId}/rosters`;
        const usersUrl = `https://api.sleeper.app/v1/league/${leagueId}/users`;

        const [rostersData, usersData] = await Promise.all([
          fetchWithCache(rostersUrl, 5 * 60 * 1000).catch(() => []),
          fetchWithCache(usersUrl, 15 * 60 * 1000).catch(() => [])
        ]);

        const usersMap: Record<string, any> = {};
        if (Array.isArray(usersData)) {
          usersData.forEach((u) => {
            usersMap[u.user_id] = u;
          });
        }

        const rosterIdToOwner: Record<string, { display_name: string; team_name: string; avatar: string | null; user_id: string }> = {};
        let userRosterId: number | null = null;

        if (Array.isArray(rostersData)) {
          rostersData.forEach((r) => {
            const ownerId = r.owner_id;
            const u = usersMap[ownerId] || {};
            const displayName = u.display_name || u.username || `Owner ${ownerId || r.roster_id}`;
            let teamName = displayName;
            if (u.metadata && u.metadata.team_name) {
              teamName = u.metadata.team_name;
            }
            rosterIdToOwner[String(r.roster_id)] = {
              display_name: displayName,
              team_name: teamName,
              avatar: u.avatar || null,
              user_id: ownerId
            };
            if (String(ownerId).trim() === String(userId).trim() || (Array.isArray(r.co_owners) && r.co_owners.map((co: any) => String(co).trim()).includes(String(userId).trim()))) {
              userRosterId = r.roster_id;
            }
          });
        }

        if (userRosterId === null) return;

        // Fetch weeks in parallel
        const promises = Array.from({ length: 18 }, (_, i) => {
          const week = i + 1;
          const url = `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`;
          return fetchWithCache(url, 10 * 60 * 1000).catch(() => []);
        });

        const results = await Promise.all(promises);
        const allRawTransactions = results.flat();

        const seenIds = new Set<string>();

        allRawTransactions.forEach((t: any) => {
          if (!t || !t.transaction_id || t.type !== "trade" || seenIds.has(t.transaction_id)) return;
          seenIds.add(t.transaction_id);

          const isUserParty = Array.isArray(t.roster_ids) && t.roster_ids.includes(userRosterId);
          if (!isUserParty) return;

          const richAdds = Object.entries(t.adds || {}).map(([pid, rid]) => {
            const rIdStr = String(rid);
            const owner = rosterIdToOwner[rIdStr] || { display_name: `Roster ${rid}`, team_name: `Roster ${rid}`, user_id: "" };
            return {
              player: resolvePlayer(pid),
              rosterId: rid,
              ownerName: owner.display_name,
              teamName: owner.team_name,
              userId: owner.user_id
            };
          });

          const richDrops = Object.entries(t.drops || {}).map(([pid, rid]) => {
            const rIdStr = String(rid);
            const owner = rosterIdToOwner[rIdStr] || { display_name: `Roster ${rid}`, team_name: `Roster ${rid}`, user_id: "" };
            return {
              player: resolvePlayer(pid),
              rosterId: rid,
              ownerName: owner.display_name,
              teamName: owner.team_name,
              userId: owner.user_id
            };
          });

          const richDraftPicks = (t.draft_picks || []).map((pick: any) => {
            const receiver = rosterIdToOwner[String(pick.roster_id)] || { display_name: `Roster ${pick.roster_id}`, team_name: `Roster ${pick.roster_id}` };
            const sender = rosterIdToOwner[String(pick.previous_roster_id)] || { display_name: `Roster ${pick.previous_roster_id}`, team_name: `Roster ${pick.previous_roster_id}` };
            const originalOwner = rosterIdToOwner[String(pick.owner_id)] || { display_name: `Roster ${pick.owner_id}`, team_name: `Roster ${pick.owner_id}` };
            return {
              season: pick.season,
              round: pick.round,
              receiverRosterId: pick.roster_id,
              receiverName: receiver.display_name,
              receiverTeam: receiver.team_name,
              senderRosterId: pick.previous_roster_id,
              senderName: sender.display_name,
              senderTeam: sender.team_name,
              originalOwnerRosterId: pick.owner_id,
              originalOwnerName: originalOwner.display_name,
              originalOwnerTeam: originalOwner.team_name
            };
          });

          allUserTrades.push({
            transaction_id: t.transaction_id,
            leagueName: league.name,
            leagueId: league.league_id,
            season: league.season,
            type: t.type,
            status: t.status,
            created: t.created || t.status_updated,
            status_updated: t.status_updated,
            week: t.leg,
            roster_ids: t.roster_ids,
            richAdds,
            richDrops,
            richDraftPicks
          });
        });
      } catch (err) {
        console.error(`Recent trades: Failed transactions fetch for league ${leagueId}:`, err);
      }
    }));

    allUserTrades.sort((a, b) => b.created - a.created);
    res.json({ trades: allUserTrades.slice(0, 10) });
  } catch (error: any) {
    console.error("Error loading combined recent trades:", error);
    res.status(500).json({ error: error.message || "Failed loading recent trades." });
  }
});

// Configure Vite middleware / Serve static build assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
