import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

type SkeletonBlockProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export const SkeletonBlock = ({
  width = "100%",
  height = 14,
  borderRadius = 8,
  style,
}: SkeletonBlockProps) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

export const PostSkeleton = () => (
  <View style={styles.postCard}>
    <View style={styles.postHeader}>
      <SkeletonBlock width={28} height={28} borderRadius={14} />
      <View style={styles.postHeaderText}>
        <SkeletonBlock width={110} height={11} />
        <SkeletonBlock width={70} height={9} style={styles.spacingTop} />
      </View>
    </View>
    <SkeletonBlock width="100%" height={13} style={styles.spacingTop} />
    <SkeletonBlock width="80%" height={13} style={styles.spacingTop} />
    <View style={styles.actionRow}>
      <SkeletonBlock width={40} height={20} borderRadius={999} />
      <SkeletonBlock width={40} height={20} borderRadius={999} />
      <SkeletonBlock width={40} height={20} borderRadius={999} />
    </View>
  </View>
);

export const FeedSkeleton = ({ count = 4 }: { count?: number }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <PostSkeleton key={index} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  block: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  postCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  postHeaderText: {
    flex: 1,
  },
  spacingTop: {
    marginTop: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
});
