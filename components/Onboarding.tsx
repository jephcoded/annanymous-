import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { COLORS, TYPOGRAPHY } from "../src/theme";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

const ONBOARDING_KEY = "ananymous.onboarding.complete";

const steps = [
  {
    title: "Welcome",
    description:
      "Use the bottom bar to move around the app: Home, Post, Community, and Wallet.",
  },
  {
    title: "Home",
    description:
      "Home is the menu page. Open discover, polls, comments, wallet, or community from there.",
  },
  {
    title: "Post",
    description:
      "Post lets you write a caption, attach an image, create a poll, and publish anonymously.",
  },
  {
    title: "Community",
    description:
      "Community is where you create rooms, join with invite codes, and manage private chat spaces.",
  },
  {
    title: "Wallet",
    description:
      "Connect your wallet when you want to post, vote, comment, or create communities.",
  },
];

export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      onFinish();
    }
  };

  const { title, description } = steps[step];

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <ThemedText style={styles.buttonText}>
            {step === steps.length - 1 ? "Start App" : "Next"}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
      <View style={styles.progress}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step
                ? { backgroundColor: COLORS.primary }
                : { backgroundColor: COLORS.border },
            ]}
          />
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    marginBottom: 28,
  },
  title: {
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 12,
    ...TYPOGRAPHY.heading,
  },
  description: {
    color: COLORS.gray,
    marginBottom: 36,
    textAlign: "center",
    ...TYPOGRAPHY.body,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: COLORS.background,
    ...TYPOGRAPHY.button,
  },
  progress: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
