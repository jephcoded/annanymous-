import AsyncStorage from "@react-native-async-storage/async-storage";
import { CoreHelperUtil, WcController } from "@reown/appkit-core-react-native";
import { hexlify, toUtf8Bytes } from "ethers/lib/utils";
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AppState, AppStateStatus, Linking, Platform } from "react-native";

import { API_BASE_URL } from "../config/api";
import { ensureAppKit, getAppKit } from "../config/appKit";
import { WEB3_CONFIG } from "../config/web3";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";
import {
    getMe,
    getSettings,
    loginWithPassword,
  registerPushToken,
    registerAuthFailureHandler,
    signupWithPassword,
    updateSettings,
    UserSettings,
} from "../services/api";

const WALLET_SESSION_KEY = "ananymous.wallet.session";
const WALLET_PENDING_CONNECT_KEY = "ananymous.wallet.pending-connect";
const POST_SIGNUP_WELCOME_KEY = "ananymous.auth.just-signed-up";
const PREVIEW_WALLET_ADDRESS = "0xPreviewWallet00000000000000000000000001";
const PREVIEW_WALLET_TOKEN = "expo-go-preview-session";
const CONNECT_TIMEOUT_MS = 60000;
const CAIP_CHAIN_ID = `eip155:${WEB3_CONFIG.chainId}`;
const METAMASK_MOBILE_WALLET = {
  id: "io.metamask",
  name: "MetaMask",
  homepage: "https://metamask.io/",
  mobile_link: "metamask://",
  app_store:
    "https://apps.apple.com/app/metamask-blockchain-wallet/id1438144202",
  play_store: "https://play.google.com/store/apps/details?id=io.metamask",
  android_app_id: "io.metamask",
  ios_schema: "metamask",
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientWalletTransportError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return /ENETUNREACH|Network request failed|Network request timed out|No internet connection|Couldn't establish socket connection/i.test(
    message,
  );
};

const isBackendConnectivityError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return /connect\s+ENETUNREACH|ECONNREFUSED|EHOSTUNREACH|ETIMEDOUT|:5432\b|Local \(::0\)/i.test(
    message,
  );
};

const isWalletChainIdError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return /Missing or invalid\. request\(\) chainId|invalid chainId|unsupported chainId|Namespace .* not configured/i.test(
    message,
  );
};

const shouldClearPendingState = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /rejected|cancelled|canceled|closed modal|user denied/i.test(message);
};

const isHexAddress = (value: unknown): value is string =>
  typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);

const extractAddressFromNamespaces = (
  namespaces: Record<string, any> | undefined,
) => {
  const namespaceAccounts = Object.values(namespaces ?? {}).flatMap(
    (namespaceValue) => {
      if (!namespaceValue || !Array.isArray(namespaceValue.accounts)) {
        return [] as string[];
      }

      return namespaceValue.accounts as string[];
    },
  );

  for (const account of namespaceAccounts) {
    const candidate = account.split(":").at(-1);
    if (isHexAddress(candidate)) {
      return candidate;
    }
  }

  return null;
};

const getWalletAddressFromProvider = async (walletProvider: any) => {
  const sessionAddress = extractAddressFromNamespaces(
    walletProvider?.session?.namespaces,
  );
  if (sessionAddress) {
    return sessionAddress;
  }

  if (typeof walletProvider?.request !== "function") {
    return null;
  }

  try {
    const accounts = (await requestWalletMethod(
      walletProvider,
      "eth_accounts",
    )) as unknown[];

    return accounts.find(isHexAddress) ?? null;
  } catch {
    return null;
  }
};

const requestWalletMethod = async (
  walletProvider: any,
  method: string,
  params?: unknown[],
) => {
  if (typeof walletProvider?.request !== "function") {
    throw new Error("Selected wallet provider cannot process requests.");
  }

  try {
    return await walletProvider.request(
      {
        method,
        params,
      },
      CAIP_CHAIN_ID,
    );
  } catch (error) {
    if (!isWalletChainIdError(error)) {
      throw error;
    }
  }

  return await walletProvider.request({
    method,
    params,
  });
};

