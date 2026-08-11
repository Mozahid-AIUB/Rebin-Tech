import type { ColorValue } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

// One icon set for every portal's tab bar. Shared line style (24px grid,
// 1.7 stroke, round joins) so the three tabs read as a set -- mixing filled
// and outlined marks in a tab bar is the fastest way to make navigation look
// assembled from stock parts.

// ColorValue, not string: this is what expo-router hands `tabBarIcon`, and
// react-native-svg accepts it directly for stroke/fill. Narrowing to string
// here would force every call site to cast.
type Props = { color: ColorValue };
const S = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none" } as const;
const STROKE = { strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function HomeIcon({ color }: Props) {
  return (
    <Svg {...S}>
      <Path d="M3.5 10.5 12 3.5l8.5 7" stroke={color} {...STROKE} />
      <Path d="M5.5 9.5V20a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V9.5" stroke={color} {...STROKE} />
      <Path d="M9.5 20.5V14h5v6.5" stroke={color} {...STROKE} />
    </Svg>
  );
}

/** Requests / job list: a clipboard of line items. */
export function ListIcon({ color }: Props) {
  return (
    <Svg {...S}>
      <Rect x="4.5" y="4.5" width="15" height="16" rx="2.5" stroke={color} {...STROKE} />
      <Path d="M9 3.5h6v3H9z" stroke={color} {...STROKE} />
      <Path d="M8.5 11h7M8.5 15h4.5" stroke={color} {...STROKE} />
    </Svg>
  );
}

/** The organization itself: a facility, not a person. */
export function BuildingIcon({ color }: Props) {
  return (
    <Svg {...S}>
      <Path d="M4.5 20.5V6.2a.7.7 0 0 1 .48-.66l7-2.33a.7.7 0 0 1 .92.66V20.5" stroke={color} {...STROKE} />
      <Path d="M12.9 9.5h5.6a.7.7 0 0 1 .7.7v10.3" stroke={color} {...STROKE} />
      <Path d="M3 20.5h18" stroke={color} {...STROKE} />
      <Path d="M7.5 8.5v.01M7.5 12v.01M9.8 8.5v.01M9.8 12v.01M15.5 13v.01M15.5 16.5v.01" stroke={color} {...STROKE} />
    </Svg>
  );
}

/** Quotes / pricing. */
export function TagIcon({ color }: Props) {
  return (
    <Svg {...S}>
      <Path d="M11 3.5H20.5V13l-8.7 8.7a1.5 1.5 0 0 1-2.1 0l-7.4-7.4a1.5 1.5 0 0 1 0-2.1L11 3.5Z" stroke={color} {...STROKE} />
      <Circle cx="16.2" cy="7.8" r="1.4" stroke={color} {...STROKE} />
    </Svg>
  );
}

/** Completed work / history. */
export function HistoryIcon({ color }: Props) {
  return (
    <Svg {...S}>
      <Circle cx="12" cy="12" r="8.5" stroke={color} {...STROKE} />
      <Path d="M12 7v5.2l3.4 2" stroke={color} {...STROKE} />
    </Svg>
  );
}

export function PersonIcon({ color }: Props) {
  return (
    <Svg {...S}>
      <Circle cx="12" cy="8.5" r="3.7" stroke={color} {...STROKE} />
      <Path d="M4.8 20.3a7.4 7.4 0 0 1 14.4 0" stroke={color} {...STROKE} />
    </Svg>
  );
}
