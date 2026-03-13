import Constants from "expo-constants";

const DEFAULT_PORT = 4000;

const inferHost = () => {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.linkingUri;
  if (!hostUri) {
    return `http://localhost:${DEFAULT_PORT}`;
  }

  const sanitizedHost = hostUri
    .replace(/^[a-z]+:\/\//i, "")
    .split("/")[0]
    .split(":")[0];

  return `http://${sanitizedHost}:${DEFAULT_PORT}`;
};

export const API_ORIGIN = inferHost();
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;
