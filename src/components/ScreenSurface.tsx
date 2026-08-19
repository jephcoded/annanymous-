import { LinearGradient } from "expo-linear-gradient";
import React, { ReactNode } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "../contexts/WalletContext";
import { getAppAppearance } from "../theme";

type ScreenSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  bleedTop?: boolean;
};

const ScreenSurface = ({
  children,
  style,
  bleedTop = false,
}: ScreenSurfaceProps) => {
  const insets = useSafeAreaInsets();
  const { settings } = useWallet();
  const appearance = getAppAppearance(settings?.theme);
  const topPadding = bleedTop ? 0 : insets.top + 12;
  const bottomPadding = insets.bottom + 12;

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        {
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
        },
        style,
      ]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={topPadding}
    >
      <LinearGradient
        colors={appearance.screenGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={appearance.filmGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.8 }}
        style={styles.film}
      />
      <View
        pointerEvents="none"
        style={[styles.frame, { borderColor: appearance.frameBorder }]}
      />
      <View
        pointerEvents="none"
        style={[styles.glowTop, { backgroundColor: appearance.surfaceGlowTop }]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glowCenter,
          { backgroundColor: appearance.surfaceGlowCenter },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glowBottom,
          { backgroundColor: appearance.surfaceGlowBottom },
        ]}
      />
      {children}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: "relative",
  },
  film: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
  },
  glowTop: {
    position: "absolute",
    top: -90,
    left: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.45,
  },
  glowCenter: {
    position: "absolute",
    top: "28%",
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  glowBottom: {
    position: "absolute",
    bottom: -60,
    right: -30,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
});

export default ScreenSurface;
