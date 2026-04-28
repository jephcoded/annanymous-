import "node-libs-react-native/globals";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { LogBox, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AccountReadyScreen from "./components/AccountReadyScreen";
import AppLoadingScreen from "./components/AppLoadingScreen";
import AdminDashboard from "./src/admin/AdminDashboard";
import AppErrorBoundary from "./src/components/AppErrorBoundary";
import {
    ensureAppKit,
    getAppKit,
    getAppKitReactComponents,
    isAppKitConfigured,
} from "./src/config/appKit";
import {
    BrowserWalletProvider,
    useWallet,
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

const ONBOARDING_KEY = "ananymous.onboarding.complete";
const POST_SIGNUP_WELCOME_KEY = "ananymous.auth.just-signed-up";

const isAdminWebRoute =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  window.location.pathname.startsWith("/admin");

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AppChrome({ children, walletUiVisible = false }) {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        {children}
        {walletUiVisible && !isExpoGoPreview && isAppKitConfigured
          ? (() => {
              const appKit = getAppKit();
              if (!appKit) {
                return null;
              }

              const { AppKit, AppKitProvider } = getAppKitReactComponents();

              return (
                <AppKitProvider instance={appKit}>
                  <View
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <AppKit />
                  </View>
                </AppKitProvider>
              );
            })()
          : null}
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

function MobileAppContent() {
  const { isAuthenticating, isConnected, isSessionReady } = useWallet();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAccountReady, setShowAccountReady] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(!done);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const resolvePostSignupState = async () => {
      if (!isSessionReady || !isConnected) {
        if (isMounted) {
          setShowAccountReady(null);
        }
        return;
      }

      const flag = await AsyncStorage.getItem(POST_SIGNUP_WELCOME_KEY);
      if (isMounted) {
        setShowAccountReady(flag === "true");
      }
    };

    void resolvePostSignupState();

    return () => {
      isMounted = false;
    };
  }, [isConnected, isSessionReady]);

  if (loading) {
    return <AppLoadingScreen subtitle="Checking your first-run setup..." />;
  }

  if (!isSessionReady) {
    return (
      <AppLoadingScreen
        subtitle="Restoring your session..."
        statusText="Checking saved account"
      />
    );
  }

  if (isAuthenticating && !isConnected) {
    return (
      <AppLoadingScreen
        subtitle="Initializing your account..."
        statusText="Creating secure session"
      />
    );
  }

  if (isConnected && showAccountReady === null) {
    return (
      <AppLoadingScreen
        subtitle="Preparing your account..."
        statusText="Loading welcome step"
      />
    );
  }

  if (showAccountReady) {
    return (
      <AccountReadyScreen
        onContinue={async () => {
          await AsyncStorage.removeItem(POST_SIGNUP_WELCOME_KEY);
          setShowAccountReady(false);
        }}
      />
    );
  }

  if (!isConnected) {
    const ConnectWalletScreen =
      require("./src/screens/auth/ConnectWalletScreen").default;
    return <ConnectWalletScreen />;
  }

  if (showOnboarding) {
    const Onboarding = require("./components/Onboarding").default;
    return <Onboarding onFinish={() => setShowOnboarding(false)} />;
  }

  const AppNavigator = require("./src/AppNavigator").default;
  return <AppNavigator />;
}

function AppShell({ walletUiVisible = false, adminMode = false }) {
  return (
    <AppChrome walletUiVisible={walletUiVisible}>
      {adminMode ? <AdminDashboard /> : <MobileAppContent />}
    </AppChrome>
  );
}

export default function App() {
  const [walletUiVisible, setWalletUiVisible] = useState(false);

  const prepareWalletUi = async () => {
    ensureAppKit();
    setWalletUiVisible(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
  };

  const content = (
    <AppShell walletUiVisible={walletUiVisible} adminMode={isAdminWebRoute} />
  );

  if (isAdminWebRoute) {
    return <BrowserWalletProvider>{content}</BrowserWalletProvider>;
  }

  return (
    <WalletProvider onBeforeConnect={prepareWalletUi}>{content}</WalletProvider>
  );
}
