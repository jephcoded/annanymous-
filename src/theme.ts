import { Platform } from "react-native";

const FONT_FAMILY = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

// Theme colors for Anonymous App
export const COLORS = {
  background: "#050505",
  primary: "#D4D4D8",
  secondary: "#8F9098",
  text: "#F5F5F5",
  card: "#111111",
  gray: "#9A9AA1",
  border: "#27272A",
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
