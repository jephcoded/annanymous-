import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import BarChart from "react-native-bootstrap-icons/icons/bar-chart";
import BarChartFill from "react-native-bootstrap-icons/icons/bar-chart-fill";
import ChatDots from "react-native-bootstrap-icons/icons/chat-dots";
import ChatDotsFill from "react-native-bootstrap-icons/icons/chat-dots-fill";
import House from "react-native-bootstrap-icons/icons/house";
import HouseFill from "react-native-bootstrap-icons/icons/house-fill";
import PencilFill from "react-native-bootstrap-icons/icons/pencil-fill";
import PencilSquare from "react-native-bootstrap-icons/icons/pencil-square";
import WalletFill from "react-native-bootstrap-icons/icons/wallet-fill";
import Wallet2 from "react-native-bootstrap-icons/icons/wallet2";

import CommentsScreen from "./screens/CommentsScreen";
import CreatePostScreen from "./screens/CreatePostScreen";
import HomeScreen from "./screens/HomeScreen";
import { useWallet } from "./contexts/WalletContext";
import PollScreen from "./screens/PollScreen";
import WalletScreen from "./screens/WalletScreen";
import { COLORS, TYPOGRAPHY } from "./theme";

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: { focused: HouseFill, default: House },
  Post: { focused: PencilFill, default: PencilSquare },
  Polls: { focused: BarChartFill, default: BarChart },
  Comments: { focused: ChatDotsFill, default: ChatDots },
  Wallet: { focused: WalletFill, default: Wallet2 },
} as const;

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "transparent",
  },
};

const AppNavigator = () => {
  const { isConnected } = useWallet();

  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={[COLORS.background, "#05050B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={styles.shellGlow} />
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarHideOnKeyboard: true,
            sceneContainerStyle: {
              backgroundColor: "transparent",
            },
            tabBarStyle: {
              backgroundColor: "transparent",
              borderTopColor: "transparent",
              height: 84,
              borderRadius: 34,
              paddingHorizontal: 14,
              paddingTop: 10,
              paddingBottom: 12,
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 28,
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 14 },
              elevation: 16,
              borderWidth: 1,
              borderColor: "rgba(142,164,255,0.12)",
            },
            tabBarBackground: () => (
              <LinearGradient
                colors={["rgba(16,24,38,0.95)", "rgba(8,12,22,0.98)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 34 }]}
              />
            ),
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.gray,
            tabBarShowLabel: true,
            tabBarLabelStyle: {
              ...TYPOGRAPHY.tab,
              marginTop: -4,
            },
            tabBarItemStyle: {
              borderRadius: 24,
            },
            tabBarIcon: ({ color, focused }) => {
              const iconSet = ICONS[route.name as keyof typeof ICONS];
              const IconComponent = focused ? iconSet.focused : iconSet.default;
              return (
                <View
                  style={{
                    backgroundColor: focused
                      ? COLORS.primary + "24"
                      : "transparent",
                    borderRadius: 18,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderWidth: focused ? 1 : 0,
                    borderColor: focused ? "rgba(255,255,255,0.08)" : "transparent",
                  }}
                >
                  <IconComponent width={24} height={24} fill={color} />
                </View>
              );
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen
            name="Post"
            component={CreatePostScreen}
            listeners={({ navigation }) => ({
              tabPress: (event) => {
                if (!isConnected) {
                  event.preventDefault();
                  navigation.navigate("Wallet");
                }
              },
            })}
          />
          <Tab.Screen name="Polls" component={PollScreen} />
          <Tab.Screen name="Comments" component={CommentsScreen} />
          <Tab.Screen name="Wallet" component={WalletScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: { flex: 1 },
  shellGlow: {
    position: "absolute",
    top: 60,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: COLORS.primary + "14",
  },
});

export default AppNavigator;
