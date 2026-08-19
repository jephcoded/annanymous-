import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, TYPOGRAPHY } from "../src/theme";

type AccountReadyScreenProps = {
  onContinue: () => void | Promise<void>;
};

export default function AccountReadyScreen({
  onContinue,
}: AccountReadyScreenProps) {
  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.glowPrimary} />
      <View pointerEvents="none" style={styles.glowSecondary} />

      <View style={styles.card}>
        <View style={styles.heroBadge}>
          <Ionicons
            name="shield-checkmark-outline"
            size={54}
            color={COLORS.accent}
          />
        </View>

        <Text style={styles.title}>You&apos;re all set</Text>
        <Text style={styles.subtitle}>Welcome to ANON.</Text>

        <View style={styles.signalCard}>
          <View style={styles.signalRow}>
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.signalText}>Your account is protected</Text>
          </View>
          <View style={styles.signalRow}>
            <Ionicons name="person-outline" size={16} color={COLORS.primary} />
            <Text style={styles.signalText}>You&apos;re anonymous in posts</Text>
          </View>
          <View style={styles.signalRow}>
            <Ionicons
              name="sparkles-outline"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.signalText}>Be respectful</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
          <Text style={styles.primaryButtonText}>Start Exploring</Text>
        </TouchableOpacity>
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
  glowPrimary: {
    position: "absolute",
    top: 80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(139,61,255,0.12)",
  },
  glowSecondary: {
    position: "absolute",
    bottom: 40,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(139,61,255,0.08)",
  },
  card: {
    width: "100%",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#09090C",
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: "center",
  },
  heroBadge: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,61,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.30)",
    marginBottom: 18,
  },
  title: {
    color: COLORS.text,
    ...TYPOGRAPHY.heading,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.body,
    marginBottom: 18,
  },
  signalCard: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#111117",
    padding: 16,
    gap: 12,
    marginBottom: 18,
  },
  signalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  signalText: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
  },
  primaryButton: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.button,
  },
});
