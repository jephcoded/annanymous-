import Constants from "expo-constants";

const DEFAULT_PORT = 4000;
const API_PREFIX = "/api/v1";
const LEGACY_PRODUCTION_API_BASE_URL = "https://annanymous.onrender.com/api/v1";

const sanitizeBaseUrl = (value?: string | null) => {
  const trimmed = value?.trim();

  return trimmed ? trimmed.replace(/\/$/, "") : null;
};

const inferHost = () => {
  const explicitBaseUrl = sanitizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const extraBaseUrl = sanitizeBaseUrl(
    typeof Constants.expoConfig?.extra?.apiBaseUrl === "string"
      ? Constants.expoConfig.extra.apiBaseUrl
      : null,
  );
  if (extraBaseUrl) {
    return extraBaseUrl;
  }

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.linkingUri;
  if (!hostUri) {
    return __DEV__
      ? `http://localhost:${DEFAULT_PORT}`
      : LEGACY_PRODUCTION_API_BASE_URL;
  }

  const sanitizedHost = hostUri
    .replace(/^[a-z]+:\/\//i, "")
    .split("/")[0]
    .split(":")[0];

  if (!__DEV__) {
    return LEGACY_PRODUCTION_API_BASE_URL;
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

export const IS_LEGACY_PRODUCTION_API =
  !__DEV__ && API_BASE_URL === LEGACY_PRODUCTION_API_BASE_URL;
