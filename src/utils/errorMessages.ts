const FRIENDLY_ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern:
      /Session expired|Token invalid or expired|Authorization header missing/i,
    message: "Your session expired. Log in again and try again.",
  },
  {
    pattern: /Connect your wallet to continue/i,
    message: "Log in to continue.",
  },
  {
    pattern: /POST_CONTENT_REQUIRED|Add a caption or an image before posting/i,
    message: "Add some text before posting.",
  },
  {
    pattern: /POLL_OPTIONS_INVALID|A poll needs at least two options/i,
    message: "Add at least two poll options before posting.",
  },
  {
    pattern: /POST_EXPIRY_INVALID|Temporary post expiry must be in the future/i,
    message: "Temporary posts need a valid future expiry time.",
  },
  {
    pattern: /Too many requests|rate limit/i,
    message: "You're posting too fast. Wait a moment and try again.",
  },
  {
    pattern: /CORS|origin not allowed/i,
    message: "The server rejected this request. Please refresh and try again.",
  },
  {
    pattern:
      /Failed to fetch|Network request failed|Network request timed out|ENETUNREACH|ECONNREFUSED|EHOSTUNREACH|ETIMEDOUT/i,
    message: "Network request failed. Check your connection and try again.",
  },
  {
    pattern: /Route not found|404/i,
    message: "That action is not available right now.",
  },
  {
    pattern: /wallet-only backend|current Render backend URL/i,
    message:
      "This app build is still using the old wallet-only backend. Update EXPO_PUBLIC_API_BASE_URL to your current Render backend and rebuild.",
  },
  {
    pattern: /Permission denied|forbidden|not allowed/i,
    message: "You do not have permission to complete this action.",
  },
  {
    pattern: /wallet app not found|provider not found|No Ethereum provider/i,
    message:
      "No wallet app was detected. Install or unlock MetaMask, then try again.",
  },
  {
    pattern: /invalid parameters|invalid params|personal_sign|chainId/i,
    message: "The wallet could not complete that request. Please try again.",
  },
];

export const getFriendlyErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) => {
  const rawMessage =
    error instanceof Error ? error.message : String(error ?? "");

  if (!rawMessage.trim()) {
    return fallback;
  }

  for (const rule of FRIENDLY_ERROR_PATTERNS) {
    if (rule.pattern.test(rawMessage)) {
      return rule.message;
    }
  }

  return rawMessage;
};

export const getFriendlyAlertTitle = (error: unknown) => {
  const rawMessage =
    error instanceof Error ? error.message : String(error ?? "");

  if (/Session expired|Connect your wallet to continue/i.test(rawMessage)) {
    return "Session Needed";
  }

  if (
    /CORS|origin not allowed|Failed to fetch|Network request failed/i.test(
      rawMessage,
    )
  ) {
    return "Connection Problem";
  }

  if (
    /wallet app not found|provider not found|No Ethereum provider/i.test(
      rawMessage,
    )
  ) {
    return "Wallet Missing";
  }

  if (/Permission denied|forbidden|not allowed/i.test(rawMessage)) {
    return "Access Denied";
  }

  return "Notice";
};
