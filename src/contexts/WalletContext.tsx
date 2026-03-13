import { useSDK } from "@metamask/sdk-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { API_BASE_URL } from "../config/api";

const WALLET_SESSION_KEY = "ananymous.wallet.session";
const PREVIEW_WALLET_ADDRESS = "0xPreviewWallet00000000000000000000000001";
const PREVIEW_WALLET_TOKEN = "expo-go-preview-session";

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

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { sdk, provider, chainId, account } = useSDK();
  const [session, setSession] = useState<WalletSession | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const switchToEthereumMainnet = useCallback(async () => {
    if (!provider || !chainId || chainId === "0x1") {
      return;
    }

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x1" }],
    });
  }, [chainId, provider]);

  const connectWallet = useCallback(async () => {
    if (!sdk) {
      setError("MetaMask SDK is not ready yet. Please try again.");
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const connectedAccounts = (await sdk.connect()) as string[] | undefined;
      const walletAddress = account ?? connectedAccounts?.[0];

      if (!walletAddress) {
        throw new Error("No wallet account returned from MetaMask.");
      }

      await switchToEthereumMainnet();

      if (!provider) {
        throw new Error(
          "Ethereum provider unavailable after wallet connection.",
        );
      }

      const challengeResponse = await fetch(`${API_BASE_URL}/auth/challenge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress }),
      });

      const challengePayload = await challengeResponse.json();
      if (!challengeResponse.ok) {
        throw new Error(
          challengePayload?.error?.message ??
            "Failed to request sign-in challenge.",
        );
      }

      const normalizedWalletAddress =
        challengePayload.walletAddress ?? walletAddress;
      const signature = (await provider.request({
        method: "personal_sign",
        params: [challengePayload.challenge, normalizedWalletAddress],
      })) as string;

      const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: normalizedWalletAddress,
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
        address: verifyPayload.walletAddress ?? normalizedWalletAddress,
        token: verifyPayload.token,
      };

      setSession(nextSession);
      await persistSession(nextSession);
    } catch (connectError) {
      const message =
        connectError instanceof Error
          ? connectError.message
          : "MetaMask sign-in failed.";
      setError(message);
      throw connectError;
    } finally {
      setIsAuthenticating(false);
    }
  }, [account, persistSession, provider, sdk, switchToEthereumMainnet]);

  const disconnectWallet = useCallback(async () => {
    setError(null);
    setSession(null);
    await persistSession(null);

    try {
      await sdk?.terminate();
    } catch (disconnectError) {
      console.warn(
        "Failed to fully terminate MetaMask session",
        disconnectError,
      );
    }
  }, [persistSession, sdk]);

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
