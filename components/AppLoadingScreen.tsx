import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { COLORS, TYPOGRAPHY } from "../src/theme";

type AppLoadingScreenProps = {
  title?: string;
  subtitle?: string;
  statusText?: string;
};

export default function AppLoadingScreen({
  title = "ANON",
  subtitle = "Setting up your anonymous space...",
  statusText = "Loading secure session",
}: AppLoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.topGlow} />
      <View pointerEvents="none" style={styles.bottomGlow} />

      <View style={styles.logoShell}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          contentFit="contain"
          transition={0}
        />
      </View>

      <Text style={styles.eyebrow}>PRIVATE BY DEFAULT</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.statusRow}>
        <ActivityIndicator size="small" color={COLORS.secondary} />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  topGlow: {
    position: "absolute",
    top: -110,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  bottomGlow: {
    position: "absolute",
    bottom: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  logoShell: {
    width: 152,
    height: 152,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 18,
  },
  logo: {
    width: 132,
    height: 132,
  },
  eyebrow: {
    color: COLORS.secondary,
    ...TYPOGRAPHY.eyebrow,
    marginBottom: 10,
  },
  title: {
    color: COLORS.text,
    ...TYPOGRAPHY.display,
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
});
