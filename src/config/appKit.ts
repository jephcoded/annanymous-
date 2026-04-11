import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const projectIdFromEnv = process.env.EXPO_PUBLIC_REOWN_PROJECT_ID?.trim() ?? "";
const projectIdFromExtra =
  typeof Constants.expoConfig?.extra?.reownProjectId === "string"
    ? Constants.expoConfig.extra.reownProjectId.trim()
    : "";

const projectId = projectIdFromEnv || projectIdFromExtra;

export const isAppKitConfigured = projectId.length > 0;

const storage = {
  async getKeys() {
    return AsyncStorage.getAllKeys();
  },
  async getEntries() {
    const keys = await AsyncStorage.getAllKeys();
    if (!keys.length) {
      return [];
    }

    const entries = await AsyncStorage.multiGet(keys);
    return entries.map(([key, value]) => {
      if (!value) {
        return [key, undefined] as [string, undefined];
      }

      try {
        return [key, JSON.parse(value)] as [string, unknown];
      } catch {
        return [key, value] as [string, string];
      }
    });
  },
  async getItem(key) {
    const value = await AsyncStorage.getItem(key);
    if (!value) {
      return undefined;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
  async setItem(key, value) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async removeItem(key) {
    await AsyncStorage.removeItem(key);
  },
};

let appKitInstance: any = null;

export const ensureAppKit = () => {
  if (!isAppKitConfigured) {
    return null;
  }

  if (appKitInstance) {
    return appKitInstance;
  }

  // Delay wallet native imports until the user actually opens wallet connect.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@walletconnect/react-native-compat");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EthersAdapter } = require("@reown/appkit-ethers-react-native");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createAppKit } = require("@reown/appkit-react-native");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { baseSepolia, mainnet } = require("viem/chains");

  appKitInstance = createAppKit({
    projectId,
    metadata: {
      name: "Ananymous",
      description: "Anonymous wallet-gated social discussion.",
      url: "https://annanymous.onrender.com",
      icons: ["https://annanymous.onrender.com"],
      redirect: {
        native: "ananymous://",
        universal: "https://annanymous.onrender.com",
      },
    },
    adapters: [new EthersAdapter()],
    networks: [mainnet, baseSepolia],
    defaultNetwork: baseSepolia,
    storage,
    debug: __DEV__,
    enableAnalytics: false,
    features: {
      socials: false,
      onramp: false,
      swaps: false,
      showWallets: true,
    },
    themeMode: "dark",
    themeVariables: {
      accent: "#B5B6BE",
    },
  });

  return appKitInstance;
};

export const getAppKit = () => appKitInstance;

export const getAppKitReactComponents = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppKit, AppKitProvider } = require("@reown/appkit-react-native");
  return { AppKit, AppKitProvider };
};

export const resetAppKit = () => {
  appKitInstance = null;
};
