import Constants from "expo-constants";

const DEFAULT_PORT = 4000;
const API_PREFIX = "/api/v1";
const DEFAULT_PRODUCTION_API_BASE_URL =
  "https://annanymous.onrender.com/api/v1";

const inferHost = () => {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.linkingUri;
  if (!hostUri) {
    return __DEV__
      ? `http://localhost:${DEFAULT_PORT}`
      : DEFAULT_PRODUCTION_API_BASE_URL;
  }

  const sanitizedHost = hostUri
    .replace(/^[a-z]+:\/\//i, "")
    .split("/")[0]
    .split(":")[0];

  if (!__DEV__) {
    return DEFAULT_PRODUCTION_API_BASE_URL;
  }

  return `http://${sanitizedHost}:${DEFAULT_PORT}`;
};

const resolvedBase = inferHost();

export const API_ORIGIN = resolvedBase.endsWith(API_PREFIX)
  ? resolvedBase.slice(0, -API_PREFIX.length)
  : resolvedBase;

export const API_BASE_URL = resolvedBase.endsWith(API_PREFIX)
  ? resolvedBase
  : `${resolvedBase}${API_PREFIX}`;
