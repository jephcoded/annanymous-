import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "../../contexts/WalletContext";
import { COLORS, TYPOGRAPHY } from "../../theme";

const INTEREST_OPTIONS = [
  "News",
  "Rants",
  "Relationships",
  "Lifestyle",
  "School life",
  "Tech",
  "Sports",
  "Entertainment",
];

type AuthView = "entry" | "signup" | "login";
type LocationMode = "current" | "manual" | "skip";

const SIGNUP_STEP_COUNT = 5;

const ConnectWalletScreen = () => {
  const { error, isAuthenticating, signIn, signUp } = useWallet();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<AuthView>("entry");
  const [signupStep, setSignupStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "Rants",
    "School life",
  ]);
  const [locationMode, setLocationMode] = useState<LocationMode>("skip");
  const [manualLocation, setManualLocation] = useState("");

  const isBusy = isAuthenticating;
  const isSignup = view === "signup";
  const isLogin = view === "login";
  const isLastSignupStep = signupStep === SIGNUP_STEP_COUNT - 1;

  const signupMeta = useMemo(
    () => [
      {
        title: "Choose your identity",
        subtitle: "You can always change this later.",
      },
      {
        title: "Secure your account",
        subtitle:
          "Your email keeps your account signed in, but your posts still stay anonymous.",
      },
      {
        title: "Pick your interests",
        subtitle: "Select topics you care about. We'll personalize your feed.",
      },
      {
        title: "Enable location",
        subtitle:
          "Help us show posts and communities near you. You can skip this now.",
      },
      {
        title: "Almost there!",
        subtitle: "Review your details before creating your account.",
      },
    ],
    [],
  );

  const resolvedLocationLabel =
    locationMode === "current"
      ? "Use current location"
      : locationMode === "manual"
        ? manualLocation.trim() || "Manual location"
        : "Skip for now";

  const canContinueSignup = useMemo(() => {
    if (signupStep === 0) {
      return displayName.trim().length > 0;
    }

    if (signupStep === 1) {
      return email.trim().length > 0 && password.trim().length >= 6;
    }

    if (signupStep === 2) {
      return selectedInterests.length > 0;
    }

    if (signupStep === 3) {
      return locationMode !== "manual" || manualLocation.trim().length > 0;
    }

    return true;
  }, [
    displayName,
    email,
    locationMode,
    manualLocation,
    password,
    selectedInterests.length,
    signupStep,
  ]);

  const canLogin = email.trim().length > 0 && password.trim().length > 0;

  const toggleInterest = (interest: string) => {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  };

  const openSignup = () => {
    setView("signup");
    setSignupStep(0);
  };

  const openLogin = () => {
    setView("login");
  };

  const handlePrimaryAction = async () => {
    if (isSignup) {
      if (!isLastSignupStep) {
        setSignupStep((current) => current + 1);
        return;
      }

      await signUp({
        displayName,
        email,
        password,
        bio: `Location: ${resolvedLocationLabel}`,
      });
      return;
    }

    if (isLogin) {
      await signIn({ email, password });
    }
  };

  const handleBack = () => {
    if (isSignup && signupStep > 0) {
      setSignupStep((current) => current - 1);
      return;
    }

    setView("entry");
  };

  const primaryLabel = isBusy
    ? "Initializing..."
    : isSignup
      ? isLastSignupStep
        ? "Create Account"
        : "Continue"
      : "Log In";

  const canSubmit = isSignup ? canContinueSignup : canLogin;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top + 12}
    >
      <View pointerEvents="none" style={styles.glowPrimary} />
      <View pointerEvents="none" style={styles.glowSecondary} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandCard}>
          <View style={styles.brandMark}>
            <Ionicons
              name="shield-half-outline"
              size={46}
              color={COLORS.accent}
            />
          </View>
          <Text style={styles.brandTitle}>ANON</Text>
          <Text style={styles.brandSubtitle}>
            Speak freely. Stay anonymous.
          </Text>
        </View>

        {view === "entry" ? (
          <View style={styles.entryPanel}>
            <Text style={styles.entryTitle}>Private by default.</Text>
            <Text style={styles.entrySubtitle}>
              Create an account before onboarding so your feed, profile, and
              settings are tied to a real session.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={openSignup}>
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={openLogin}
            >
              <Text style={styles.secondaryButtonText}>Log In</Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </Text>
          </View>
        ) : (
          <View style={styles.panel}>
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="chevron-back" size={18} color={COLORS.text} />
              </TouchableOpacity>

              <Text style={styles.topBarLabel}>
                {isSignup ? "CREATE ACCOUNT FLOW" : "WELCOME BACK"}
              </Text>

              <View style={styles.backButtonPlaceholder} />
            </View>

            {isSignup ? (
              <>
                <Text style={styles.sectionTitle}>
                  {signupMeta[signupStep].title}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {signupMeta[signupStep].subtitle}
                </Text>

                {signupStep === 0 ? (
                  <View style={styles.identityCard}>
                    <View style={styles.identityAvatar}>
                      <Ionicons
                        name="shield-half-outline"
                        size={34}
                        color={COLORS.accent}
                      />
                    </View>
                    <View style={styles.inputCard}>
                      <Text style={styles.inputLabel}>Display name</Text>
                      <TextInput
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="User_4821"
                        placeholderTextColor="rgba(247,242,255,0.34)"
                        style={styles.input}
                        editable={!isBusy}
                      />
                    </View>
                  </View>
                ) : null}

                {signupStep === 1 ? (
                  <View style={styles.formStack}>
                    <View style={styles.inputCard}>
                      <Text style={styles.inputLabel}>Email address</Text>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="name@email.com"
                        placeholderTextColor="rgba(247,242,255,0.34)"
                        style={styles.input}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!isBusy}
                      />
                    </View>
                    <View style={styles.inputCard}>
                      <Text style={styles.inputLabel}>Create a password</Text>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="At least 6 characters"
                        placeholderTextColor="rgba(247,242,255,0.34)"
                        style={styles.input}
                        secureTextEntry
                        editable={!isBusy}
                      />
                    </View>
                  </View>
                ) : null}

                {signupStep === 2 ? (
                  <View style={styles.interestGrid}>
                    {INTEREST_OPTIONS.map((interest) => {
                      const active = selectedInterests.includes(interest);
                      return (
                        <TouchableOpacity
                          key={interest}
                          style={[
                            styles.interestChip,
                            active && styles.interestChipActive,
                          ]}
                          onPress={() => toggleInterest(interest)}
                        >
                          <Text
                            style={[
                              styles.interestChipText,
                              active && styles.interestChipTextActive,
                            ]}
                          >
                            {interest}
                          </Text>
                          {active ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color={COLORS.accent}
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {signupStep === 3 ? (
                  <View style={styles.formStack}>
                    {[
                      {
                        key: "current" as const,
                        title: "Use current location",
                        subtitle: "Show nearby posts and communities.",
                      },
                      {
                        key: "manual" as const,
                        title: "Select manually",
                        subtitle: "Enter your city or campus yourself.",
                      },
                      {
                        key: "skip" as const,
                        title: "Skip for now",
                        subtitle: "You can change this later in settings.",
                      },
                    ].map((option) => {
                      const active = locationMode === option.key;
                      return (
                        <TouchableOpacity
                          key={option.key}
                          style={[
                            styles.locationChoice,
                            active && styles.locationChoiceActive,
                          ]}
                          onPress={() => setLocationMode(option.key)}
                        >
                          <View style={styles.locationChoiceCopy}>
                            <Text style={styles.locationChoiceTitle}>
                              {option.title}
                            </Text>
                            <Text style={styles.locationChoiceSubtitle}>
                              {option.subtitle}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.choiceRadio,
                              active && styles.choiceRadioActive,
                            ]}
                          />
                        </TouchableOpacity>
                      );
                    })}

                    {locationMode === "manual" ? (
                      <View style={styles.inputCard}>
                        <Text style={styles.inputLabel}>City or campus</Text>
                        <TextInput
                          value={manualLocation}
                          onChangeText={setManualLocation}
                          placeholder="Lagos, Nigeria"
                          placeholderTextColor="rgba(247,242,255,0.34)"
                          style={styles.input}
                          editable={!isBusy}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {signupStep === 4 ? (
                  <View style={styles.reviewCard}>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Display Name</Text>
                      <Text style={styles.reviewValue}>{displayName}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Email</Text>
                      <Text style={styles.reviewValue}>{email}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Location</Text>
                      <Text style={styles.reviewValue}>
                        {resolvedLocationLabel}
                      </Text>
                    </View>
                    <View style={styles.reviewRowLast}>
                      <Text style={styles.reviewLabel}>Interests</Text>
                      <Text style={styles.reviewValue}>
                        {selectedInterests.join(", ")}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.paginationRow}>
                  {Array.from({ length: SIGNUP_STEP_COUNT }).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === signupStep && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Log in to ANON</Text>
                <Text style={styles.sectionSubtitle}>
                  Your session stays on this device even after you close the
                  app.
                </Text>
                <View style={styles.formStack}>
                  <View style={styles.inputCard}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="name@email.com"
                      placeholderTextColor="rgba(247,242,255,0.34)"
                      style={styles.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!isBusy}
                    />
                  </View>
                  <View style={styles.inputCard}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Password"
                      placeholderTextColor="rgba(247,242,255,0.34)"
                      style={styles.input}
                      secureTextEntry
                      editable={!isBusy}
                    />
                  </View>
                </View>
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                !canSubmit && styles.primaryButtonDisabled,
              ]}
              onPress={() => void handlePrimaryAction()}
              disabled={!canSubmit || isBusy}
            >
              {isBusy ? (
                <ActivityIndicator color={COLORS.text} style={styles.loader} />
              ) : null}
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footerStrip}>
          <View style={styles.footerItem}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={COLORS.primary}
            />
            <Text style={styles.footerText}>Anonymous by default</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons
              name="lock-closed-outline"
              size={15}
              color={COLORS.primary}
            />
            <Text style={styles.footerText}>Your data is safe</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons
              name="sparkles-outline"
              size={15}
              color={COLORS.primary}
            />
            <Text style={styles.footerText}>Speak freely</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  glowPrimary: {
    position: "absolute",
    top: 90,
    left: -90,
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 24,
    gap: 16,
  },
  brandCard: {
    alignItems: "center",
    gap: 10,
  },
  brandMark: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0A0E",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.28)",
  },
  brandTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.display,
    letterSpacing: 2,
  },
  brandSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  entryPanel: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#09090C",
    padding: 18,
  },
  entryTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.heading,
    textAlign: "center",
    marginBottom: 10,
  },
  entrySubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginBottom: 20,
  },
  termsText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    textAlign: "center",
    marginTop: 14,
  },
  panel: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#09090C",
    padding: 18,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 10,
  },
  topBarLabel: {
    color: COLORS.primary,
    ...TYPOGRAPHY.eyebrow,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  backButtonPlaceholder: {
    width: 34,
  },
  sectionTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.heading,
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.body,
    marginBottom: 16,
  },
  identityCard: {
    alignItems: "center",
    gap: 16,
    marginBottom: 10,
  },
  identityAvatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,61,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.24)",
  },
  formStack: {
    gap: 12,
    marginBottom: 10,
  },
  inputCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#111117",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  inputLabel: {
    color: "rgba(247,242,255,0.52)",
    ...TYPOGRAPHY.meta,
    marginBottom: 8,
  },
  input: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    paddingVertical: 0,
  },
  interestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#111117",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  interestChipActive: {
    backgroundColor: "rgba(139,61,255,0.18)",
    borderColor: "rgba(139,61,255,0.28)",
  },
  interestChipText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  interestChipTextActive: {
    color: COLORS.text,
  },
  locationChoice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#111117",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  locationChoiceActive: {
    borderColor: "rgba(139,61,255,0.34)",
    backgroundColor: "rgba(139,61,255,0.12)",
  },
  locationChoiceCopy: {
    flex: 1,
  },
  locationChoiceTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 4,
  },
  locationChoiceSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  choiceRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.22)",
  },
  choiceRadioActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  reviewCard: {
    borderRadius: 20,
    backgroundColor: "#111117",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 14,
    marginBottom: 12,
  },
  reviewRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  reviewRowLast: {
    paddingTop: 11,
    paddingBottom: 4,
  },
  reviewLabel: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    marginBottom: 4,
  },
  reviewValue: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
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
  errorText: {
    color: "#F87171",
    ...TYPOGRAPHY.label,
    marginBottom: 14,
    textAlign: "center",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryButtonDisabled: {
    opacity: 0.48,
  },
  primaryButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.button,
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#111117",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingVertical: 15,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.button,
  },
  loader: {
    marginRight: 8,
  },
  footerStrip: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#09090C",
    padding: 14,
    gap: 10,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  footerText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
});

export default ConnectWalletScreen;
