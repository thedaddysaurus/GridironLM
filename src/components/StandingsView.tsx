import React from "react";
import { RichRoster } from "../types";
import { Trophy, TrendingUp, ShieldAlert, Award } from "lucide-react";
import { motion } from "motion/react";
import { getOwnerTheme } from "../utils/theme";

interface StandingsViewProps {
  standings: RichRoster[];
  userRosterId: number;
}

export default function StandingsView({ standings, userRosterId }: StandingsViewProps) {
  return (
    <div className="space-y-6" id="standings-view-container">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-sans font-semibold text-white/80 flex items-center gap-2">
          <Trophy className="text-[#ba8659] animate-pulse" size={18} />
          League Standings Board
        </h2>
        <span className="text-2xs font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40">
          {standings.length} Teams Competing
        </span>
      </div>

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
                const isUser = roster.roster_id === userRosterId;
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
    </div>
  );
}
