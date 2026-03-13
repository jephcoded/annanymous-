import { LinearGradient } from "expo-linear-gradient";
import React, { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../theme";

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

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: bleedTop ? 0 : insets.top + 12,
          paddingBottom: insets.bottom + 12,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={["#0A1020", COLORS.background, "#04060C"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.8 }}
        style={styles.film}
      />
      <View pointerEvents="none" style={styles.frame} />
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowCenter} />
      <View pointerEvents="none" style={styles.glowBottom} />
      {children}
    </View>
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
    borderColor: "rgba(255,255,255,0.05)",
  },
  glowTop: {
    position: "absolute",
    top: -90,
    left: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.primary + "30",
    opacity: 0.75,
  },
  glowCenter: {
    position: "absolute",
    top: "28%",
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(52,200,255,0.12)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -60,
    right: -30,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.secondary + "24",
  },
});

export default ScreenSurface;
