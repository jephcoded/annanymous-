import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

export const TAB_ORDER = ["Home", "Post", "Communities", "Wallet"] as const;
export type TabName = (typeof TAB_ORDER)[number];

const SWIPE_DISTANCE_THRESHOLD = 60;

type SwipeableTabScreenProps = {
  tabName: TabName;
  atRoot: boolean;
  children: React.ReactNode;
};

const SwipeableTabScreen = ({
  tabName,
  atRoot,
  children,
}: SwipeableTabScreenProps) => {
  const navigation = useNavigation<any>();

  const goToTab = (nextTab: TabName) => {
    navigation.jumpTo(nextTab);
  };

  const pan = Gesture.Pan()
    .enabled(atRoot)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((event) => {
      const currentIndex = TAB_ORDER.indexOf(tabName);

      if (
        event.translationX <= -SWIPE_DISTANCE_THRESHOLD &&
        currentIndex < TAB_ORDER.length - 1
      ) {
        runOnJS(goToTab)(TAB_ORDER[currentIndex + 1]);
        return;
      }

      if (event.translationX >= SWIPE_DISTANCE_THRESHOLD && currentIndex > 0) {
        runOnJS(goToTab)(TAB_ORDER[currentIndex - 1]);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill}>{children}</View>
    </GestureDetector>
  );
};

export default SwipeableTabScreen;

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
