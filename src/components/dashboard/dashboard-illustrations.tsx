/**
 * Decorative SVG illustrations for the dashboard. They are purely visual
 * (aria-hidden) and use gradients/ids prefixed per-illustration so several
 * can live on one page without clashing.
 */

export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 440 270" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ha-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4F8DFF" />
          <stop offset="1" stopColor="#1646C9" />
        </linearGradient>
        <linearGradient id="ha-inner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EAF3FF" />
          <stop offset="1" stopColor="#CFE1FF" />
        </linearGradient>
        <linearGradient id="ha-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4F8FF" />
          <stop offset="1" stopColor="#B9CFF5" />
        </linearGradient>
        <linearGradient id="ha-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1A9C93" />
          <stop offset="1" stopColor="#0B5F6E" />
        </linearGradient>
        <linearGradient id="ha-leaf2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3FA7FF" />
          <stop offset="1" stopColor="#1B59D6" />
        </linearGradient>
        <linearGradient id="ha-plane" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8EC1FF" />
          <stop offset="1" stopColor="#2F74F0" />
        </linearGradient>
        <radialGradient id="ha-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id="ha-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#0B3A9A" floodOpacity="0.25" />
        </filter>
      </defs>

      <ellipse cx="250" cy="150" rx="210" ry="120" fill="url(#ha-glow)" />
      <circle cx="110" cy="200" r="58" fill="#C4DBFF" opacity="0.55" />
      <circle cx="360" cy="70" r="46" fill="#D6E7FF" opacity="0.7" />

      {/* laptop base */}
      <path d="M78 226 L128 204 L396 204 L430 226 Q432 238 418 240 L92 240 Q76 238 78 226Z" fill="url(#ha-base)" filter="url(#ha-shadow)" />
      <path d="M176 222 h110 a4 4 0 0 1 0 6 h-110 a4 4 0 0 1 0 -6z" fill="#9FB9E6" opacity="0.65" />
      <path d="M86 236 L424 236" stroke="#8FB0EC" strokeWidth="2" opacity="0.6" />

      {/* laptop screen */}
      <path d="M150 52 Q150 44 158 43 L372 28 Q384 27 384 39 L390 198 Q390 206 382 206 L142 206 Q134 206 135 198Z" fill="url(#ha-screen)" filter="url(#ha-shadow)" />
      <path d="M160 64 L372 48 L378 190 L150 190Z" fill="url(#ha-inner)" />

      {/* envelope on screen */}
      <g transform="translate(262 122)">
        <rect x="-62" y="-38" width="124" height="82" rx="10" fill="#FFFFFF" />
        <path d="M-62 -28 L0 14 L62 -28" fill="none" stroke="#A9C6F5" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M-62 -28 Q-62 -38 -52 -38 L52 -38 Q62 -38 62 -28 L0 14Z" fill="#E4EEFF" />
        <rect x="-18" y="-30" width="36" height="6" rx="3" fill="#3B7BF4" opacity="0.85" />
      </g>

      {/* floating stats card */}
      <g filter="url(#ha-shadow)">
        <rect x="26" y="74" width="118" height="60" rx="10" fill="#FFFFFF" />
      </g>
      <rect x="38" y="88" width="52" height="6" rx="3" fill="#C9D9F3" />
      <rect x="38" y="102" width="36" height="6" rx="3" fill="#DCE7F8" />
      <rect x="38" y="116" width="44" height="6" rx="3" fill="#DCE7F8" />
      <rect x="98" y="108" width="9" height="16" rx="2" fill="#7FB0FF" />
      <rect x="111" y="98" width="9" height="26" rx="2" fill="#3F86F7" />
      <rect x="124" y="86" width="9" height="38" rx="2" fill="#1F64E6" />

      {/* paper plane */}
      <g transform="translate(346 12) rotate(6) scale(0.92)">
        <path d="M0 26 L62 0 L42 50 L28 34 Z" fill="url(#ha-plane)" />
        <path d="M28 34 L62 0 L34 40Z" fill="#1F5BDB" opacity="0.55" />
        <path d="M28 34 L30 52 L40 42Z" fill="#6CA6FF" />
      </g>
      <path d="M318 54 Q332 42 352 36" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" opacity="0.9" />

      {/* small plant, left of the laptop */}
      <g transform="translate(112 196)">
        <path d="M0 0 Q-16 -32 -6 -60 Q6 -30 0 0Z" fill="url(#ha-leaf2)" />
        <path d="M2 0 Q12 -28 30 -44 Q24 -16 2 0Z" fill="url(#ha-leaf2)" opacity="0.85" />
        <path d="M-2 0 Q-26 -20 -34 -40 Q-10 -28 -2 0Z" fill="url(#ha-leaf2)" opacity="0.7" />
      </g>

      {/* big plant, right of the laptop */}
      <g transform="translate(404 204)">
        <path d="M-8 0 Q-34 -40 -24 -92 Q-2 -52 -8 0Z" fill="url(#ha-leaf)" />
        <path d="M0 0 Q-6 -56 8 -108 Q22 -56 0 0Z" fill="url(#ha-leaf)" />
        <path d="M6 0 Q20 -44 44 -76 Q42 -30 6 0Z" fill="url(#ha-leaf)" opacity="0.9" />
        <path d="M-10 0 Q-44 -22 -56 -58 Q-18 -44 -10 0Z" fill="url(#ha-leaf)" opacity="0.8" />
        <path d="M-22 0 h42 l-6 34 a8 8 0 0 1 -8 6 h-14 a8 8 0 0 1 -8 -6z" fill="#FFFFFF" />
        <path d="M-22 0 h42 l-1 6 h-40z" fill="#E3ECFA" />
      </g>
    </svg>
  );
}

