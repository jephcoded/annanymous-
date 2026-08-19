import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, TYPOGRAPHY } from "../src/theme";

const ONBOARDING_KEY = "ananymous.onboarding.complete";

const steps = [
  {
    title: "Welcome to ANON",
    description: "A safer place to share your thoughts anonymously.",
    detail: "The feed stays calm, private, and easy to read.",
    icon: "chatbubble-ellipses-outline" as const,
  },
  {
    title: "100% Anonymous",
    description: "We don't track your identity. You're free to be real.",
    detail:
      "Your profile is for expression, but your identity stays masked in posts.",
    icon: "lock-closed-outline" as const,
  },
  {
    title: "Share Anything",
    description: "Post thoughts, stories, rants, advice or questions.",
    detail: "Text-first conversations stay at the center of the app.",
    icon: "create-outline" as const,
  },
  {
    title: "Join the Community",
    description:
      "Connect with others, join discussions and explore real opinions.",
    detail:
      "Communities are quieter spaces for smaller circles and focused rooms.",
    icon: "people-outline" as const,
  },
] as const;

export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLastStep = step === steps.length - 1;
  const buttonLabel = isLastStep ? "Get Started" : "Next";
  const topLabel = isLastStep ? "Done" : "Skip";
  const progressLabel = useMemo(() => `${step + 1}/${steps.length}`, [step]);

  const complete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    onFinish();
  };

  const handleNext = async () => {
    if (isLastStep) {
      await complete();
      return;
    }

    setStep((currentStep) => currentStep + 1);
  };

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.haloPrimary} />
      <View pointerEvents="none" style={styles.haloSecondary} />

      <View style={styles.phoneFrame}>
        <View style={styles.topRow}>
          <Text style={styles.progressText}>{progressLabel}</Text>
          <TouchableOpacity onPress={complete}>
            <Text style={styles.skipText}>{topLabel}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroPanel}>
          <View style={styles.heroOrbit} />
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.heroLogo}
            contentFit="contain"
            transition={0}
          />
          <View style={styles.heroAccentCard}>
            <Ionicons name={current.icon} size={20} color={COLORS.accent} />
          </View>
        </View>

        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.description}>{current.description}</Text>
        <Text style={styles.detail}>{current.detail}</Text>

        <View style={styles.paginationRow}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === step && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomRibbon}>
        <View style={styles.ribbonItem}>
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color={COLORS.primary}
          />
          <Text style={styles.ribbonText}>Your safety matters</Text>
        </View>
        <View style={styles.ribbonItem}>
          <Ionicons name="eye-off-outline" size={15} color={COLORS.primary} />
          <Text style={styles.ribbonText}>No personal info required</Text>
        </View>
        <View style={styles.ribbonItem}>
          <Ionicons name="sparkles-outline" size={15} color={COLORS.primary} />
          <Text style={styles.ribbonText}>You&apos;re always in control</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  haloPrimary: {
    position: "absolute",
    top: 80,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(139,61,255,0.14)",
  },
  haloSecondary: {
    position: "absolute",
    bottom: 40,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(139,61,255,0.08)",
  },
  phoneFrame: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#08080C",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  progressText: {
    color: "rgba(247,242,255,0.52)",
    ...TYPOGRAPHY.meta,
  },
  skipText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.meta,
  },
  heroPanel: {
    height: 250,
    borderRadius: 28,
    backgroundColor: "#06060A",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heroOrbit: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.18)",
    backgroundColor: "rgba(139,61,255,0.06)",
  },
  heroLogo: {
    width: 126,
    height: 126,
  },
  heroAccentCard: {
    position: "absolute",
    right: 34,
    top: 34,
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,61,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.24)",
  },
  title: {
    color: COLORS.text,
    ...TYPOGRAPHY.heading,
    marginBottom: 10,
  },
  description: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 8,
  },
  detail: {
    color: COLORS.gray,
    ...TYPOGRAPHY.body,
    marginBottom: 22,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  dotActive: {
    width: 22,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.button,
  },
  bottomRibbon: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#09090C",
    padding: 14,
    gap: 12,
  },
  ribbonItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ribbonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
});
