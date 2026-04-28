import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const resolveProjectId = () => {
  const easProjectId = Constants.easConfig?.projectId;
  if (easProjectId) {
    return easProjectId;
  }

  return Constants.expoConfig?.extra?.eas?.projectId;
};

export const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B3DFF",
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermissions.status;

  if (finalStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = resolveProjectId();
  const pushToken = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  return pushToken.data || null;
};