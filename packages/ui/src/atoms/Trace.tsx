import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { AppText } from "./AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

/**
 * The app's structural signature: a copper trace, drawn the way a PCB routes
 * one.
 *
 * A board turns its traces at 45°, never at 90°, because a right-angled trace
 * etches badly — and that constraint is the most recognisable thing about how
 * a board looks. Vias mark the points a route passes through: filled where the
 * route has reached, hollow where it has not.
 *
 * Used only where something genuinely connects — a request's stages, a job's
 * stages. It is a connection, not a divider. A rule under a heading would be
 * decoration wearing the same costume, which is exactly what this replaces.
 */

const VIA = 11;
const GUTTER = 24;
const STEP = 44;

export type TraceStep = { label: string; reached: boolean; note?: string };

export function Trace({ steps }: { steps: readonly TraceStep[] }) {
  const { accent } = usePortalTheme();
  const height = steps.length * STEP;

  // The route steps right once, a third of the way down, so it reads as routed
  // rather than as a plain vertical rule with dots on it.
  const elbowAt = Math.floor(steps.length / 3);
  const laneA = GUTTER / 2;
  const laneB = laneA + 10;

  const path = steps
    .map((_, i) => {
      const y = i * STEP + STEP / 2;
      if (i === 0) return `M ${laneA} ${y}`;
      if (i === elbowAt) {
        // 45° elbow: down to just above the turn, diagonal across, then down.
        return `L ${laneA} ${y - 10} L ${laneB} ${y} `;
      }
      return `L ${i > elbowAt ? laneB : laneA} ${y}`;
    })
    .join(" ");

  const reachedCount = steps.filter((s) => s.reached).length;

  return (
    <View style={{ flexDirection: "row", gap: tokens.space[2] }}>
      <Svg width={GUTTER + 8} height={height}>
        {/* The unreached remainder of the route, drawn faint underneath. */}
        <Path d={path} stroke={tokens.color.border} strokeWidth={2} fill="none" />
        {/* The reached portion, in copper, clipped by drawing only as far as
            the last reached via. */}
        <Path
          d={path}
          stroke={tokens.color.copper}
          strokeWidth={2}
          fill="none"
          strokeDasharray={`${Math.max(0, reachedCount - 0.5) * STEP}, 9999`}
        />
        {steps.map((step, i) => {
          const y = i * STEP + STEP / 2;
          const x = i > elbowAt ? laneB : laneA;
          return (
            <Circle
              key={step.label}
              cx={x}
              cy={y}
              r={VIA / 2}
              // A via is a plated hole: copper ring, board showing through.
              // Reached ones are filled, the way a used contact tarnishes.
              fill={step.reached ? tokens.color.copper : tokens.color.surface}
              stroke={step.reached ? tokens.color.copper : tokens.color.border}
              strokeWidth={2}
            />
          );
        })}
      </Svg>

      <View style={{ flex: 1 }}>
        {steps.map((step) => (
          <View key={step.label} style={{ height: STEP, justifyContent: "center", gap: 1 }}>
            <AppText variant="bodySm" tone={step.reached ? "default" : "muted"}>
              {step.label}
            </AppText>
            {step.note ? (
              <AppText variant="data" tone="muted">{step.note}</AppText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * A short trace stub for a section heading: one segment, one elbow, one via.
 *
 * Four per screen at most. It marks where a section starts the way a board
 * marks where a net begins, which is a thing worth marking; a full-width rule
 * under every heading is not.
 */
export function TraceStub({ tone }: { tone?: "accent" | "copper" }) {
  const { accent } = usePortalTheme();
  const stroke = tone === "accent" ? accent : tokens.color.copper;
  return (
    <Svg width={26} height={10}>
      <Path d={`M 0 5 L 12 5 L 17 10`} stroke={stroke} strokeWidth={2} fill="none" />
      <Circle cx={2} cy={5} r={2} fill={stroke} />
    </Svg>
  );
}
