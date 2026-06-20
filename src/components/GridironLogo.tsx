import React from "react";

interface GridironLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export default function GridironLogo({ size = 24, className = "", animate = false }: GridironLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animate ? "hover:scale-105 transition-transform duration-350" : ""}`}
    >
      {/* Dynamic Background Circle/Glow Area */}
      <defs>
        <radialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ba8659" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ba8659" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="leatherGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cca57d" />
          <stop offset="50%" stopColor="#ba8659" />
          <stop offset="100%" stopColor="#885c39" />
        </linearGradient>
        <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#424242" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
      </defs>

      {/* Subtle background glow */}
      <circle cx="50%" cy="50%" r="48" fill="url(#logoGlow)" />

      {/* Outer Tactical Athletic Shield */}
      <path
        d="M50 12 L82 24 V52 C82 70 68 84 50 88 C32 84 18 70 18 52 V24 L50 12 Z"
        fill="url(#shieldGradient)"
        stroke="#ba8659"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data/Grid lines behind the football */}
      <line x1="30" y1="38" x2="70" y2="38" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.1" strokeDasharray="3 3" />
      <line x1="26" y1="50" x2="74" y2="50" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.1" strokeDasharray="3 3" />
      <line x1="30" y1="62" x2="70" y2="62" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.1" strokeDasharray="3 3" />

      {/* Stylized Modern Football in the Center */}
      {/* Left/Right Elliptical Arches */}
      <path
        d="M50 28 C64 36 68 50 68 50 C68 50 64 64 50 72 C36 64 32 50 32 50 C32 50 36 36 50 28 Z"
        fill="url(#leatherGradient)"
        stroke="#ffffff"
        strokeWidth="1"
        className={animate ? "origin-center hover:rotate-12 transition-transform duration-500" : ""}
      />

      {/* Football Laces - Sharp Clean White */}
      <line x1="50" y1="36" x2="50" y2="64" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      {/* Horizontal stitch marks */}
      <line x1="43" y1="43" x2="57" y2="43" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="41" y1="50" x2="59" y2="50" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="43" y1="57" x2="57" y2="57" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

      {/* Sleek Tactical Corner Dots representing statistical data points */}
      <circle cx="50" cy="18" r="2" fill="#ffffff" />
      <circle cx="50" cy="81" r="2.5" fill="#ba8659" />
    </svg>
  );
}
