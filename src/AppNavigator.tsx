import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import ChatDots from "react-native-bootstrap-icons/icons/chat-dots";
import ChatDotsFill from "react-native-bootstrap-icons/icons/chat-dots-fill";
import House from "react-native-bootstrap-icons/icons/house";
import HouseFill from "react-native-bootstrap-icons/icons/house-fill";
import PencilFill from "react-native-bootstrap-icons/icons/pencil-fill";
import PencilSquare from "react-native-bootstrap-icons/icons/pencil-square";

import { useWallet } from "./contexts/WalletContext";
import CommentsScreen from "./screens/CommentsScreen";
import CommunitiesScreen from "./screens/communities/CommunitiesScreen";
import CommunityChatScreen from "./screens/communities/CommunityChatScreen";
import CreateCommunityScreen from "./screens/communities/CreateCommunityScreen";
import CreatePostScreen from "./screens/CreatePostScreen";
import DiscoverScreen from "./screens/DiscoverScreen";
import HomeScreen from "./screens/HomeScreen";
import PollScreen from "./screens/PollScreen";
import WalletScreen from "./screens/WalletScreen";
import { COLORS, TYPOGRAPHY } from "./theme";

const Tab = createBottomTabNavigator();
const CommunityStack = createStackNavigator();
const HomeStack = createStackNavigator();
const PostStack = createStackNavigator();

function CommunityStackScreen() {
  return (
    <CommunityStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.text,
        headerTitleStyle: TYPOGRAPHY.section,
        cardStyle: { backgroundColor: "transparent" },
      }}
    >
      <CommunityStack.Screen name="CommunitiesMain" component={CommunitiesScreen} />
      <CommunityStack.Screen
        name="CreateCommunity"
        component={CreateCommunityScreen}
        options={{ title: "Create Community" }}
      />
      <CommunityStack.Screen
        name="CommunityChat"
        component={CommunityChatScreen}
        options={{ title: "Community Chat" }}
      />
    </CommunityStack.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Discover" component={DiscoverScreen} />
    </HomeStack.Navigator>
  );
}

function PostStackScreen() {
  return (
    <PostStack.Navigator
      initialRouteName="Composer"
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.text,
        headerTitleStyle: TYPOGRAPHY.section,
        cardStyle: { backgroundColor: "transparent" },
      }}
    >
      <PostStack.Screen
        name="Composer"
        component={CreatePostScreen}
        options={{ headerShown: false }}
      />
      <PostStack.Screen name="Comments" component={CommentsScreen} />
      <PostStack.Screen name="Polls" component={PollScreen} />
    </PostStack.Navigator>
  );
}

const ICONS = {
  Home: { focused: HouseFill, default: House },
  Post: { focused: PencilFill, default: PencilSquare },
  Communities: { focused: ChatDotsFill, default: ChatDots },
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
        colors={["#151515", COLORS.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={styles.shellGlowPrimary} />
      <View pointerEvents="none" style={styles.shellGlowSecondary} />
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
              borderColor: "rgba(255,255,255,0.08)",
            },
            tabBarBackground: () => (
              <LinearGradient
                colors={["rgba(24,24,27,0.98)", "rgba(7,7,8,0.98)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 34 }]}
              />
            ),
            tabBarActiveTintColor: COLORS.text,
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
              const isWalletRoute = route.name === "Wallet";
              const iconSet = !isWalletRoute
                ? ICONS[route.name as keyof typeof ICONS]
                : null;
              const IconComponent = iconSet
                ? focused
                  ? iconSet.focused
                  : iconSet.default
                : null;

              return (
                <View
                  style={{
                    backgroundColor: focused
                      ? "rgba(255,255,255,0.10)"
                      : "transparent",
                    borderRadius: 18,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderWidth: focused ? 1 : 0,
                    borderColor: focused
                      ? "rgba(255,255,255,0.10)"
                      : "transparent",
                  }}
                >
                  {isWalletRoute ? (
                    <Ionicons
                      name={focused ? "shield" : "shield-outline"}
                      size={24}
                      color={color}
                    />
                  ) : (
                    IconComponent && (
                      <IconComponent width={24} height={24} fill={color} />
                    )
                  )}
                </View>
              );
            },
          })}
        >
          <Tab.Screen
            name="Home"
            component={HomeStackScreen}
            options={{ title: "Home" }}
          />
          <Tab.Screen
            name="Post"
            component={PostStackScreen}
            options={{ title: "Post" }}
            listeners={({ navigation }) => ({
              tabPress: (event) => {
                if (!isConnected) {
                  event.preventDefault();
                  navigation.navigate("Wallet");
                }
              },
            })}
          />
          <Tab.Screen
            name="Communities"
            component={CommunityStackScreen}
            options={{ title: "Community" }}
          />
          <Tab.Screen name="Wallet" component={WalletScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: { flex: 1 },
  shellGlowPrimary: {
    position: "absolute",
    top: 70,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  shellGlowSecondary: {
    position: "absolute",
    bottom: 120,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(120,120,128,0.08)",
  },
});

export default AppNavigator;
