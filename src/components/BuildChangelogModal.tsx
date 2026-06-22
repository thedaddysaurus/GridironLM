import React from "react";
import { X, Trophy, Zap, Cpu, Award, Sparkles, Sliders } from "lucide-react";
import { motion } from "motion/react";

interface BuildChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BuildItem {
  version: string;
  codename: string;
  date: string;
  isLatest?: boolean;
  isInitial?: boolean;
  title: string;
  tagline: string;
  releaseInsight: string;
  details: {
    category: "feature" | "fix" | "core";
    text: string;
  }[];
}

const BUILD_LOG: BuildItem[] = [
  {
    version: "BETA 1.6",
    codename: "Automated Build Portal",
    date: "June 21, 2026",
    isLatest: true,
    title: "Version Portal & Automated Build Sync",
    tagline: "Unveiled interactive build history logs with automated, jargon-free summary logs.",
    releaseInsight: "Created a clickable release ledger in the footer. It maps our previous versions alongside plain-English summaries of exactly what was introduced or fixed, allowing coaches and users to browse of all past updates without getting lost in programmer speak.",
    details: [
      { category: "feature", text: "Connected the footer's Beta version label directly to this modal, enabling users to click the version number to reveal a historical build ledger." },
      { category: "feature", text: "Rewrote all automated system logs, replacing complicated technical terminology with simple, layman-friendly sports-dashboard descriptions to prioritize user clarity." }
    ]
  },
  {
    version: "BETA 1.5",
    codename: "Bronze Gridiron Overlay",
    date: "June 21, 2026",
    title: "SVG Vector Overlay & Animation Optimization",
    tagline: "Performance tune-ups resolving interactive state rendering glitches.",
    releaseInsight: "Fixed a glitch where hovering over the logo showed a persistent black box. We swapped out some heavy graphic filters for a lighter, modern glow style, making the page run much smoother and look perfect when you slide your cursor over it.",
    details: [
      { category: "fix", text: "Overhauled Gridiron logo elements. Replaced raw SVG filter drop-shadow properties with structured absolute radial-blur CSS backdrops, successfully resolving the persistent black outline glitch upon hover." },
      { category: "feature", text: "Optimized transaction marquee ticker to flow continuously without interruption. Disabled 'pause on hover' constraint to prevent interactive state blocking during dense data streams." },
      { category: "core", text: "Incremented the global framework build tracker to BETA 1.5." }
    ]
  },
  {
    version: "BETA 1.4",
    codename: "Chronicle Accordance",
    date: "June 15, 2026",
    title: "Season Back-Catalogue & Accolade Matrix",
    tagline: "Expanded dynasty records tracking across historical rosters, awards, and luck indices.",
    releaseInsight: "Created a tool that digs into your Sleeper league's past seasons. It automatically pulls old roster details and compares match schedules to spotlight who had the best rosters, who got hit with the worst schedule luck, and who truly earned the crown.",
    details: [
      { category: "feature", text: "Integrated historical standing matrices. Enabled back-catalogue navigation dropdown inside the league panel, allowing quick swaps between different active seasons." },
      { category: "feature", text: "Constructed the League Accolade Engine & Trophy Room. Dynamically computes 'Points Captain', 'Worst Luck' scheduler indices, and 'Luckiest Route' coefficients per season." },
      { category: "feature", text: "Historical Roster Mapping. Programmed state retention matching past starting rosters, positions, and bench records for precise chronological checks." }
    ]
  },
  {
    version: "BETA 1.3",
    codename: "Dynasty Engine Core",
    date: "May 29, 2026",
    title: "Sleeper Data Cache Pipelines & Live Marquees",
    tagline: "Architected modern caching abstractions to dramatically speed up user query cycles.",
    releaseInsight: "Speed up how fast team rosters load by saving a copy of the league data directly in your browser. This cuts down on constant internet requests, making dashboards and live transaction tickers feel snappy and instant.",
    details: [
      { category: "core", text: "Introduced advanced Stale-While-Revalidate (SWR) localStorage cache for roster payloads and user statistics." },
      { category: "feature", text: "Built the real-time Transaction Ledger ticker interface, rendering trades, waiver acquisitions, and cuts dynamically." },
      { category: "feature", text: "Engineered responsive team grid roster cards, fully mapped with starter-to-bench color markers and positional status cues." }
    ]
  },
  {
    version: "BETA 1.2",
    codename: "Athletic Fluidity",
    date: "May 10, 2026",
    title: "Tactile Densities & Unified Dark Color space",
    tagline: "Refined container spacing guidelines, touch geometries, and technical typography rules.",
    releaseInsight: "Unveiled a clean, high-contrast dark theme built for football fans. We enlarged buttons so they are much easier to tap on mobile, tightened up page spacing, and refined the text styling to feel like a premium sports manager dashboard.",
    details: [
      { category: "feature", text: "Increased interactive button targets to 48px to accommodate responsive mobile tap states gracefully." },
      { category: "core", text: "Established the unified Dark Copper color scheme, pairing rich #0a0c0b backgrounds with deep bronze accents and glowing typography indices." },
      { category: "feature", text: "Injected dual-font aesthetic system: Outfit/Space Grotesk for technical sport numbering, matched with Inter for data readability." }
    ]
  },
  {
    version: "BETA 1.1",
    codename: "First Snap",
    date: "April 20, 2026",
    isInitial: true,
    title: "Node.js Platform Port & Secure API Gateways",
    tagline: "Established full-stack routing configuration with secure proxy layers.",
    releaseInsight: "Laid down the main core of the website by connecting our backend server securely to the Sleeper league's networks. This established the foundational template for our main dashboards, team grids, and real-time menus.",
    details: [
      { category: "core", text: "Configured unified Express-Vite reverse-proxy pipeline served reliably on secure port 3000." },
      { category: "core", text: "Mapped basic Sleeper REST endpoints to ingest data covering general portfolios, league status, and active rosters." },
      { category: "feature", text: "Laid down global gridiron UI master template, header architecture, and navigation structures." }
    ]
  }
];

