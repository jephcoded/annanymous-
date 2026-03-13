import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useWallet } from "../../contexts/WalletContext";
  import { COLORS, TYPOGRAPHY } from "../../theme";

const ConnectWalletScreen = () => {
  const { connectWallet, error, isAuthenticating } = useWallet();

  const handleConnect = async () => {
    await connectWallet();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(18,28,48,0.96)", "rgba(11,16,28,0.98)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View pointerEvents="none" style={styles.cardGlow} />
        <View style={styles.kickerRow}>
          <View style={styles.kickerDot} />
          <Text style={styles.kickerText}>SECURE ANONYMOUS ACCESS</Text>
        </View>
        <View style={styles.iconWrap}>
          <Ionicons name="wallet-outline" size={42} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Connect your wallet</Text>
        <Text style={styles.subtitle}>
          Hook up your decentralized identity to post, vote, and earn reputation
          in Ananymous.
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
              name="notifications-outline"
              size={16}
              color={COLORS.secondary}
            />
            <Text style={styles.featureText}>
              Unlock posting, voting, and live account signals
            </Text>
          </View>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
            {isAuthenticating ? "Connecting..." : "Connect Wallet"}
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
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${COLORS.primary}26`,
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
    color: "rgba(206,219,255,0.72)",
    ...TYPOGRAPHY.eyebrow,
    letterSpacing: 1.5,
  },
  iconWrap: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: `${COLORS.primary}24`,
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