const requestWalletSignature = async (
  walletProvider: any,
  walletAddress: string,
  challenge: string,
) => {
  let lastError: unknown;

  for (const payload of [challenge, hexlify(toUtf8Bytes(challenge))]) {
    try {
      return await requestWithRetry(
        () =>
          requestWalletMethod(walletProvider, "personal_sign", [
            payload,
            walletAddress,
          ]) as Promise<string>,
        3,
      );
    } catch (error) {
      lastError = error;

      if (isWalletChainIdError(error)) {
        continue;
      }

      const message =
        error instanceof Error ? error.message : String(error ?? "");
      if (!/invalid params|hex|personal_sign/i.test(message)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Wallet signature request failed.");
};

const getWalletErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Wallet sign-in failed. Please ensure you have a supported wallet app installed and try again.";
  }

  if (isTransientWalletTransportError(error)) {
    return "Wallet transport could not reach the signing relay in time. Try again once, and if it repeats, switch between mobile data and Wi-Fi before reconnecting.";
  }

  if (isBackendConnectivityError(error)) {
    return "Wallet sign-in could not reach the verification service right now. Please try again in a moment.";
  }

  if (
    error.message &&
    /No Ethereum provider|wallet app not found|provider not found/i.test(
      error.message,
    )
  ) {
    return "No wallet app detected. Please install MetaMask or a compatible wallet, then try again.";
  }

  if (
    error.message &&
    /LINKING_ERROR|MetaMask app was not found|MetaMask did not open/i.test(
      error.message,
    )
  ) {
    return "MetaMask did not open. Make sure MetaMask is installed on this phone, then try again.";
  }

  if (
    error.message &&
    /EXPO_PUBLIC_REOWN_PROJECT_ID|Reown project ID/i.test(error.message)
  ) {
    return "Wallet connect is waiting for the Reown project ID in the build config. Rebuild the APK and try again.";
  }

  return error.message || "Wallet connection failed. Please try again.";
};

const isSessionAuthError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return /Session expired|Connect your wallet to continue|Token invalid or expired|Authorization header missing/i.test(
    message,
  );
};

const requestWithRetry = async <T,>(
  operation: () => Promise<T>,
  attempts = 3,
) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransientWalletTransportError(error) || attempt === attempts) {
        throw error;
      }

      await delay(1500 * attempt);
    }
  }

  throw lastError;
};

type WalletContextValue = {
  isConnected: boolean;
  address: string | null;
  token: string | null;
  settings: UserSettings;
  isSessionReady: boolean;
  isAuthenticating: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateAppSettings: (
    settings: Partial<UserSettings>,
  ) => Promise<UserSettings | null>;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  signUp: (payload: {
    email: string;
    password: string;
    displayName?: string;
    bio?: string;
  }) => Promise<void>;
};

type WalletSession = {
  address: string | null;
  token: string;
  email?: string | null;
  displayName?: string | null;
  authType?: string | null;
};

const deriveSessionAddress = (payload: {
  walletAddress?: string | null;
  email?: string | null;
  displayName?: string | null;
}) => payload.displayName || payload.email || payload.walletAddress || null;

const createDefaultSettings = (): UserSettings => ({
  userId: 0,
  pushEnabled: true,
  emailEnabled: false,
  marketingEnabled: false,
  showWalletSummary: true,
  directMessagesEnabled: false,
  mutedKeywords: [],
  theme: "dark",
  updatedAt: new Date(0).toISOString(),
});

