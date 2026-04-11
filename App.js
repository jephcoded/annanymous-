import "node-libs-react-native/globals";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import Constants from "expo-constants";
import { LogBox, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/AppNavigator";
import {
  ensureAppKit,
  getAppKit,
  getAppKitReactComponents,
  isAppKitConfigured,
} from "./src/config/appKit";
import {
    PreviewWalletProvider,
    WalletConfigFallbackProvider,
    WalletProvider,
} from "./src/contexts/WalletContext";

LogBox.ignoreLogs([
  "Possible Unhandled Promise Rejection",
  "Message ignored because invalid key exchange status",
  "MetaMask: 'ethereum._metamask' exposes",
  "`new NativeEventEmitter()` was called with a non-null",
]);

const isExpoGoPreview =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import Onboarding from "./components/Onboarding";

const ONBOARDING_KEY = "ananymous.onboarding.complete";

function AppShell({ walletUiVisible = false }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(!done);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  if (showOnboarding) {
    return <Onboarding onFinish={() => setShowOnboarding(false)} />;
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
      {walletUiVisible && !isExpoGoPreview && isAppKitConfigured ? (
        (() => {
          const appKit = getAppKit();
          if (!appKit) {
            return null;
          }

          const { AppKit, AppKitProvider } = getAppKitReactComponents();

          return (
            <AppKitProvider instance={appKit}>
              <View style={{ position: "absolute", width: "100%", height: "100%" }}>
                <AppKit />
              </View>
            </AppKitProvider>
          );
        })()
      ) : null}
    </SafeAreaProvider>
  );
}

export default function App() {
  const [walletUiVisible, setWalletUiVisible] = useState(false);

  const prepareWalletUi = async () => {
    ensureAppKit();
    setWalletUiVisible(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
  };

  if (isExpoGoPreview) {
    return (
      <PreviewWalletProvider>
        <AppShell walletUiVisible={false} />
      </PreviewWalletProvider>
    );
  }

  if (!isAppKitConfigured) {
    return (
      <WalletConfigFallbackProvider>
        <AppShell walletUiVisible={false} />
      </WalletConfigFallbackProvider>
    );
  }

  return (
    <WalletProvider onBeforeConnect={prepareWalletUi}>
      <AppShell walletUiVisible={walletUiVisible} />
    </WalletProvider>
  );
}
