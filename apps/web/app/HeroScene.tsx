/**
 * The app's own hero illustration, on the web.
 *
 * Ported from `packages/ui/src/illustrations/EWasteHero.tsx` rather than
 * redrawn or bought. Two reasons. It is original work — the shapes were built
 * out of this product's own tokens, so there is no licence attached to it and
 * nothing to take down later. And a visitor who sees this on the site and then
 * opens the app sees the same drawing, which is the cheapest kind of
 * consistency there is.
 *
 * The port is mechanical: `react-native-svg` uses the same element and
 * attribute names as SVG proper, so the paths transfer unchanged. What changes
 * is the wrapper (`Svg` → `svg`) and the animation, which was Reanimated in
 * the app and is a CSS keyframe here.
 *
 * IDs are prefixed. Gradient ids are global to the document, and this page also
 * carries the seam and the routing field — two `id="leaf"` definitions would
 * silently resolve to whichever loaded last.
 */
export function HeroScene() {
  return (
    <svg
      className="hero-scene"
      viewBox="0 0 220 220"
      role="img"
      aria-label="Retired equipment gathered around a recycling bin: a monitor, a desktop tower, a laptop, a phone, a keyboard, a mouse and a battery"
    >
      <defs>
        <radialGradient id="hs-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#DCE6DF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#DCE6DF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hs-podium" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="var(--surface-alt)" />
        </linearGradient>
        <linearGradient id="hs-slate" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3D4A44" />
          <stop offset="100%" stopColor="#1B2621" />
        </linearGradient>
        <linearGradient id="hs-screen" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#2B3833" />
          <stop offset="55%" stopColor="#161F1B" />
          <stop offset="100%" stopColor="#22302A" />
        </linearGradient>
        <linearGradient id="hs-alu" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F3F5F2" />
          <stop offset="100%" stopColor="#C9D2CC" />
        </linearGradient>
        <linearGradient id="hs-bin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4E9A6F" />
          <stop offset="45%" stopColor="var(--board)" />
          <stop offset="100%" stopColor="var(--board-deep)" />
        </linearGradient>
        <linearGradient id="hs-rim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5CA97C" />
          <stop offset="100%" stopColor="var(--board-deep)" />
        </linearGradient>
        <linearGradient id="hs-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6FBF8B" />
          <stop offset="100%" stopColor="#2F7D4E" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="220" height="220" fill="url(#hs-glow)" />

      {/* The podium, laid down before the devices so they read as standing on
          it rather than floating above it. */}
      <ellipse cx="110" cy="176" rx="92" ry="17" fill="#DCE6DF" opacity="0.55" />
      <ellipse cx="110" cy="172" rx="88" ry="15" fill="url(#hs-podium)" />

      {/* Back row */}
      <ellipse cx="103" cy="150" rx="34" ry="5" fill="#16241C" opacity="0.1" />
      <rect x="66" y="60" width="74" height="56" rx="6" fill="url(#hs-slate)" />
      <rect x="71" y="65" width="64" height="42" rx="3" fill="url(#hs-screen)" />
      <path d="M71 100 L106 65 h18 L84 107 h-13z" fill="#FFFFFF" opacity="0.05" />
      <rect x="96" y="116" width="14" height="12" fill="#2A352F" />
      <rect x="84" y="127" width="38" height="6" rx="3" fill="url(#hs-slate)" />

      <ellipse cx="164" cy="152" rx="18" ry="4" fill="#16241C" opacity="0.1" />
      <rect x="146" y="76" width="36" height="74" rx="5" fill="url(#hs-slate)" />
      <rect x="152" y="84" width="24" height="3" rx="1.5" fill="#5A6862" opacity="0.7" />
      <rect x="152" y="91" width="24" height="3" rx="1.5" fill="#5A6862" opacity="0.7" />
      <rect x="152" y="105" width="10" height="3" rx="1.5" fill="#7FAF9E" />
      <rect x="146" y="76" width="3" height="74" rx="1.5" fill="#FFFFFF" opacity="0.12" />

      <ellipse cx="46" cy="156" rx="30" ry="5" fill="#16241C" opacity="0.1" />
      <rect x="20" y="92" width="52" height="54" rx="4" fill="url(#hs-slate)" />
      <rect x="25" y="97" width="42" height="42" rx="2" fill="url(#hs-screen)" />
      <path d="M25 135 L58 97 h9 L37 139 h-12z" fill="#FFFFFF" opacity="0.05" />
      <path
        d="M40 122 c-5 -12 6 -19 14 -14 c-6 3 -10 8 -12 15 c-3 -2 -4 -2 -2 -1z"
        fill="url(#hs-leaf)"
        opacity="0.9"
      />
      <path d="M14 146 h64 l6 10 h-76z" fill="url(#hs-alu)" />
      <path d="M14 146 h64 l1 2 h-66z" fill="#FFFFFF" opacity="0.6" />

      {/* The bin, with foliage coming out of it behind the rim */}
      <path d="M96 96 c-14 -10 -12 -28 2 -32 c4 12 4 22 2 32z" fill="url(#hs-leaf)" />
      <path d="M110 92 c-6 -16 4 -30 16 -28 c-4 12 -10 20 -16 28z" fill="url(#hs-leaf)" />
      <path d="M120 98 c8 -12 22 -12 28 -2 c-11 1 -20 5 -28 10z" fill="url(#hs-leaf)" opacity="0.92" />

      <ellipse cx="110" cy="180" rx="40" ry="6" fill="#16241C" opacity="0.14" />
      <path d="M72 110 H148 L138 174 Q137 181 129 181 H91 Q83 181 82 174 Z" fill="url(#hs-bin)" />
      <path d="M86 112 h10 l-7 66 h-9z" fill="#FFFFFF" opacity="0.12" />
      <rect x="66" y="100" width="88" height="15" rx="7" fill="url(#hs-rim)" />
      <rect x="70" y="103" width="80" height="4" rx="2" fill="#FFFFFF" opacity="0.18" />
      <path d="M110 128 l8 14 h-6 l5 8 -15 -1 6 -9 h-6 z" fill="#FFFFFF" opacity="0.95" />

      {/* Front row */}
      <ellipse cx="160" cy="172" rx="12" ry="3" fill="#16241C" opacity="0.12" />
      <rect x="150" y="132" width="21" height="38" rx="5" fill="url(#hs-slate)" />
      <rect x="153" y="136" width="15" height="30" rx="3" fill="url(#hs-screen)" />
      <rect x="150" y="132" width="2.5" height="38" rx="1.2" fill="#FFFFFF" opacity="0.12" />

      <ellipse cx="76" cy="176" rx="30" ry="4" fill="#16241C" opacity="0.12" />
      <path d="M50 160 h54 l6 12 h-66z" fill="url(#hs-slate)" />
      <path d="M53 162 h48 l4 7 h-56z" fill="#48544E" opacity="0.55" />

      <ellipse cx="128" cy="176" rx="11" ry="3" fill="#16241C" opacity="0.12" />
      <path d="M120 168 q0 -12 8 -12 q8 0 8 12 q0 7 -8 7 q-8 0 -8 -7z" fill="url(#hs-slate)" />
      <path d="M127 157 h2 v6 h-2z" fill="#6E7B75" opacity="0.8" />

      <ellipse cx="192" cy="168" rx="10" ry="3" fill="#16241C" opacity="0.12" />
      <rect x="184" y="128" width="17" height="38" rx="4" fill="url(#hs-slate)" />
      <rect x="189" y="123" width="7" height="6" rx="2" fill="#5A6862" />
      <path d="M194 138 l-6 11 h5 l-4 9 9 -13 h-5z" fill="#7FAF9E" />

      {/* The one moving part, as in the app: a leaf drifting at the top right.
          Reanimated there, a CSS keyframe here. */}
      <path
        className="hero-leaf"
        d="M162 34 c12 -10 26 -8 32 4 c-12 3 -21 10 -27 21 c-9 -7 -11 -18 -5 -25z"
        fill="url(#hs-leaf)"
      />
    </svg>
  );
}
