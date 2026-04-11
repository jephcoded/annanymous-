import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useWallet } from "../../contexts/WalletContext";
import { COLORS, TYPOGRAPHY } from "../../theme";

const ConnectWalletScreen = () => {
  const { connectWallet, error, isAuthenticating } = useWallet();
  const isBusy = isAuthenticating;

  const handleConnect = async () => {
    await connectWallet();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(24,24,27,0.98)", "rgba(7,7,8,0.99)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View pointerEvents="none" style={styles.cardGlow} />
        <View pointerEvents="none" style={styles.cardGlowSecondary} />
        <View style={styles.kickerRow}>
          <View style={styles.kickerDot} />
          <Text style={styles.kickerText}>
            {isBusy
              ? "WAITING FOR WALLET APPROVAL"
              : "WALLET-GATED ANONYMOUS ACCESS"}
          </Text>
        </View>
        <View style={styles.iconWrap}>
          <Ionicons
            name={isBusy ? "scan-circle-outline" : "shield-half-outline"}
            size={46}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.title}>
          {isBusy ? "Check your wallet" : "Connect a wallet"}
        </Text>
        <Text style={styles.subtitle}>
          {isBusy
            ? "Approve the pending request in your wallet to finish sign-in. Keep this screen open while the secure session completes."
            : "Use your preferred wallet to verify access, sign in privately, and unlock posting and voting in Ananymous."}
        </Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.featureText}>
              Verified access without exposing your name
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons
              name={isBusy ? "finger-print-outline" : "eye-off-outline"}
              size={16}
              color={COLORS.secondary}
            />
            <Text style={styles.featureText}>
              {isBusy
                ? "Approve once to unlock posting, voting, and comments"
                : "Unlock posting, voting, and live account signals"}
            </Text>
          </View>
        </View>
        {isBusy ? (
          <View style={styles.waitingPanel}>
            <View style={styles.waitingStep}>
              <Text style={styles.waitingIndex}>1</Text>
              <Text style={styles.waitingText}>
                Open your wallet app or modal.
              </Text>
            </View>
            <View style={styles.waitingStep}>
              <Text style={styles.waitingIndex}>2</Text>
              <Text style={styles.waitingText}>
                Approve the connection and signature request.
              </Text>
            </View>
            <View style={styles.waitingStep}>
              <Text style={styles.waitingIndex}>3</Text>
              <Text style={styles.waitingText}>
                Return here while Ananymous finalizes access.
              </Text>
            </View>
          </View>
        ) : null}
        {error ? (
          <Text style={styles.errorText}>
            {error}
            {error.includes("No wallet app detected") &&
              "\nGet MetaMask: https://metamask.io/download/"}
            {error.includes("EXPO_PUBLIC_REOWN_PROJECT_ID") &&
              "\nSee project setup instructions in the README."}
            {error.includes("Reown project ID") &&
              "\nRebuild the APK after the wallet build config is updated."}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[styles.connectBtn, isAuthenticating && styles.connectBtnBusy]}
          onPress={handleConnect}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <ActivityIndicator color={COLORS.text} style={{ marginRight: 8 }} />
          ) : (
            <Ionicons
              name="log-in-outline"
              size={20}
              color={COLORS.text}
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={styles.connectBtnText}>
            {isAuthenticating ? "Waiting For Approval..." : "Connect Wallet"}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    justifyContent: "center",
  },
  card: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 26,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  cardGlow: {
    position: "absolute",
    top: -70,
    right: -50,
    width: Math.min(Dimensions.get('window').width * 0.45, 180),
    height: Math.min(Dimensions.get('window').width * 0.45, 180),
    borderRadius: Math.min(Dimensions.get('window').width * 0.225, 90),
    backgroundColor: `${COLORS.primary}26`,
  },
  cardGlowSecondary: {
    position: "absolute",
    bottom: -64,
    left: -36,
    width: Math.min(Dimensions.get('window').width * 0.4, 160),
    height: Math.min(Dimensions.get('window').width * 0.4, 160),
    borderRadius: Math.min(Dimensions.get('window').width * 0.2, 80),
    backgroundColor: `${COLORS.secondary}14`,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  kickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  kickerText: {
    color: "rgba(212,212,216,0.74)",
    ...TYPOGRAPHY.eyebrow,
    letterSpacing: 1.5,
  },
  iconWrap: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    marginTop: 4,
  },
  title: {
    color: COLORS.text,
    ...TYPOGRAPHY.heading,
    textAlign: "center",
  },
  subtitle: { color: COLORS.gray, textAlign: "center", ...TYPOGRAPHY.body },
  featureList: {
    width: "100%",
    gap: 10,
    marginTop: 4,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  featureText: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    flex: 1,
  },
  errorText: {
    color: "#F87171",
    textAlign: "center",
    ...TYPOGRAPHY.label,
  },
  waitingPanel: {
    width: "100%",
    gap: 10,
    marginTop: 2,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  waitingStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  waitingIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    color: COLORS.text,
    backgroundColor: `${COLORS.primary}26`,
    ...TYPOGRAPHY.meta,
  },
  waitingText: {
    flex: 1,
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 16,
    alignSelf: "stretch",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.42,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  connectBtnBusy: {
    opacity: 0.8,
  },
  connectBtnText: { color: COLORS.text, ...TYPOGRAPHY.button },
});

export default ConnectWalletScreen;
