import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import Animatable from "react-native-animatable";
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

import PressableScale from "../../components/PressableScale";
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
      { title: "Choose your name", subtitle: "You can change it anytime." },
      { title: "Secure your account", subtitle: "Posts stay anonymous either way." },
      { title: "Pick your interests", subtitle: "We'll tailor your feed." },
      { title: "Location", subtitle: "Optional — shows nearby posts." },
      { title: "Almost there", subtitle: "Review, then create your account." },
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
    ? "Please wait..."
    : isSignup
      ? isLastSignupStep
        ? "Create account"
        : "Continue"
      : "Log in";

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
        <Animatable.View
          animation="fadeInDown"
          duration={480}
          useNativeDriver
          style={styles.brandCard}
        >
          <View style={styles.brandMark}>
            <Ionicons
              name="shield-half-outline"
              size={44}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.brandTitle}>ANON</Text>
          <Text style={styles.brandSubtitle}>Speak freely. Stay anonymous.</Text>
        </Animatable.View>

        {view === "entry" ? (
          <Animatable.View
            animation="fadeInUp"
            duration={480}
            useNativeDriver
            style={styles.entryPanel}
          >
            <Text style={styles.entryTitle}>Welcome.</Text>
            <Text style={styles.entrySubtitle}>
              No personal info required. Just you, unfiltered.
            </Text>

            <PressableScale style={styles.primaryButton} onPress={openSignup}>
              <Text style={styles.primaryButtonText}>Create account</Text>
            </PressableScale>

            <PressableScale style={styles.secondaryButton} onPress={openLogin}>
              <Text style={styles.secondaryButtonText}>Log in</Text>
            </PressableScale>

            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <Ionicons
                  name="eye-off-outline"
                  size={14}
                  color={COLORS.gray}
                />
                <Text style={styles.trustText}>Anonymous</Text>
              </View>
              <View style={styles.trustDot} />
              <View style={styles.trustItem}>
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color={COLORS.gray}
                />
                <Text style={styles.trustText}>Private</Text>
              </View>
              <View style={styles.trustDot} />
              <View style={styles.trustItem}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={COLORS.gray}
                />
                <Text style={styles.trustText}>Secure</Text>
              </View>
            </View>

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms and Privacy Policy.
            </Text>
          </Animatable.View>
        ) : (
          <Animatable.View
            animation="fadeInUp"
            duration={420}
            useNativeDriver
            style={styles.panel}
          >
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="chevron-back" size={18} color={COLORS.text} />
              </TouchableOpacity>

              {isSignup ? (
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
              ) : (
                <Text style={styles.topBarLabel}>WELCOME BACK</Text>
              )}

              <View style={styles.backButtonPlaceholder} />
            </View>

            {isSignup ? (
              <Animatable.View
                key={signupStep}
                animation="fadeIn"
                duration={260}
                useNativeDriver
              >
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
                        size={32}
                        color={COLORS.primary}
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
                              color={COLORS.primary}
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
                        title: "Current location",
                      },
                      {
                        key: "manual" as const,
                        title: "Enter manually",
                      },
                      {
                        key: "skip" as const,
                        title: "Skip for now",
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
                          <Text style={styles.locationChoiceTitle}>
                            {option.title}
                          </Text>
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
                      <Text style={styles.reviewLabel}>Name</Text>
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
              </Animatable.View>
            ) : (
              <Animatable.View animation="fadeIn" duration={260} useNativeDriver>
                <Text style={styles.sectionTitle}>Log in</Text>
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
              </Animatable.View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <PressableScale
              style={[
                styles.primaryButton,
                (!canSubmit || isBusy) && styles.primaryButtonDisabled,
              ]}
              onPress={() => void handlePrimaryAction()}
              disabled={!canSubmit || isBusy}
            >
              {isBusy ? (
                <ActivityIndicator color={COLORS.text} style={styles.loader} />
              ) : null}
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </PressableScale>
          </Animatable.View>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 20,
  },
  brandCard: {
    alignItems: "center",
    gap: 12,
  },
  brandMark: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,61,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.24)",
  },
  brandTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.display,
    letterSpacing: 3,
  },
  brandSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  entryPanel: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#09090C",
    padding: 24,
  },
  entryTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.heading,
    textAlign: "center",
    marginBottom: 8,
  },
  entrySubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginBottom: 24,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 18,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  trustText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  termsText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    textAlign: "center",
    marginTop: 16,
    opacity: 0.7,
  },
  panel: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#09090C",
    padding: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
    gap: 10,
  },
  topBarLabel: {
    color: COLORS.primary,
    ...TYPOGRAPHY.eyebrow,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  backButtonPlaceholder: {
    width: 36,
  },
  sectionTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.heading,
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.body,
    marginBottom: 20,
  },
  identityCard: {
    alignItems: "center",
    gap: 18,
    marginBottom: 8,
  },
  identityAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,61,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.24)",
  },
  formStack: {
    gap: 12,
    marginBottom: 8,
  },
  inputCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#111117",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  inputLabel: {
    color: "rgba(247,242,255,0.5)",
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
    marginBottom: 8,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#111117",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  interestChipActive: {
    backgroundColor: "rgba(139,61,255,0.16)",
    borderColor: "rgba(139,61,255,0.32)",
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
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#111117",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  locationChoiceActive: {
    borderColor: "rgba(139,61,255,0.36)",
    backgroundColor: "rgba(139,61,255,0.12)",
  },
  locationChoiceTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
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
    padding: 16,
    marginBottom: 8,
  },
  reviewRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  reviewRowLast: {
    paddingTop: 12,
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
    marginBottom: 16,
    textAlign: "center",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 17,
    marginTop: 6,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.42,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.button,
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#111117",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    paddingVertical: 17,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.button,
  },
  loader: {
    marginRight: 8,
  },
});

export default ConnectWalletScreen;
