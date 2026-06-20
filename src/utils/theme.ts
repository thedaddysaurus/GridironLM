export interface OwnerTheme {
  text: string;
  badge: string;
  border: string;
  glow: string;
  avatarBg: string;
}

const ownerColors: OwnerTheme[] = [
  {
    text: "text-rose-400",
    badge: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    border: "border-rose-500/10",
    glow: "shadow-rose-500/5 hover:border-rose-500/30",
    avatarBg: "from-rose-500/20 to-rose-950/20 text-rose-300"
  },
  {
    text: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    border: "border-emerald-500/10",
    glow: "shadow-emerald-500/5 hover:border-emerald-500/30",
    avatarBg: "from-emerald-500/20 to-emerald-950/20 text-emerald-300"
  },
  {
    text: "text-sky-400",
    badge: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
    border: "border-sky-500/10",
    glow: "shadow-sky-500/5 hover:border-sky-500/30",
    avatarBg: "from-sky-500/20 to-sky-950/20 text-sky-300"
  },
  {
    text: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    border: "border-amber-500/10",
    glow: "shadow-amber-500/5 hover:border-amber-500/30",
    avatarBg: "from-amber-500/20 to-amber-950/20 text-amber-300"
  },
  {
    text: "text-pink-400",
    badge: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
    border: "border-pink-500/10",
    glow: "shadow-pink-500/5 hover:border-pink-500/30",
    avatarBg: "from-pink-500/20 to-pink-950/20 text-pink-300"
  },
  {
    text: "text-cyan-400",
    badge: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    border: "border-cyan-500/10",
    glow: "shadow-cyan-500/5 hover:border-cyan-500/30",
    avatarBg: "from-cyan-500/20 to-cyan-950/20 text-cyan-300"
  },
  {
    text: "text-teal-400",
    badge: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
    border: "border-teal-500/10",
    glow: "shadow-teal-500/5 hover:border-teal-500/30",
    avatarBg: "from-teal-500/20 to-teal-950/20 text-teal-300"
  },
  {
    text: "text-orange-400",
    badge: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    border: "border-orange-500/10",
    glow: "shadow-orange-500/5 hover:border-orange-500/30",
    avatarBg: "from-orange-500/20 to-orange-950/20 text-orange-300"
  },
  {
    text: "text-indigo-400",
    badge: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    border: "border-indigo-500/10",
    glow: "shadow-indigo-500/5 hover:border-indigo-500/30",
    avatarBg: "from-indigo-500/20 to-indigo-950/20 text-indigo-300"
  },
  {
    text: "text-violet-400",
    badge: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
    border: "border-violet-500/10",
    glow: "shadow-violet-500/5 hover:border-violet-500/30",
    avatarBg: "from-violet-500/20 to-violet-950/20 text-violet-300"
  },
  {
    text: "text-fuchsia-400",
    badge: "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20",
    border: "border-fuchsia-500/10",
    glow: "shadow-fuchsia-500/5 hover:border-fuchsia-500/30",
    avatarBg: "from-fuchsia-500/20 to-fuchsia-950/20 text-fuchsia-300"
  },
  {
    text: "text-purple-400",
    badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    border: "border-purple-500/10",
    glow: "shadow-purple-500/5 hover:border-purple-500/30",
    avatarBg: "from-purple-500/20 to-purple-950/20 text-purple-300"
  }
];

export function getOwnerTheme(seed: string | number): OwnerTheme {
  const str = String(seed || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ownerColors.length;
  return ownerColors[index];
}
