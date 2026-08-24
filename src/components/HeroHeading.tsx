import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, TYPOGRAPHY } from "../theme";
import SectionArt, { SectionArtName } from "./SectionArt";

type HeroHeadingStat = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
};

type HeroHeadingProps = {
  title: string;
  subtitle: string;
  artSection?: SectionArtName;
  ctaLabel?: string;
  ctaIcon?: keyof typeof Ionicons.glyphMap;
  onPressCta?: () => void;
  stats?: HeroHeadingStat[];
  gradientColors?: [string, string];
  subtitleLines?: number;
};

const HeroHeading = ({
  title,
  subtitle,
  artSection,
  ctaLabel,
  ctaIcon = "sparkles-outline",
  onPressCta,
  stats = [],
  subtitleLines = 2,
}: HeroHeadingProps) => {
  const eyebrowLabel = title === "Ananymous" ? "ANON SPACE" : "PRIVATE ACCESS";

  return (
    <View style={styles.heroHeader}>
      <View style={styles.heroTopRow}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrowText}>{eyebrowLabel}</Text>
        </View>
        {ctaLabel ? (
          onPressCta ? (
            <TouchableOpacity style={styles.heroBadge} onPress={onPressCta}>
              <Ionicons name={ctaIcon} size={15} color={COLORS.primary} />
              <Text style={styles.heroBadgeText}>{ctaLabel}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.heroBadgeStatic}>
              <Ionicons name={ctaIcon} size={13} color={COLORS.gray} />
              <Text style={styles.heroBadgeStaticText}>{ctaLabel}</Text>
            </View>
          )
        ) : null}
      </View>

      <View style={styles.heroContentRow}>
        <View style={styles.heroCopyColumn}>
          <Text style={styles.appName}>{title}</Text>
          <Text style={styles.heroSubtitle} numberOfLines={subtitleLines}>
            {subtitle}
          </Text>
        </View>
        {artSection ? (
          <View style={styles.heroArtWrap}>
            <SectionArt section={artSection} size="md" />
          </View>
        ) : null}
      </View>

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
  );
};

const styles = StyleSheet.create({
  heroHeader: {
    marginBottom: 22,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
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
    color: COLORS.primary,
    ...TYPOGRAPHY.eyebrow,
    letterSpacing: 1.4,
  },
  appName: {
    color: COLORS.text,
    ...TYPOGRAPHY.display,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  heroContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  heroCopyColumn: {
    flex: 1,
    minWidth: 0,
  },
  heroSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    maxWidth: "100%",
  },
  heroArtWrap: {
    width: 78,
    alignItems: "flex-end",
  },
  heroStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginTop: 16,
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroStatText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: "rgba(139,61,255,0.12)",
  },
  heroBadgeText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.label,
  },
  heroBadgeStatic: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroBadgeStaticText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
});

export default HeroHeading;