const withTimeout = async <T,>(promise: Promise<T>, message: string) =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), CONNECT_TIMEOUT_MS);
    }),
  ]);

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const PreviewWalletProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [isConnected, setIsConnected] = useState(true);
  const settings = useMemo(() => createDefaultSettings(), []);

  const connectWallet = useCallback(async () => {
    setIsConnected(true);
  }, []);

  const disconnectWallet = useCallback(async () => {
    setIsConnected(false);
  }, []);

  const value = useMemo(
    () => ({
      isConnected,
      address: isConnected ? PREVIEW_WALLET_ADDRESS : null,
      token: isConnected ? PREVIEW_WALLET_TOKEN : null,
      settings,
      isSessionReady: true,
      isAuthenticating: false,
      error: null,
      connectWallet,
      disconnectWallet,
      refreshSettings: async () => undefined,
      updateAppSettings: async () => settings,
      signIn: async () => undefined,
      signUp: async () => undefined,
    }),
    [connectWallet, disconnectWallet, isConnected, settings],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const WalletConfigFallbackProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [error, setError] = useState<string | null>(null);
  const settings = useMemo(() => createDefaultSettings(), []);

  const connectWallet = useCallback(async () => {
    setError(
      "Wallet connect is waiting for the Reown project ID in the build config. Rebuild the APK and try again.",
    );
  }, []);

  const disconnectWallet = useCallback(async () => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      isConnected: false,
      address: null,
      token: null,
      settings,
      isSessionReady: true,
      isAuthenticating: false,
      error,
      connectWallet,
      disconnectWallet,
      refreshSettings: async () => undefined,
      updateAppSettings: async () => settings,
      signIn: async () => {
        setError("Sign in is not available in this fallback mode.");
      },
      signUp: async () => {
        setError("Create account is not available in this fallback mode.");
      },
    }),
    [connectWallet, disconnectWallet, error, settings],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const BrowserWalletProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [session, setSession] = useState<WalletSession | null>(null);
  const [settings, setSettings] = useState<UserSettings>(createDefaultSettings);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistSession = useCallback(
    async (nextSession: WalletSession | null) => {
      if (!nextSession) {
        await AsyncStorage.removeItem(WALLET_SESSION_KEY);
        return;
      }

      await AsyncStorage.setItem(
        WALLET_SESSION_KEY,
        JSON.stringify(nextSession),
      );
    },
    [],
  );

  const clearSession = useCallback(
    async (nextError: string | null = null) => {
      setError(nextError);
      setSession(null);
      setSettings(createDefaultSettings());
      await persistSession(null);
    },
    [persistSession],
  );

  const refreshSettings = useCallback(async () => {
    if (!session?.token) {
      setSettings(createDefaultSettings());
      return;
    }

    const response = await getSettings(session.token);
    setSettings(response.data);
  }, [session?.token]);

  const updateAppSettings = useCallback(
    async (nextSettings: Partial<UserSettings>) => {
      if (!session?.token) {
        return null;
      }

      const previous = settings;
      const optimistic = { ...previous, ...nextSettings };
      setSettings(optimistic);

      try {
        const response = await updateSettings(session.token, nextSettings);
        setSettings(response.data);
        return response.data;
      } catch (updateError) {
        setSettings(previous);
        throw updateError;
      }
    },
    [session?.token, settings],
  );

  useEffect(() => {
    const unregister = registerAuthFailureHandler(() => {
      void clearSession("Session expired. Reconnect your wallet.");
    });

    return unregister;
  }, [clearSession]);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(WALLET_SESSION_KEY);
        if (!stored) {
          return;
        }

        const parsed = JSON.parse(stored) as Partial<WalletSession> | null;
        if (!parsed?.token) {
          await clearSession();
          return;
        }

        if (isMounted) {
          setIsAuthenticating(true);
          setError(null);
        }

        const meResponse = await getMe(parsed.token);

        if (isMounted) {
          setSettings(meResponse.data.settings);
          setSession({
            address: deriveSessionAddress({
              walletAddress: meResponse.data.access.walletAddress,
              email: meResponse.data.access.email,
              displayName: meResponse.data.profile.displayName,
            }),
            token: parsed.token,
            email: meResponse.data.access.email,
            displayName: meResponse.data.profile.displayName,
            authType: meResponse.data.access.authType,
          });
        }
      } catch (restoreError) {
        if (isSessionAuthError(restoreError)) {
          await clearSession();
          return;
        }

        console.error("Failed to restore browser wallet session", restoreError);
      } finally {
        if (isMounted) {
          setIsSessionReady(true);
          setIsAuthenticating(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  const connectWallet = useCallback(async () => {
    if (session?.token && session.address) {
      setError(null);
      return;
    }

    if (Platform.OS !== "web") {
      setError("Browser wallet sign-in is only available on web.");
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const ethereum = (
        globalThis as typeof globalThis & {
          ethereum?: {
            request: (payload: {
              method: string;
              params?: unknown[];
            }) => Promise<unknown>;
          };
        }
      ).ethereum;

      if (!ethereum?.request) {
        throw new Error(
          "No browser wallet detected. Open the admin page in MetaMask Browser or install a wallet extension.",
        );
      }

      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as unknown[];
      const walletAddress = accounts.find(isHexAddress);

      if (!walletAddress) {
        throw new Error("Wallet did not return an address.");
      }

      const challengeResponse = await fetch(`${API_BASE_URL}/auth/challenge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const challengePayload = await challengeResponse.json();
      if (!challengeResponse.ok) {
        throw new Error(
          challengePayload?.error?.message ??
            "Failed to request sign-in challenge.",
        );
      }

      const signature = (await ethereum.request({
        method: "personal_sign",
        params: [
          hexlify(toUtf8Bytes(challengePayload.challenge)),
          walletAddress,
        ],
      })) as string;

      const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId: challengePayload.challengeId,
          signature,
        }),
      });

      const verifyPayload = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(
          verifyPayload?.error?.message ??
            "Wallet signature verification failed.",
        );
      }

      const nextSession = {
        address: verifyPayload.walletAddress,
        token: verifyPayload.token,
      };

      setSession(nextSession);
      await persistSession(nextSession);
    } catch (connectError) {
      setError(getWalletErrorMessage(connectError));
    } finally {
      setIsAuthenticating(false);
    }
  }, [persistSession, session?.address, session?.token]);

  const disconnectWallet = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      isConnected: Boolean(session?.token && session?.address),
      address: session?.address ?? null,
      token: session?.token ?? null,
      settings,
      isSessionReady,
      isAuthenticating,
      error,
      connectWallet,
      disconnectWallet,
      refreshSettings,
      updateAppSettings,
    }),
    [
      connectWallet,
      disconnectWallet,
      error,
      isAuthenticating,
      isSessionReady,
      refreshSettings,
      session,
      settings,
      updateAppSettings,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const WalletProvider = ({
  children,
  onBeforeConnect,
}: {
  children: ReactNode;
  onBeforeConnect?: () => Promise<void> | void;
}) => {
  const [session, setSession] = useState<WalletSession | null>(null);
  const [settings, setSettings] = useState<UserSettings>(createDefaultSettings);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resumeAttemptRef = useRef(false);
  const pendingCompletionPromiseRef = useRef<Promise<void> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const walletFlowPendingRef = useRef(false);
  const walletLeftAppRef = useRef(false);
  const walletReturnedRef = useRef(false);
  const walletReturnWaitersRef = useRef<Array<() => void>>([]);
  const registeredPushTokenRef = useRef<string | null>(null);

  const persistSession = useCallback(
    async (nextSession: WalletSession | null) => {
      if (!nextSession) {
        await AsyncStorage.removeItem(WALLET_SESSION_KEY);
        return;
      }

      await AsyncStorage.setItem(
        WALLET_SESSION_KEY,
        JSON.stringify(nextSession),
      );
    },
    [],
  );

  const resolveWalletReturnWaiters = useCallback(() => {
    const waiters = walletReturnWaitersRef.current;
    walletReturnWaitersRef.current = [];
    waiters.forEach((resolve) => resolve());
  }, []);

  const markPendingConnect = useCallback(async () => {
    walletFlowPendingRef.current = true;
    walletLeftAppRef.current = false;
    walletReturnedRef.current = false;
    await AsyncStorage.setItem(WALLET_PENDING_CONNECT_KEY, "1");
  }, []);

  const clearPendingConnect = useCallback(async () => {
    walletFlowPendingRef.current = false;
    walletLeftAppRef.current = false;
    walletReturnedRef.current = false;
    resolveWalletReturnWaiters();
    await AsyncStorage.removeItem(WALLET_PENDING_CONNECT_KEY);
  }, [resolveWalletReturnWaiters]);

  const clearSession = useCallback(
    async (nextError: string | null = null) => {
      setError(nextError);
      setSession(null);
      setSettings(createDefaultSettings());
      registeredPushTokenRef.current = null;
      await persistSession(null);
      await clearPendingConnect();
    },
    [clearPendingConnect, persistSession],
  );

  const refreshSettings = useCallback(async () => {
    if (!session?.token) {
      setSettings(createDefaultSettings());
      return;
    }

    const response = await getSettings(session.token);
    setSettings(response.data);
  }, [session?.token]);

  const updateAppSettings = useCallback(
    async (nextSettings: Partial<UserSettings>) => {
      if (!session?.token) {
        return null;
      }

      const previous = settings;
      const optimistic = { ...previous, ...nextSettings };
      setSettings(optimistic);

      try {
        const response = await updateSettings(session.token, nextSettings);
        setSettings(response.data);
        return response.data;
      } catch (updateError) {
        setSettings(previous);
        throw updateError;
      }
    },
    [session?.token, settings],
  );

  useEffect(() => {
    if (!session?.token || !settings.pushEnabled) {
      return;
    }

    let cancelled = false;

    const syncPushToken = async () => {
      try {
        const expoPushToken = await registerForPushNotificationsAsync();
        if (!expoPushToken || cancelled) {
          return;
        }

        if (registeredPushTokenRef.current === expoPushToken) {
          return;
        }

        await registerPushToken(session.token, {
          pushToken: expoPushToken,
          pushPlatform: Platform.OS,
        });

        if (!cancelled) {
          registeredPushTokenRef.current = expoPushToken;
        }
      } catch (pushError) {
        console.error("Push token registration failed", pushError);
      }
    };

    void syncPushToken();

    return () => {
      cancelled = true;
    };
  }, [session?.token, settings.pushEnabled]);

  const waitForWalletReturn = useCallback(async () => {
    if (!walletFlowPendingRef.current || !walletLeftAppRef.current) {
      return;
    }

    if (walletReturnedRef.current && appStateRef.current === "active") {
      return;
    }

    await withTimeout(
      new Promise<void>((resolve) => {
        walletReturnWaitersRef.current.push(resolve);
      }),
      "Wallet did not return to the app. Switch back to the app and try again.",
    );

    await delay(250);
  }, []);

  const completeWalletAuthentication = useCallback(
    async (walletAddress: string, walletProvider: any) => {
      const challengeResponse = await fetch(`${API_BASE_URL}/auth/challenge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const challengePayload = await challengeResponse.json();
      if (!challengeResponse.ok) {
        throw new Error(
          challengePayload?.error?.message ??
            "Failed to request sign-in challenge.",
        );
      }

      await requestWithRetry(
        () =>
          requestWalletMethod(walletProvider, "eth_chainId") as Promise<string>,
        2,
      ).catch(() => null);

      await delay(900);

      const signature = await withTimeout(
        requestWalletSignature(
          walletProvider,
          walletAddress,
          challengePayload.challenge,
        ),
        "Wallet signature request did not finish. Return to your wallet and approve the signature.",
      );

      await waitForWalletReturn();

      const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId: challengePayload.challengeId,
          signature,
        }),
      });

      const verifyPayload = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(
          verifyPayload?.error?.message ??
            "Wallet signature verification failed.",
        );
      }

      const nextSession = {
        address: verifyPayload.walletAddress,
        token: verifyPayload.token,
      };

      setSession(nextSession);
      await persistSession(nextSession);
      await clearPendingConnect();

      try {
        await getAppKit()?.close();
      } catch {}
    },
    [clearPendingConnect, persistSession, waitForWalletReturn],
  );

  useEffect(() => {
    const unregister = registerAuthFailureHandler(() => {
      void clearSession("Session expired. Log in again.");
    });

    return unregister;
  }, [clearSession]);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(WALLET_SESSION_KEY);
        if (!stored) {
          return;
        }

        const parsed = JSON.parse(stored) as Partial<WalletSession> | null;
        if (!parsed?.token) {
          await clearSession();
          return;
        }

        if (isMounted) {
          setIsAuthenticating(true);
          setError(null);
        }

        const meResponse = await getMe(parsed.token);

        if (isMounted) {
          setSettings(meResponse.data.settings);
          setSession({
            address: deriveSessionAddress({
              walletAddress: meResponse.data.access.walletAddress,
              email: meResponse.data.access.email,
              displayName: meResponse.data.profile.displayName,
            }),
            token: parsed.token,
            email: meResponse.data.access.email,
            displayName: meResponse.data.profile.displayName,
            authType: meResponse.data.access.authType,
          });
        }
      } catch (restoreError) {
        if (isSessionAuthError(restoreError)) {
          await clearSession();
          return;
        }

        console.error("Failed to restore wallet session", restoreError);
      } finally {
        if (isMounted) {
          setIsSessionReady(true);
          setIsAuthenticating(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  const waitForWalletConnection = useCallback(async () => {
    const start = Date.now();
    const appKit = getAppKit();

    if (!appKit) {
      throw new Error(
        "Wallet connect is not ready. Please restart the app and try again.",
      );
    }

    while (Date.now() - start < CONNECT_TIMEOUT_MS) {
      const activeProvider =
        appKit.getProvider("eip155") ?? appKit.getProvider() ?? undefined;
      const activeAddress = activeProvider
        ? await getWalletAddressFromProvider(activeProvider)
        : null;

      if (activeAddress && activeProvider) {
        return {
          walletAddress: activeAddress,
          walletProvider: activeProvider,
        };
      }

      await delay(350);
    }

    throw new Error(
      "Wallet connection did not finish. Return to the app and try again.",
    );
  }, []);

  const waitForWalletConnectUri = useCallback(async () => {
    const start = Date.now();

    while (Date.now() - start < CONNECT_TIMEOUT_MS) {
      const nextUri = WcController.state.wcUri;
      if (nextUri) {
        return nextUri;
      }

      await delay(150);
    }

    throw new Error(
      "MetaMask did not receive the connection request. Try again.",
    );
  }, []);

  const completePendingConnection = useCallback(async () => {
    if (session) {
      return;
    }

    if (pendingCompletionPromiseRef.current) {
      return pendingCompletionPromiseRef.current;
    }

    const completionPromise = (async () => {
      const appKit = ensureAppKit();
      if (!appKit) {
        throw new Error(
          "Wallet connect is not ready. Please restart the app and try again.",
        );
      }

      const { walletAddress, walletProvider } = await waitForWalletConnection();
      await waitForWalletReturn();
      await completeWalletAuthentication(walletAddress, walletProvider);
    })();

    pendingCompletionPromiseRef.current = completionPromise.finally(() => {
      pendingCompletionPromiseRef.current = null;
    });

    return pendingCompletionPromiseRef.current;
  }, [
    completeWalletAuthentication,
    session,
    waitForWalletConnection,
    waitForWalletReturn,
  ]);

  const tryResumePendingConnection = useCallback(async () => {
    if (resumeAttemptRef.current || session) {
      return;
    }

    const pending = await AsyncStorage.getItem(WALLET_PENDING_CONNECT_KEY);
    if (!pending) {
      return;
    }

    walletFlowPendingRef.current = true;

    resumeAttemptRef.current = true;
    setIsAuthenticating(true);
    setError(null);

    try {
      await delay(1200);
      await withTimeout(
        completePendingConnection(),
        "Wallet connection did not finish. Return to the app and try again.",
      );
    } catch (resumeError) {
      if (shouldClearPendingState(resumeError)) {
        await clearPendingConnect();
      }
      setError(getWalletErrorMessage(resumeError));
    } finally {
      setIsAuthenticating(false);
      resumeAttemptRef.current = false;
    }
  }, [clearPendingConnect, completeWalletAuthentication, session]);

  useEffect(() => {
    const markWalletReturned = () => {
      if (!walletFlowPendingRef.current) {
        return;
      }

      walletReturnedRef.current = true;
      resolveWalletReturnWaiters();
      void tryResumePendingConnection();
    };

    const handleWalletDeepLink = async (url: string | null | undefined) => {
      if (!url?.startsWith("ananymous://")) {
        return;
      }

      const hasPendingConnect =
        walletFlowPendingRef.current ||
        (await AsyncStorage.getItem(WALLET_PENDING_CONNECT_KEY));

      if (!hasPendingConnect) {
        return;
      }

      walletFlowPendingRef.current = true;
      walletLeftAppRef.current = true;
      appStateRef.current = "active";
      markWalletReturned();
    };

    const onAppStateChange = (nextState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (!walletFlowPendingRef.current) {
        return;
      }

      if (nextState !== "active") {
        walletLeftAppRef.current = true;
        walletReturnedRef.current = false;
        return;
      }

      if (walletLeftAppRef.current || previousState !== "active") {
        markWalletReturned();
      }
    };

    const onDeepLink = ({ url }: { url: string }) => {
      void handleWalletDeepLink(url);
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      onAppStateChange,
    );
    const linkingSubscription = Linking.addEventListener("url", onDeepLink);
    void Linking.getInitialURL()
      .then(handleWalletDeepLink)
      .catch(() => undefined);
    const timer = setTimeout(() => {
      void tryResumePendingConnection();
    }, 1400);

    return () => {
      appStateSubscription.remove();
      linkingSubscription.remove();
      clearTimeout(timer);
    };
  }, [resolveWalletReturnWaiters, tryResumePendingConnection]);

  const connectWallet = useCallback(async () => {
    if (Platform.OS !== "web") {
      setError("Use Log in or Create account to enter ANON.");
      return;
    }

    if (session?.token && session.address) {
      setError(null);
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      await markPendingConnect();
      await onBeforeConnect?.();

      const appKit = ensureAppKit();
      if (!appKit) {
        throw new Error(
          "Wallet connect is not ready. Please restart the app and try again.",
        );
      }

      if (Platform.OS === "web") {
        appKit.open();

        await withTimeout(
          completePendingConnection(),
          "Wallet connection did not finish. Return to the app and try again.",
        );
      } else {
        WcController.clearUri();

        const connectPromise = appKit.connect({
          wallet: METAMASK_MOBILE_WALLET as any,
        });

        const wcUri = await withTimeout(
          waitForWalletConnectUri(),
          "MetaMask did not receive the connection request. Try again.",
        );
        const { redirect } = CoreHelperUtil.formatNativeUrl(
          METAMASK_MOBILE_WALLET.mobile_link,
          wcUri,
        );

        await CoreHelperUtil.openLink(redirect);
        await withTimeout(
          connectPromise,
          "Wallet connection did not finish. Return to the app and try again.",
        );
        await withTimeout(
          completePendingConnection(),
          "Wallet connection did not finish. Return to the app and try again.",
        );
      }
    } catch (connectError) {
      try {
        await getAppKit()?.close();
      } catch {}

      if (shouldClearPendingState(connectError)) {
        await clearPendingConnect();
      }

      setError(getWalletErrorMessage(connectError));
    } finally {
      setIsAuthenticating(false);
    }
  }, [
    clearPendingConnect,
    completeWalletAuthentication,
    markPendingConnect,
    onBeforeConnect,
    session?.address,
    session?.token,
    completePendingConnection,
    waitForWalletConnectUri,
  ]);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setIsAuthenticating(true);
      setError(null);

      try {
        const response = await loginWithPassword({ email, password });
        const meResponse = await getMe(response.token);
        const nextSession = {
          address: deriveSessionAddress({
            walletAddress: meResponse.data.access.walletAddress,
            email: meResponse.data.access.email,
            displayName: meResponse.data.profile.displayName,
          }),
          token: response.token,
          email: meResponse.data.access.email,
          displayName: meResponse.data.profile.displayName,
          authType: meResponse.data.access.authType,
        };

        setSettings(meResponse.data.settings);
        setSession(nextSession);
        await persistSession(nextSession);
      } catch (authError) {
        setError(getWalletErrorMessage(authError));
      } finally {
        setIsAuthenticating(false);
      }
    },
    [persistSession],
  );

  const signUp = useCallback(
    async (payload: {
      email: string;
      password: string;
      displayName?: string;
      bio?: string;
    }) => {
      setIsAuthenticating(true);
      setError(null);

      try {
        const response = await signupWithPassword(payload);
        const meResponse = await getMe(response.token);
        await AsyncStorage.setItem(POST_SIGNUP_WELCOME_KEY, "true");
        const nextSession = {
          address: deriveSessionAddress({
            walletAddress: meResponse.data.access.walletAddress,
            email: meResponse.data.access.email,
            displayName: meResponse.data.profile.displayName,
          }),
          token: response.token,
          email: meResponse.data.access.email,
          displayName: meResponse.data.profile.displayName,
          authType: meResponse.data.access.authType,
        };

        setSettings(meResponse.data.settings);
        setSession(nextSession);
        await persistSession(nextSession);
      } catch (authError) {
        setError(getWalletErrorMessage(authError));
      } finally {
        setIsAuthenticating(false);
      }
    },
    [persistSession],
  );

  const disconnectWallet = useCallback(async () => {
    await clearSession();

    try {
      await getAppKit()?.disconnect();
    } catch (disconnectError) {
      console.warn("Failed to fully terminate wallet session", disconnectError);
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      isConnected: Boolean(session?.token),
      address: session?.address ?? null,
      token: session?.token ?? null,
      settings,
      isSessionReady,
      isAuthenticating,
      error,
      connectWallet,
      disconnectWallet,
      refreshSettings,
      updateAppSettings,
      signIn,
      signUp,
    }),
    [
      connectWallet,
      disconnectWallet,
      error,
      isAuthenticating,
      isSessionReady,
      refreshSettings,
      session,
      settings,
      signIn,
      signUp,
      updateAppSettings,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};
