import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
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

type AuthView = "entry" | "signup" | "login";
type FieldName = "name" | "email" | "password";

const ConnectWalletScreen = () => {
  const { error, isAuthenticating, signIn, signUp } = useWallet();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<AuthView>("entry");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);

  const isBusy = isAuthenticating;
  const isSignup = view === "signup";
  const isLogin = view === "login";

  const canSignup =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.trim().length >= 6;
  const canLogin = email.trim().length > 0 && password.trim().length > 0;
  const canSubmit = isSignup ? canSignup : canLogin;

  const openSignup = () => setView("signup");
  const openLogin = () => setView("login");
  const goBack = () => setView("entry");

  const handlePrimaryAction = async () => {
    if (isSignup) {
      await signUp({ displayName, email, password });
      return;
    }

    if (isLogin) {
      await signIn({ email, password });
    }
  };

  const primaryLabel = isBusy
    ? "Please wait..."
    : isSignup
      ? "Sign up"
      : "Log in";

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
              size={44}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.brandTitle}>ANON</Text>
          <Text style={styles.brandSubtitle}>Speak freely. Stay anonymous.</Text>
        </View>

        {view === "entry" ? (
          <View style={styles.entryPanel}>
            <PressableScale style={styles.primaryButton} onPress={openSignup}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </PressableScale>

            <TouchableOpacity style={styles.loginLink} onPress={openLogin}>
              <Text style={styles.loginLinkText}>
                Already have an account?{" "}
                <Text style={styles.loginLinkAccent}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.panel}>
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Ionicons name="chevron-back" size={18} color={COLORS.text} />
            </TouchableOpacity>

            <View>
              <Text style={styles.sectionTitle}>
                {isSignup ? "Create your account" : "Welcome back"}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {isSignup
                  ? "Join anonymously in seconds."
                  : "Log in to keep posting."}
              </Text>

              <View style={styles.formStack}>
                {isSignup ? (
                  <View
                    style={[
                      styles.inputCard,
                      focusedField === "name" && styles.inputCardFocused,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={
                        focusedField === "name" ? COLORS.primary : COLORS.gray
                      }
                    />
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Display name"
                      placeholderTextColor="rgba(247,242,255,0.32)"
                      style={styles.input}
                      editable={!isBusy}
                    />
                  </View>
                ) : null}

                <View
                  style={[
                    styles.inputCard,
                    focusedField === "email" && styles.inputCardFocused,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={focusedField === "email" ? COLORS.primary : COLORS.gray}
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Email"
                    placeholderTextColor="rgba(247,242,255,0.32)"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isBusy}
                  />
                </View>

                <View
                  style={[
                    styles.inputCard,
                    focusedField === "password" && styles.inputCardFocused,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={
                      focusedField === "password" ? COLORS.primary : COLORS.gray
                    }
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder={
                      isSignup ? "Password (6+ characters)" : "Password"
                    }
                    placeholderTextColor="rgba(247,242,255,0.32)"
                    style={styles.input}
                    secureTextEntry
                    editable={!isBusy}
                  />
                </View>

                {isLogin ? (
                  <TouchableOpacity style={styles.forgotLink}>
                    <Text style={styles.forgotLinkText}>Forgot password?</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

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

            <TouchableOpacity
              style={styles.switchModeLink}
              onPress={isSignup ? openLogin : openSignup}
            >
              <Text style={styles.loginLinkText}>
                {isSignup ? "Already have an account? " : "New here? "}
                <Text style={styles.loginLinkAccent}>
                  {isSignup ? "Log in" : "Sign up"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 4,
  },
  loginLink: {
    marginTop: 16,
    alignItems: "center",
  },
  loginLinkText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    textAlign: "center",
  },
  loginLinkAccent: {
    color: COLORS.primary,
  },
  switchModeLink: {
    marginTop: 18,
    alignItems: "center",
  },
  panel: {
    paddingHorizontal: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 18,
  },
  sectionTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.heading,
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.body,
    marginBottom: 22,
  },
  formStack: {
    gap: 22,
    marginBottom: 14,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 17,
    backgroundColor: "#111117",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.05)",
  },
  inputCardFocused: {
    borderColor: "rgba(139,61,255,0.55)",
    backgroundColor: "#141420",
  },
  input: {
    flex: 1,
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    paddingVertical: 0,
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -6,
  },
  forgotLinkText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.meta,
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
    alignSelf: "center",
    width: "66%",
    minWidth: 190,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    marginTop: 10,
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
  loader: {
    marginRight: 8,
  },
});

export default ConnectWalletScreen;
