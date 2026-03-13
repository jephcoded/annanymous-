import "node-libs-react-native/globals";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { MetaMaskProvider } from "@metamask/sdk-react-native";
import Constants from "expo-constants";
import { useEffect } from "react";
import { AppState, LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/AppNavigator";
import {
  PreviewWalletProvider,
  WalletProvider,
} from "./src/contexts/WalletContext";

LogBox.ignoreLogs([
  "Possible Unhandled Promise Rejection",
  "Message ignored because invalid key exchange status",
  "MetaMask: 'ethereum._metamask' exposes",
  "`new NativeEventEmitter()` was called with a non-null",
]);

let canOpenLink = true;
const isExpoGoPreview =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient";

function AppShell() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      canOpenLink = nextState === "active";
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      {isExpoGoPreview ? (
        <PreviewWalletProvider>
          <AppNavigator />
        </PreviewWalletProvider>
      ) : (
        <WalletProvider>
          <AppNavigator />
        </WalletProvider>
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  if (isExpoGoPreview) {
    return <AppShell />;
  }

  return (
    <MetaMaskProvider
      sdkOptions={{
        dappMetadata: {
          name: "Ananymous",
          url: "https://annanymous.onrender.com",
          iconUrl: "https://annanymous.onrender.com",
          scheme: "ananymous",
        },
        infuraAPIKey: process.env.EXPO_PUBLIC_INFURA_API_KEY,
      }}
    >
      <AppShell />
    </MetaMaskProvider>
  );
}
