import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
    DefaultTheme,
    NavigationContainer,
    NavigatorScreenParams,
    type LinkingOptions,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import * as ExpoLinking from "expo-linking";
import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import ChatDots from "react-native-bootstrap-icons/icons/chat-dots";
import ChatDotsFill from "react-native-bootstrap-icons/icons/chat-dots-fill";
import House from "react-native-bootstrap-icons/icons/house";
import HouseFill from "react-native-bootstrap-icons/icons/house-fill";
import PencilFill from "react-native-bootstrap-icons/icons/pencil-fill";
import PencilSquare from "react-native-bootstrap-icons/icons/pencil-square";
import ShieldLock from "react-native-bootstrap-icons/icons/shield-lock";
import ShieldLockFill from "react-native-bootstrap-icons/icons/shield-lock-fill";

import { useWallet } from "./contexts/WalletContext";
import { COLORS, getAppAppearance, TYPOGRAPHY } from "./theme";

type HomeStackParamList = {
  HomeMain: undefined;
};

type PostStackParamList = {
  Composer: undefined;
  Polls: undefined;
};

type CommunityStackParamList = {
  CommunitiesMain: undefined;
  CreateCommunity: undefined;
  CommunityChat:
    | {
        communityId?: number;
        communityName?: string;
      }
    | undefined;
};

type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Post: NavigatorScreenParams<PostStackParamList>;
  Communities: NavigatorScreenParams<CommunityStackParamList>;
  Wallet: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const CommunityStack = createStackNavigator<CommunityStackParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const PostStack = createStackNavigator<PostStackParamList>();

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
      <CommunityStack.Screen
        name="CommunitiesMain"
        getComponent={() =>
          require("./screens/communities/CommunitiesScreen").default
        }
        options={{ headerShown: false }}
      />
      <CommunityStack.Screen
        name="CreateCommunity"
        getComponent={() =>
          require("./screens/communities/CreateCommunityScreen").default
        }
        options={{ title: "Create Community" }}
      />
      <CommunityStack.Screen
        name="CommunityChat"
        getComponent={() =>
          require("./screens/communities/CommunityChatScreen").default
        }
        options={{ title: "Community Chat" }}
      />
    </CommunityStack.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen
        name="HomeMain"
        getComponent={() => require("./screens/HomeScreen").default}
      />
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
        getComponent={() => require("./screens/CreatePostScreen").default}
        options={{ headerShown: false }}
      />
      <PostStack.Screen
        name="Polls"
        getComponent={() => require("./screens/PollScreen").default}
      />
    </PostStack.Navigator>
  );
}

const ICONS = {
  Home: { focused: HouseFill, default: House },
  Post: { focused: PencilFill, default: PencilSquare },
  Communities: { focused: ChatDotsFill, default: ChatDots },
} as const;

const linking: LinkingOptions<RootTabParamList> = {
  prefixes: [ExpoLinking.createURL("/"), "ananymous://"],
  config: {
    screens: {
      Home: {
        screens: {
          HomeMain: "home",
        },
      },
      Post: {
        screens: {
          Composer: "post",
          Polls: "post/polls",
        },
      },
      Communities: {
        screens: {
          CommunitiesMain: "communities",
          CreateCommunity: "communities/create",
          CommunityChat: {
            path: "communities/chat/:communityId?/:communityName?",
            parse: {
              communityId: (value: string) => Number(value),
            },
          },
        },
      },
      Wallet: "wallet",
    },
  },
};

const AppNavigator = () => {
  const { settings } = useWallet();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const appearance = getAppAppearance(settings?.theme);
  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: "transparent",
      },
    }),
    [],
  );

  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={appearance.shellGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        pointerEvents="none"
        style={[
          styles.shellGlowPrimary,
          { backgroundColor: appearance.shellGlowPrimary },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.shellGlowSecondary,
          { backgroundColor: appearance.shellGlowSecondary },
        ]}
      />
      <NavigationContainer linking={linking} theme={navTheme}>
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
              height: isCompact ? 74 : 78,
              borderRadius: isCompact ? 24 : 28,
              paddingHorizontal: isCompact ? 8 : 10,
              paddingTop: isCompact ? 7 : 8,
              paddingBottom: isCompact ? 9 : 10,
              position: "absolute",
              left: isCompact ? 14 : 18,
              right: isCompact ? 14 : 18,
              bottom: isCompact ? 16 : 20,
              shadowColor: "#000",
              shadowOpacity: 0.28,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            },
            tabBarBackground: () => (
              <LinearGradient
                colors={appearance.navGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  StyleSheet.absoluteFillObject,
                  { borderRadius: isCompact ? 24 : 28 },
                ]}
              />
            ),
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: "#8F76C8",
            tabBarShowLabel: true,
            tabBarLabelStyle: {
              ...TYPOGRAPHY.tab,
              marginTop: isCompact ? -1 : -2,
              fontSize: isCompact ? 10 : TYPOGRAPHY.tab.fontSize,
            },
            tabBarItemStyle: {
              borderRadius: 22,
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
                      ? appearance.tabActiveBackground
                      : "transparent",
                    borderRadius: 18,
                    paddingVertical: isCompact ? 6 : 7,
                    paddingHorizontal: isCompact ? 10 : 11,
                    borderWidth: focused ? 1 : 0,
                    borderColor: focused
                      ? appearance.tabActiveBorder
                      : "transparent",
                  }}
                >
                  {isWalletRoute ? (
                    focused ? (
                      <ShieldLockFill
                        width={isCompact ? 22 : 24}
                        height={isCompact ? 22 : 24}
                        fill={color}
                      />
                    ) : (
                      <ShieldLock
                        width={isCompact ? 22 : 24}
                        height={isCompact ? 22 : 24}
                        fill={color}
                      />
                    )
                  ) : (
                    IconComponent && (
                      <IconComponent
                        width={isCompact ? 22 : 24}
                        height={isCompact ? 22 : 24}
                        fill={color}
                      />
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
            options={{ title: "Feed" }}
          />
          <Tab.Screen
            name="Post"
            component={PostStackScreen}
            options={{ title: "Post" }}
          />
          <Tab.Screen
            name="Communities"
            component={CommunityStackScreen}
            options={{ title: "Community" }}
          />
          <Tab.Screen
            name="Wallet"
            getComponent={() => require("./screens/WalletScreen").default}
            options={{ title: "Profile" }}
          />
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
  },
  shellGlowSecondary: {
    position: "absolute",
    bottom: 120,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
});

export default AppNavigator;
