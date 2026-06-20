import React, { useState } from "react";
import { LeagueDetails, RichRoster, Player } from "../types";
import { Calendar, User2, Swords, Trophy, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface MatchupsViewProps {
  league: LeagueDetails;
  userRosterId: number;
}

export default function MatchupsView({ league, userRosterId }: MatchupsViewProps) {
  const { standings, matches, currentWeek, rosterPositions } = league;

  // 1. Find user's roster
  const userRoster = standings.find((r) => r.roster_id === userRosterId);
  if (!userRoster) {
    return (
      <div className="text-center py-12 bg-slate-900 rounded-xl border border-slate-800">
        <p className="text-sm font-sans text-slate-500">No team roster data found.</p>
      </div>
    );
  }

  // 2. Find matching matchmaking group
  const matchupId = userRoster.matchupId;
  const activeMatch = matches.find((m) => m.matchupId === matchupId);

  // 3. Find opponent roster inside matchup
  const opponentBrief = activeMatch?.teams.find((t) => t.roster_id !== userRosterId);
  const opponentRoster = opponentBrief 
    ? standings.find((r) => r.roster_id === opponentBrief.roster_id)
    : null;

  // If no active matchups or play-offs are running
  if (!activeMatch || !opponentRoster) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3 shadow shadow-slate-950/20">
        <Calendar className="text-slate-600" size={36} />
        <h3 className="text-md font-sans font-semibold text-slate-200">No Active Matchup Scheduled</h3>
        <p className="text-xs text-slate-500 font-sans max-w-sm leading-relaxed">
          The league is currently in off-season, early draft preparations, or play-off scheduling. Standing histories represent regular-season points.
        </p>
      </div>
    );
  }

  // Resolve position list (starters)
  const starterPositionsOnly = rosterPositions.filter((pos) => pos !== "BN");

  // Format starters side-by-side for comparison list
  const userStartersPool = [...userRoster.starters];
  const opponentStartersPool = [...opponentRoster.starters];

  const matchedLineups: {
    positionLabel: string;
    userPlayer: Player | null;
    userPoints: number;
    opponentPlayer: Player | null;
    opponentPoints: number;
  }[] = [];

  starterPositionsOnly.forEach((posLabel) => {
    // Find player in user starters
    let userIdx = -1;
    if (posLabel === "FLEX" || posLabel === "SUPER_FLEX") {
      userIdx = userStartersPool.findIndex((p) => ["RB", "WR", "TE", "QB"].includes(p.position));
    } else {
      userIdx = userStartersPool.findIndex((p) => p.position === posLabel);
    }
    const userPlayer = userIdx !== -1 ? userStartersPool.splice(userIdx, 1)[0] : null;

    // Find player in opponent starters
    let oppIdx = -1;
    if (posLabel === "FLEX" || posLabel === "SUPER_FLEX") {
      oppIdx = opponentStartersPool.findIndex((p) => ["RB", "WR", "TE", "QB"].includes(p.position));
    } else {
      oppIdx = opponentStartersPool.findIndex((p) => p.position === posLabel);
    }
    const opponentPlayer = oppIdx !== -1 ? opponentStartersPool.splice(oppIdx, 1)[0] : null;

    // Retrieve points if saved in matchup
    const userPoints = userPlayer ? (userRoster.startersIdsWithPoints?.[userPlayer.id] || 0) : 0;
    const opponentPoints = opponentPlayer ? (opponentRoster.startersIdsWithPoints?.[opponentPlayer.id] || 0) : 0;

    matchedLineups.push({
      positionLabel: posLabel,
      userPlayer,
      userPoints,
      opponentPlayer,
      opponentPoints
    });
  });

  // Append any excess starters remaining in pool
  const maxExcessLength = Math.max(userStartersPool.length, opponentStartersPool.length);
  for (let i = 0; i < maxExcessLength; i++) {
    const userP = userStartersPool[i] || null;
    const oppP = opponentStartersPool[i] || null;

    matchedLineups.push({
      positionLabel: "FLEX",
      userPlayer: userP,
      userPoints: userP ? (userRoster.startersIdsWithPoints?.[userP.id] || 0) : 0,
      opponentPlayer: oppP,
      opponentPoints: oppP ? (opponentRoster.startersIdsWithPoints?.[oppP.id] || 0) : 0
    });
  }

  // 4. Score Totals
  const userTotal = userRoster.pointsThisWeek;
  const oppTotal = opponentRoster.pointsThisWeek;
  const userLead = userTotal > oppTotal;
  const oppLead = oppTotal > userTotal;

  // Asset CDN Paths
  const userAvatar = userRoster.ownerDetails.avatar
    ? `https://sleepercdn.com/avatars/thumbs/${userRoster.ownerDetails.avatar}`
    : null;

  const oppAvatar = opponentRoster.ownerDetails.avatar
    ? `https://sleepercdn.com/avatars/thumbs/${opponentRoster.ownerDetails.avatar}`
    : null;

  return (
    <div className="space-y-6" id="matchups-view-container">
      
      {/* Side-by-Side Headline Scoreboard */}
      <div className="bg-[#ba8659]/5 border border-[#ba8659]/15 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-black/10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-5 pointer-events-none text-[#ba8659]">
          <Swords size={200} />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          {/* User Franchise Score */}
          <div className="text-center md:text-left flex-1 space-y-1.5 order-2 md:order-1">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              {userAvatar ? (
                <img src={userAvatar} alt="My Team logo" className="w-9 h-9 rounded-full border border-white/15 shadow-md shadow-black/10 animate-fade-in" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#ba8659]/10 text-[#ba8659] flex items-center justify-center text-xs font-bold border border-[#ba8659]/25">U</div>
              )}
              <div>
                <h4 className="text-md font-sans font-bold text-slate-100">{userRoster.ownerDetails.team_name}</h4>
                <p className="text-2xs text-white/40 font-sans mt-0.5">@{userRoster.ownerDetails.display_name}</p>
              </div>
            </div>

            <div className="pt-2">
              <h2 className={`text-4xl font-mono font-black ${userLead ? 'text-[#ba8659]' : 'text-slate-400'}`}>
                {userTotal.toFixed(2)}
              </h2>
              {userLead && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-mono uppercase bg-[#ba8659]/15 border border-[#ba8659]/25 text-[#ba8659] font-bold px-2 py-0.5 rounded">
                  <Trophy size={10} /> Lead
                </span>
              )}
            </div>
          </div>

          {/* Versus Center-Mark */}
          <div className="text-center space-y-1 w-full md:w-32 order-1 md:order-2 pb-4 md:pb-0 border-b border-white/10 md:border-b-0">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold">Week {currentWeek}</span>
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wilder bg-white/10 px-3 py-1 rounded-full border border-white/10 inline-block backdrop-blur">
              VS
            </div>
          </div>

          {/* Opponent Franchise Score */}
          <div className="text-center md:text-right flex-1 space-y-1.5 order-3">
            <div className="flex items-center justify-center md:justify-end gap-2.5">
              <div className="text-right">
                <h4 className="text-md font-sans font-bold text-slate-100">{opponentRoster.ownerDetails.team_name}</h4>
                <p className="text-2xs text-white/40 font-sans mt-0.5">@{opponentRoster.ownerDetails.display_name}</p>
              </div>
              {oppAvatar ? (
                <img src={oppAvatar} alt="Opponent logo" className="w-9 h-9 rounded-full border border-white/15 shadow-md shadow-black/10" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center text-xs font-bold border border-rose-500/25">O</div>
              )}
            </div>

            <div className="pt-2">
              <h2 className={`text-4xl font-mono font-black ${oppLead ? 'text-[#ba8659]' : 'text-slate-400'}`}>
                {oppTotal.toFixed(2)}
              </h2>
              {oppLead && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-mono uppercase bg-[#ba8659]/15 border border-[#ba8659]/25 text-[#ba8659] font-bold px-2 py-0.5 rounded">
                  <Trophy size={10} /> Lead
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Roster Matchup Player comparison board */}
      <div className="space-y-4">
        <h3 className="text-sm font-sans font-semibold text-white/85">Starter Head-To-Head Duel</h3>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-5 space-y-3.5 shadow-xl shadow-black/10">
          {matchedLineups.map((match, i) => {
            const hasUserP = match.userPlayer !== null;
            const hasOppP = match.opponentPlayer !== null;

            // Highlight who won the individual matchup
            const userPts = match.userPoints;
            const oppPts = match.opponentPoints;
            const userMatchLead = userPts > oppPts;
            const oppMatchLead = oppPts > userPts;

            return (
              <div
                key={i}
                className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-3.5 rounded-xl bg-white/2 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-200 gap-3"
              >
                {/* Left Side: User Player */}
                <div className="flex-1 flex justify-start items-center gap-3">
                  {hasUserP ? (
                    <>
                      <div className="text-right">
                        <span className={`text-xs font-mono font-bold leading-none ${userMatchLead ? 'text-[#ba8659]' : 'text-slate-400'}`}>
                          {userPts.toFixed(1)}
                        </span>
                        <p className="text-[10px] text-white/40 block font-mono mt-0.5">{match.userPlayer.team || "FA"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{match.userPlayer.full_name}</p>
                        <p className="text-3xs font-mono uppercase tracking-widest text-white/40 mt-0.5">{match.userPlayer.position}</p>
                      </div>
                    </>
                  ) : (
                    <span className="text-3xs font-mono text-white/20 italic">Empty roster slot</span>
                  )}
                </div>

                {/* Center Position Slot Badge */}
                <span className="w-16 text-center text-[9px] font-mono font-black tracking-wider px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 uppercase text-center self-center">
                  {match.positionLabel === "SUPER_FLEX" ? "SF" : match.positionLabel}
                </span>

                {/* Right Side: Opponent Player */}
                <div className="flex-1 flex justify-end items-center gap-3 text-right">
                  {hasOppP ? (
                    <>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{match.opponentPlayer.full_name}</p>
                        <p className="text-3xs font-mono uppercase tracking-widest text-white/40 mt-0.5">{match.opponentPlayer.position}</p>
                      </div>
                      <div className="text-left">
                        <span className={`text-xs font-mono font-bold leading-none ${oppMatchLead ? 'text-[#ba8659]' : 'text-slate-400'}`}>
                          {oppPts.toFixed(1)}
                        </span>
                        <p className="text-[10px] text-white/40 block font-mono mt-0.5">{match.opponentPlayer.team || "FA"}</p>
                      </div>
                    </>
                  ) : (
                    <span className="text-3xs font-mono text-white/20 italic">Empty roster slot</span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
