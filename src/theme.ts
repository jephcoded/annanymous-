import { Platform } from "react-native";

const FONT_FAMILY = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "sans-serif",
});

export type AppThemeName = "dark" | "midnight" | "obsidian";

export const resolveAppThemeName = (value?: string | null): AppThemeName => {
  if (value === "midnight" || value === "obsidian") {
    return value;
  }

  return "dark";
};

export const getAppAppearance = (theme?: string | null) => {
  const resolved = resolveAppThemeName(theme);

  switch (resolved) {
    case "midnight":
      return {
        name: resolved,
        screenGradient: ["#020203", "#060609", "#0A0A0E"] as const,
        filmGradient: [
          "rgba(255,255,255,0.016)",
          "rgba(255,255,255,0)",
        ] as const,
        shellGradient: ["#020203", "#08080C"] as const,
        navGradient: ["rgba(3,3,5,0.98)", "rgba(9,9,13,0.98)"] as const,
        shellGlowPrimary: "rgba(255,255,255,0.015)",
        shellGlowSecondary: "rgba(139,61,255,0.08)",
        frameBorder: "rgba(255,255,255,0.045)",
        surfaceGlowTop: "rgba(255,255,255,0.016)",
        surfaceGlowCenter: "rgba(255,255,255,0.012)",
        surfaceGlowBottom: "rgba(139,61,255,0.06)",
        tabActiveBackground: "rgba(139,61,255,0.18)",
        tabActiveBorder: "rgba(139,61,255,0.32)",
      };
    case "obsidian":
      return {
        name: resolved,
        screenGradient: ["#000000", "#040405", "#08080A"] as const,
        filmGradient: [
          "rgba(255,255,255,0.012)",
          "rgba(255,255,255,0)",
        ] as const,
        shellGradient: ["#010101", "#050507"] as const,
        navGradient: ["rgba(2,2,2,0.99)", "rgba(7,7,10,0.99)"] as const,
        shellGlowPrimary: "rgba(255,255,255,0.01)",
        shellGlowSecondary: "rgba(139,61,255,0.05)",
        frameBorder: "rgba(255,255,255,0.04)",
        surfaceGlowTop: "rgba(255,255,255,0.014)",
        surfaceGlowCenter: "rgba(255,255,255,0.01)",
        surfaceGlowBottom: "rgba(139,61,255,0.04)",
        tabActiveBackground: "rgba(139,61,255,0.14)",
        tabActiveBorder: "rgba(139,61,255,0.24)",
      };
    default:
      return {
        name: resolved,
        screenGradient: ["#040404", "#080808", "#0B0B0D"] as const,
        filmGradient: [
          "rgba(255,255,255,0.018)",
          "rgba(255,255,255,0)",
        ] as const,
        shellGradient: ["#040404", "#090909"] as const,
        navGradient: ["rgba(5,5,5,0.98)", "rgba(11,11,16,0.98)"] as const,
        shellGlowPrimary: "rgba(255,255,255,0.018)",
        shellGlowSecondary: "rgba(139,61,255,0.11)",
        frameBorder: "rgba(255,255,255,0.05)",
        surfaceGlowTop: "rgba(255,255,255,0.02)",
        surfaceGlowCenter: "rgba(255,255,255,0.015)",
        surfaceGlowBottom: "rgba(255,255,255,0.02)",
        tabActiveBackground: "rgba(139,61,255,0.22)",
        tabActiveBorder: "rgba(139,61,255,0.40)",
      };
  }
};

// Theme colors for Anonymous App
export const COLORS = {
  background: "#050505",
  primary: "#8B3DFF",
  secondary: "#C7B2FF",
  accent: "#F7F2FF",
  text: "#F7F2FF",
  card: "#0B0B10",
  gray: "#A89DBB",
  border: "#241B35",
};

export const TYPOGRAPHY = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900" as const,
    fontFamily: FONT_FAMILY,
  },
  heading: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800" as const,
    fontFamily: FONT_FAMILY,
  },
  title: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "700" as const,
    fontFamily: FONT_FAMILY,
  },
  section: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700" as const,
    fontFamily: FONT_FAMILY,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
    fontFamily: FONT_FAMILY,
  },
  label: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700" as const,
    fontFamily: FONT_FAMILY,
  },
  meta: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600" as const,
    fontFamily: FONT_FAMILY,
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800" as const,
    fontFamily: FONT_FAMILY,
  },
  tab: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700" as const,
    fontFamily: FONT_FAMILY,
  },
  eyebrow: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800" as const,
    letterSpacing: 1.5,
    fontFamily: FONT_FAMILY,
  },
};
