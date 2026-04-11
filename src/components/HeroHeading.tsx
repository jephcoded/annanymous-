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

const DEFAULT_GRADIENT: [string, string] = [COLORS.background, COLORS.card];

const HeroHeading = ({
  title,
  subtitle,
  ctaLabel,
  ctaIcon = "sparkles-outline",
  onPressCta,
  stats = [],
  gradientColors = DEFAULT_GRADIENT,
}: HeroHeadingProps) => {
  const eyebrowLabel =
    title === "Ananymous" ? "ANONYMOUS MENU" : "PRIVATE ACCESS";

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroHeader}
    >
      <View pointerEvents="none" style={styles.heroFrame} />
      <View style={styles.heroTopRow}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrowText}>{eyebrowLabel}</Text>
        </View>
        {ctaLabel ? (
          <TouchableOpacity
            style={styles.heroBadge}
            onPress={onPressCta}
            disabled={!onPressCta}
          >
            <Ionicons name={ctaIcon} size={15} color={COLORS.text} />
            <Text style={styles.heroBadgeText}>{ctaLabel}</Text>
          </TouchableOpacity>
        ) : null}
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

      <View pointerEvents="none" style={styles.heroAccentOne} />
      <View pointerEvents="none" style={styles.heroAccentTwo} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  heroHeader: {
    padding: 20,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroFrame: {
    position: "absolute",
    inset: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.primary,
  },
  eyebrowText: {
    color: "rgba(212,212,216,0.72)",
    ...TYPOGRAPHY.eyebrow,
    letterSpacing: 1.4,
  },
  appName: {
    color: COLORS.text,
    ...TYPOGRAPHY.display,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "rgba(212,212,216,0.74)",
    ...TYPOGRAPHY.label,
    maxWidth: "92%",
  },
  heroStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroStatText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    zIndex: 1,
  },
  heroBadgeText: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
  },
  heroAccentOne: {
    position: "absolute",
    width: 128,
    height: 128,
    borderRadius: 64,
    top: -44,
    right: -20,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  heroAccentTwo: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    bottom: -24,
    left: -14,
    backgroundColor: "rgba(120,120,128,0.08)",
  },
});

export default HeroHeading;
