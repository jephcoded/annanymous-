import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import BarChartLine from "react-native-bootstrap-icons/icons/bar-chart-line";
import ChatDots from "react-native-bootstrap-icons/icons/chat-dots";
import Compass from "react-native-bootstrap-icons/icons/compass";
import PencilSquare from "react-native-bootstrap-icons/icons/pencil-square";
import People from "react-native-bootstrap-icons/icons/people";
import ShieldCheck from "react-native-bootstrap-icons/icons/shield-check";

import { COLORS } from "../theme";

type SectionArtName =
  | "post"
  | "discover"
  | "comments"
  | "polls"
  | "community"
  | "wallet";

type SectionArtProps = {
  section: SectionArtName;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
};

type IconProps = {
  color?: string;
  width?: number;
  height?: number;
};

type ArtConfig = {
  colors: [string, string, string];
  glow: string;
  IconPrimary: React.ComponentType<IconProps>;
  IconSecondary: React.ComponentType<IconProps>;
  useImage?: boolean;
};

const ART: Record<SectionArtName, ArtConfig> = {
  post: {
    colors: ["#1D0E14", "#4D1F2A", "#C15642"],
    glow: "rgba(255,106,61,0.24)",
    IconPrimary: PencilSquare,
    IconSecondary: ShieldCheck,
  },
  discover: {
    colors: ["#08141C", "#0F3241", "#1B87A6"],
    glow: "rgba(27,135,166,0.24)",
    IconPrimary: Compass,
    IconSecondary: ChatDots,
  },
  comments: {
    colors: ["#11131E", "#22314A", "#60778D"],
    glow: "rgba(96,119,141,0.26)",
    IconPrimary: ChatDots,
    IconSecondary: PencilSquare,
  },
  polls: {
    colors: ["#0D161D", "#143848", "#2A8FB0"],
    glow: "rgba(42,143,176,0.24)",
    IconPrimary: BarChartLine,
    IconSecondary: Compass,
  },
  community: {
    colors: ["#171217", "#3B2233", "#9B4D66"],
    glow: "rgba(155,77,102,0.24)",
    IconPrimary: People,
    IconSecondary: ChatDots,
  },
  wallet: {
    colors: ["#10171B", "#213845", "#6E99AA"],
    glow: "rgba(110,153,170,0.24)",
    IconPrimary: ShieldCheck,
    IconSecondary: PencilSquare,
  },
};

const SIZES = {
  sm: {
    frame: 60,
    radius: 20,
    iconPrimary: 22,
    iconSecondary: 13,
  },
  md: {
    frame: 88,
    radius: 26,
    iconPrimary: 30,
    iconSecondary: 18,
  },
  lg: {
    frame: 132,
    radius: 34,
    iconPrimary: 42,
    iconSecondary: 24,
  },
} as const;

const SectionArt = ({
  section,
  size = "md",
  animated = false,
}: SectionArtProps) => {
  const config = ART[section];
  const metrics = SIZES[size];
  const PrimaryIcon = config.IconPrimary;
  const SecondaryIcon = config.IconSecondary;
  const usesImage = Boolean(config.useImage);

  const frameStyle = {
    width: metrics.frame,
    height: metrics.frame,
    borderRadius: metrics.radius,
  };

  const Content = (
    <LinearGradient
      colors={config.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.frame, frameStyle]}
    >
      <View style={styles.innerRing} />
      <View style={[styles.glow, { backgroundColor: config.glow }]} />
      <View
        style={[
          styles.glowSecondary,
          { backgroundColor: `${COLORS.background}70` },
        ]}
      />
      <>
        <View style={styles.diagonalBand} />
        <View style={styles.cornerOrbTop} />
        <View style={styles.cornerOrbBottom} />
        <View style={styles.iconPrimaryWrap}>
          <PrimaryIcon
            color={COLORS.text}
            width={metrics.iconPrimary}
            height={metrics.iconPrimary}
          />
        </View>
        <View style={styles.iconSecondaryWrap}>
          <SecondaryIcon
            color="rgba(234,244,250,0.92)"
            width={metrics.iconSecondary}
            height={metrics.iconSecondary}
          />
        </View>
      </>
      <View style={styles.spark} />
    </LinearGradient>
  );

  void animated;

  return Content;
};

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
  },
  innerRing: {
    position: "absolute",
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    opacity: 0.72,
  },
  glow: {
    position: "absolute",
    width: "80%",
    height: "80%",
    borderRadius: 999,
    top: -10,
    right: -12,
  },
  glowSecondary: {
    position: "absolute",
    width: "62%",
    height: "62%",
    borderRadius: 999,
    bottom: -8,
    left: -10,
  },
  diagonalBand: {
    position: "absolute",
    left: -12,
    right: -12,
    top: "50%",
    height: 12,
    transform: [{ rotate: "-18deg" }],
    backgroundColor: "rgba(255,255,255,0.10)",
    opacity: 0.42,
  },
  cornerOrbTop: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cornerOrbBottom: {
    position: "absolute",
    bottom: 10,
    left: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  iconPrimaryWrap: {
    opacity: 0.98,
    transform: [{ translateY: -1 }],
  },
  iconSecondaryWrap: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(25,0,25,0.58)",
    borderWidth: 1,
    borderColor: "rgba(223,182,178,0.14)",
  },
  spark: {
    position: "absolute",
    top: 11,
    left: 11,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
});

export type { SectionArtName };
export default SectionArt;
