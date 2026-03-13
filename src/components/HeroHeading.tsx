import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, TYPOGRAPHY } from "../theme";

type HeroHeadingStat = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
};

type HeroHeadingProps = {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaIcon?: keyof typeof Ionicons.glyphMap;
  onPressCta?: () => void;
  stats?: HeroHeadingStat[];
  gradientColors?: [string, string];
};

const DEFAULT_GRADIENT: [string, string] = ["#151D33", "#0A0F1F"];

const HeroHeading = ({
  title,
  subtitle,
  ctaLabel,
  ctaIcon = "sparkles-outline",
  onPressCta,
  stats = [],
  gradientColors = DEFAULT_GRADIENT,
}: HeroHeadingProps) => {
  const accentPrimary = COLORS.primary + "33";
  const accentSecondary = COLORS.secondary + "25";
  const eyebrowLabel = title === "Ananymous" ? "LIVE ANONYMOUS FEED" : "VERIFIED EXPERIENCE";

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroHeader}
    >
      <View pointerEvents="none" style={styles.heroBorder} />
      <View style={styles.heroTextBlock}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrowText}>{eyebrowLabel}</Text>
        </View>
        <Text style={styles.appName}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
        {!!stats.length && (
          <View style={styles.heroStatsRow}>
            {stats.map((stat, index) => (
              <View key={`${stat.label}-${index}`} style={styles.heroStat}>
                <Ionicons
                  name={stat.icon}
                  size={14}
                  color={stat.color ?? COLORS.secondary}
                />
                <Text style={styles.heroStatText}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {ctaLabel ? (
        <TouchableOpacity
          style={styles.heroBadge}
          onPress={onPressCta}
          disabled={!onPressCta}
        >
          <Ionicons name={ctaIcon} size={16} color={COLORS.primary} />
          <Text style={styles.heroBadgeText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
      <View
        pointerEvents="none"
        style={[styles.heroAccentOne, { backgroundColor: accentPrimary }]}
      />
      <View
        pointerEvents="none"
        style={[styles.heroAccentTwo, { backgroundColor: accentSecondary }]}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 18,
    padding: 24,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(140,165,255,0.18)",
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  heroBorder: {
    position: "absolute",
    inset: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  heroTextBlock: { flex: 1 },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  eyebrowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  eyebrowText: {
    color: "rgba(198,214,255,0.72)",
    ...TYPOGRAPHY.eyebrow,
    letterSpacing: 1.6,
  },
  appName: {
    color: COLORS.text,
    ...TYPOGRAPHY.display,
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    color: "rgba(219,227,255,0.72)",
    ...TYPOGRAPHY.label,
    marginTop: 8,
    fontWeight: "600",
  },
  heroStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroStatText: { color: COLORS.text, ...TYPOGRAPHY.meta },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignSelf: "flex-start",
    zIndex: 1,
  },
  heroBadgeText: { color: COLORS.text, ...TYPOGRAPHY.label },
  heroAccentOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    top: -52,
    right: -58,
    opacity: 0.95,
  },
  heroAccentTwo: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -30,
    left: -32,
  },
});

export default HeroHeading;
