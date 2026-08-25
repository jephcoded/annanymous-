import * as Haptics from "expo-haptics";

const safeHaptic = (fn: () => Promise<void>) => {
  fn().catch(() => undefined);
};

export const hapticTap = () =>
  safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

export const hapticSuccess = () =>
  safeHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );

export const hapticSelect = () => safeHaptic(() => Haptics.selectionAsync());
