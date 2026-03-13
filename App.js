import "node-libs-react-native/globals";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { MetaMaskProvider } from "@metamask/sdk-react-native";
import Constants from "expo-constants";
import { useEffect } from "react";
import { AppState, Linking, LogBox } from "react-native";
import BackgroundTimer from "react-native-background-timer";
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
        checkInstallationImmediately: false,
        useDeeplink: true,
        timer: BackgroundTimer,
        openDeeplink: (link) => {
          if (canOpenLink) {
            Linking.openURL(link);
          }
        },
        storage: {
          enabled: true,
        },
        dappMetadata: {
          name: "Ananymous",
          url: "https://ananymous.app",
          iconUrl: "https://ananymous.app/icon.png",
          scheme: "ananymous",
        },
        logging: {
          developerMode: false,
        },
      }}
    >
      <AppShell />
    </MetaMaskProvider>
  );
}