export function BotArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 130" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ba-head" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4F8DFF" />
          <stop offset="1" stopColor="#1A56E0" />
        </linearGradient>
        <radialGradient id="ba-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#CFE0FF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#CFE0FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="72" rx="86" ry="52" fill="url(#ba-halo)" />
      <ellipse cx="100" cy="74" rx="56" ry="46" fill="#E3EDFF" opacity="0.8" />
      <rect x="97" y="14" width="6" height="14" rx="3" fill="#7FA9F5" />
      <circle cx="100" cy="13" r="4" fill="#3B7BF4" />
      <rect x="64" y="26" width="72" height="62" rx="26" fill="url(#ba-head)" />
      <rect x="72" y="40" width="56" height="34" rx="16" fill="#0E2E86" />
      <circle cx="88" cy="57" r="6.5" fill="#FFFFFF" />
      <circle cx="112" cy="57" r="6.5" fill="#FFFFFF" />
      <circle cx="88" cy="57" r="2.6" fill="#0E2E86" />
      <circle cx="112" cy="57" r="2.6" fill="#0E2E86" />
      <rect x="54" y="48" width="8" height="20" rx="4" fill="#7FA9F5" />
      <rect x="138" y="48" width="8" height="20" rx="4" fill="#7FA9F5" />
      <path d="M78 92 Q100 104 122 92 L118 106 Q100 114 82 106Z" fill="#B7CFF8" />
      <path d="M152 34 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5z" fill="#8AB2F8" />
      <path d="M44 84 l1.8 5 5 1.8 -5 1.8 -1.8 5 -1.8 -5 -5 -1.8 5 -1.8z" fill="#A9C6FA" />
    </svg>
  );
}

export function ChartSearchArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ca-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4F8DFF" />
          <stop offset="1" stopColor="#1A56E0" />
        </linearGradient>
        <radialGradient id="ca-cloud" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#D5E4FF" stopOpacity="0.95" />
          <stop offset="1" stopColor="#D5E4FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="58" rx="70" ry="38" fill="url(#ca-cloud)" />
      <rect x="44" y="52" width="13" height="24" rx="3" fill="url(#ca-bar)" />
      <rect x="62" y="40" width="13" height="36" rx="3" fill="url(#ca-bar)" />
      <rect x="80" y="28" width="13" height="48" rx="3" fill="url(#ca-bar)" />
      <circle cx="108" cy="46" r="20" fill="#FFFFFF" fillOpacity="0.55" stroke="#1A56E0" strokeWidth="6" />
      <path d="M122 61 L140 79" stroke="#1A56E0" strokeWidth="8" strokeLinecap="round" />
      <path d="M98 40 Q104 33 113 35" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

export function EnvelopeArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ea-env" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#69A5FF" />
          <stop offset="1" stopColor="#2B6BE8" />
        </linearGradient>
      </defs>
      <path d="M40 22 L80 4 L120 22Z" fill="#CFE2FF" />
      <rect x="44" y="14" width="72" height="44" rx="5" fill="#FFFFFF" opacity="0.95" />
      <rect x="32" y="30" width="96" height="50" rx="8" fill="url(#ea-env)" />
      <path d="M32 38 Q32 30 40 30 L120 30 Q128 30 128 38 L80 62Z" fill="#8FBBFF" />
      <path d="M32 80 L66 54" stroke="#1F59D6" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
      <path d="M128 80 L94 54" stroke="#1F59D6" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
      <g transform="translate(118 40) rotate(10)">
        <path d="M0 14 L34 0 L22 28 L14 19Z" fill="#CFE3FF" />
        <path d="M14 19 L34 0 L18 22Z" fill="#8FB8F8" />
      </g>
    </svg>
  );
}
