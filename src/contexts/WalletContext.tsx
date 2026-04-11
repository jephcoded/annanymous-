import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { AppState, AppStateStatus } from "react-native";

import { API_BASE_URL } from "../config/api";
import { ensureAppKit, getAppKit } from "../config/appKit";

const WALLET_SESSION_KEY = "ananymous.wallet.session";
const WALLET_PENDING_CONNECT_KEY = "ananymous.wallet.pending-connect";
const PREVIEW_WALLET_ADDRESS = "0xPreviewWallet00000000000000000000000001";
const PREVIEW_WALLET_TOKEN = "expo-go-preview-session";
const CONNECT_TIMEOUT_MS = 60000;

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

const shouldClearPendingState = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /rejected|cancelled|canceled|closed modal|user denied/i.test(message);
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

  if (error.message && /EXPO_PUBLIC_REOWN_PROJECT_ID|Reown project ID/i.test(error.message)) {
    return "Wallet connect is waiting for the Reown project ID in the build config. Rebuild the APK and try again.";
  }

  return error.message || "Wallet connection failed. Please try again.";
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
  isAuthenticating: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
};

type WalletSession = {
  address: string;
  token: string;
};

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
      isAuthenticating: false,
      error: null,
      connectWallet,
      disconnectWallet,
    }),
    [connectWallet, disconnectWallet, isConnected],
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
      isAuthenticating: false,
      error,
      connectWallet,
      disconnectWallet,
    }),
    [connectWallet, disconnectWallet, error],
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
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resumeAttemptRef = useRef(false);

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

  const markPendingConnect = useCallback(async () => {
    await AsyncStorage.setItem(WALLET_PENDING_CONNECT_KEY, "1");
  }, []);

  const clearPendingConnect = useCallback(async () => {
    await AsyncStorage.removeItem(WALLET_PENDING_CONNECT_KEY);
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
          walletProvider.request({
            method: "eth_chainId",
          }) as Promise<string>,
        2,
      ).catch(() => null);

      await delay(900);

      const signature = await withTimeout(
        requestWithRetry(
          () =>
            walletProvider.request({
              method: "personal_sign",
              params: [
                hexlify(toUtf8Bytes(challengePayload.challenge)),
                walletAddress,
              ],
            }) as Promise<string>,
          3,
        ),
        "Wallet signature request did not finish. Return to your wallet and approve the signature.",
      );

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
    [clearPendingConnect, persistSession],
  );

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(WALLET_SESSION_KEY);
        if (!stored) {
          return;
        }

        setSession(JSON.parse(stored));
      } catch (restoreError) {
        console.error("Failed to restore wallet session", restoreError);
      }
    };

    restoreSession();
  }, []);

  const waitForWalletConnection = useCallback(async () => {
    const start = Date.now();
    const appKit = getAppKit();

    if (!appKit) {
      throw new Error(
        "Wallet connect is not ready. Please restart the app and try again.",
      );
    }

    while (Date.now() - start < CONNECT_TIMEOUT_MS) {
      const activeProvider = appKit.getProvider("eip155") ?? undefined;
      let activeAddress: string | undefined;

      if (activeProvider) {
        try {
          const accounts = (await activeProvider.request({
            method: "eth_accounts",
          })) as string[];

          activeAddress = accounts?.[0];
        } catch {}
      }

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

  const tryResumePendingConnection = useCallback(async () => {
    if (resumeAttemptRef.current || session) {
      return;
    }

    const pending = await AsyncStorage.getItem(WALLET_PENDING_CONNECT_KEY);
    if (!pending) {
      return;
    }

    resumeAttemptRef.current = true;
    setIsAuthenticating(true);
    setError(null);

    try {
      const appKit = ensureAppKit();
      if (!appKit) {
        throw new Error(
          "Wallet connect is not ready. Please restart the app and try again.",
        );
      }

      await delay(1200);
      const activeProvider = appKit.getProvider("eip155");
      if (!activeProvider) {
        return;
      }

      const accounts = (await activeProvider.request({
        method: "eth_accounts",
      })) as string[];
      const walletAddress = accounts?.[0];

      if (!walletAddress) {
        return;
      }

      await completeWalletAuthentication(walletAddress, activeProvider);
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
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        tryResumePendingConnection();
      }
    };

    const subscription = AppState.addEventListener("change", onAppStateChange);
    const timer = setTimeout(() => {
      tryResumePendingConnection();
    }, 1400);

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [tryResumePendingConnection]);

  const connectWallet = useCallback(async () => {
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

      appKit.open({ view: "Connect" });

      const { walletAddress, walletProvider } = await withTimeout(
        waitForWalletConnection(),
        "Wallet connection did not finish. Return to the app and try again.",
      );

      await completeWalletAuthentication(walletAddress, walletProvider);
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
    waitForWalletConnection,
  ]);

  const disconnectWallet = useCallback(async () => {
    setError(null);
    setSession(null);
    await persistSession(null);
    await clearPendingConnect();

    try {
      await getAppKit()?.disconnect();
    } catch (disconnectError) {
      console.warn("Failed to fully terminate wallet session", disconnectError);
    }
  }, [clearPendingConnect, persistSession]);

  const value = useMemo(
    () => ({
      isConnected: Boolean(session?.token && session?.address),
      address: session?.address ?? null,
      token: session?.token ?? null,
      isAuthenticating,
      error,
      connectWallet,
      disconnectWallet,
    }),
    [connectWallet, disconnectWallet, error, isAuthenticating, session],
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