export default function BuildChangelogModal({ isOpen, onClose }: BuildChangelogModalProps) {
  if (!isOpen) return null;

  return (
    <div id="build-changelog-modal" className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4 selection:bg-[#ba8659]/30">
      
      {/* Backdrop Closer */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
        className="relative z-10 max-w-4xl w-full bg-[#0a0d0c] border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[85vh]"
      >
        
        {/* Decorative Top Glowing Stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#ba8659]/80 to-transparent" />

        {/* Header Block */}
        <div className="px-6 py-5 md:px-8 border-b border-white/5 bg-[#121614]/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#ba8659]/10 border border-[#ba8659]/30 text-[#ba8659]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-mono uppercase tracking-widest text-[#fcf9f5]">GRIDIRON LM BUILD LEDGER</h2>
                <div className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-400">
                  AUTO COMPILED
                </div>
              </div>
              <p className="text-[11px] text-white/50 font-sans mt-0.5">Automated diagnostics and iteration logs across historic version updates</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-white/5 bg-white/2 hover:bg-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Timeline Content */}
        <div className="overflow-y-auto p-6 md:p-8 flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          
          <div className="relative border-l border-white/5 pl-6 sm:pl-8 ml-3 space-y-12">
            {BUILD_LOG.map((build, index) => (
              <div key={build.version} className="relative group/timeline">
                
                {/* Timeline Node Badge / Dot */}
                <div className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full flex items-center justify-center border-2 transition-all duration-300 group-hover/timeline:scale-125 ${
                  build.isLatest 
                    ? "bg-[#ba8659] border-[#ba8659] shadow-[0_0_12px_rgba(186,134,89,0.5)]" 
                    : "bg-[#0a0d0c] border-white/30 group-hover/timeline:border-[#ba8659]"
                }`}>
                  {build.isLatest && <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                </div>

                {/* Build Entry Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded tracking-wider ${
                      build.isLatest 
                        ? "bg-[#ba8659]/90 text-black font-semibold" 
                        : "bg-white/5 text-white/70"
                    }`}>
                      {build.version}
                    </span>
                    <span className="text-3xs font-mono tracking-widest text-[#ba8659]/75 uppercase">
                      // {build.codename}
                    </span>
                  </div>
                  <span className="text-3xs font-mono text-white/30 uppercase">
                    DEPLOYED: {build.date}
                  </span>
                </div>

                {/* Build Details Container */}
                <div className="rounded-xl border border-white/5 bg-[#121614]/30 group-hover/timeline:border-[#ba8659]/20 group-hover/timeline:bg-[#121614]/40 p-4 transition-all duration-300">
                  <h3 className="text-sm font-sans font-medium text-white tracking-wide">{build.title}</h3>
                  <p className="text-xs text-white/60 font-sans mt-1 leading-relaxed">{build.tagline}</p>

                  {/* Automated Release Insight box */}
                  <div className="mt-4 p-3.5 rounded-lg bg-[#0e1211] border border-[#ba8659]/10 text-white/75 relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#ba8659]/15 border-b border-l border-[#ba8659]/10 text-[8px] font-mono font-medium tracking-wider text-[#ba8659] rounded-bl">
                      RELEASE INSIGHT
                    </div>
                    <p className="text-2xs font-mono leading-relaxed pr-8">
                      {build.releaseInsight}
                    </p>
                  </div>

                  {/* Bullet Points with Tags */}
                  <div className="mt-4 space-y-2">
                    {build.details.map((detail, dIdx) => (
                      <div key={dIdx} className="flex gap-2.5 items-start text-xs font-sans">
                        <span className={`inline-block text-[9px] font-mono uppercase px-1.5 py-0.5 rounded mt-0.5 shrink-0 select-none ${
                          detail.category === "feature" 
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
                            : detail.category === "fix"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        }`}>
                          {detail.category}
                        </span>
                        <p className="text-white/70 leading-relaxed font-mono text-[11px]">{detail.text}</p>
                      </div>
                    ))}
                  </div>

                </div>

              </div>
            ))}
          </div>

        </div>

        {/* Footer info line */}
        <div className="px-6 py-4 bg-[#121614]/60 border-t border-white/5 text-center flex items-center justify-between">
          <span className="text-[10px] font-mono text-white/30 uppercase">Build Tracked live on Kubernetes context</span>
          <button 
            onClick={onClose}
            className="text-[10.5px] font-mono uppercase tracking-widest text-[#ba8659] hover:underline cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>

      </motion.div>
    </div>
  );
}
