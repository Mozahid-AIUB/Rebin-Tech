import Svg, { Circle, Path, Rect } from "react-native-svg";

// Role glyphs for the signup picker. Line icons at a shared 22px / 1.6 stroke
// so the three cards read as one set -- a mix of filled and outlined marks is
// the fastest way to make a picker look assembled from stock parts. Kept in
// apps/mobile (not packages/ui) because they're specific to this one screen's
// three choices, not general-purpose primitives another screen needs.

const S = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none" } as const;
const STROKE = { strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Organization: an institutional building. */
export function OrgIcon({ color }: { color: string }) {
  return (
    <Svg {...S}>
      <Path d="M3 21h18" stroke={color} {...STROKE} />
      <Path d="M5 21V6.5L12 3l7 3.5V21" stroke={color} {...STROKE} />
      <Path d="M9.5 21v-4.5h5V21" stroke={color} {...STROKE} />
      <Path d="M9 10h1.5M13.5 10H15" stroke={color} {...STROKE} />
    </Svg>
  );
}

/** Business owner: a shopfront with an awning. */
export function BusinessIcon({ color }: { color: string }) {
  return (
    <Svg {...S}>
      <Path d="M4 9.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5" stroke={color} {...STROKE} />
      <Path d="M3 9.5 4.8 4h14.4L21 9.5a3 3 0 0 1-5.4 1.6 3 3 0 0 1-5.2 0A3 3 0 0 1 3 9.5Z" stroke={color} {...STROKE} />
      <Rect x="9" y="14" width="6" height="7" rx="1" stroke={color} {...STROKE} />
    </Svg>
  );
}

/** Field agent: a route pin, the collection run itself. */
export function AgentIcon({ color }: { color: string }) {
  return (
    <Svg {...S}>
      <Path d="M12 21s6.5-5.4 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21 12 21Z" stroke={color} {...STROKE} />
      <Circle cx="12" cy="10.5" r="2.4" stroke={color} {...STROKE} />
    </Svg>
  );
}
