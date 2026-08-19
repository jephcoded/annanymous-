import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";

import ScreenSurface from "../components/ScreenSurface";
import { useWallet } from "../contexts/WalletContext";
import {
    FeedPost,
    NotificationItem,
    SessionAccess,
    WalletProfile,
    deletePost,
    getFeed,
    getMe,
    getNotifications,
    getPost,
    markAllNotificationsRead,
    markNotificationRead,
    updateProfile,
} from "../services/api";
import { COLORS, TYPOGRAPHY } from "../theme";
import { loadSavedPostIds, persistSavedPostIds } from "../utils/savedPosts";
import { getFriendlyErrorMessage } from "../utils/errorMessages";

const ONBOARDING_KEY = "ananymous.onboarding.complete";
const PROFILE_ACCENT_KEY = "ananymous.profile.accent";
const PROFILE_ACCENT_OPTIONS = [
  "#7D3CFF",
  "#4F7DFF",
  "#49D97F",
  "#E95AAE",
  "#FF9B2D",
] as const;

type ProfileTab =
  | "overview"
  | "alerts"
  | "settings"
  | "privacy"
  | "edit"
  | "appearance"
  | "content"
  | "support"
  | "myPosts"
  | "saved";

const SUPPORT_EMAIL = "support@ananymous.app";
const THEME_OPTIONS = [
  {
    id: "dark",
    title: "Dark",
    description: "Balanced black surfaces with a soft edge glow.",
  },
  {
    id: "midnight",
    title: "Midnight Black",
    description: "Deeper black surfaces with lower contrast chrome.",
  },
  {
    id: "obsidian",
    title: "Obsidian",
    description: "Pure black panels with the strongest focus on text.",
  },
] as const;

const formatDate = (timestamp: string) => new Date(timestamp).toLocaleString();

const buildMailtoUrl = (recipient: string, subject: string, body: string) =>
  `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const parseKeywordList = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

const shortenIdentity = (value?: string | null) => {
  if (!value) {
    return "ANON user";
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-4)}`;
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  const red = Number.parseInt(safeHex.slice(0, 2), 16);
  const green = Number.parseInt(safeHex.slice(2, 4), 16);
  const blue = Number.parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const WalletScreen = () => {
  const { address, token, disconnectWallet, settings, updateAppSettings } =
    useWallet();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [access, setAccess] = useState<SessionAccess | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [notificationSearchQuery, setNotificationSearchQuery] = useState("");
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [profileAccent, setProfileAccent] = useState<string>(
    PROFILE_ACCENT_OPTIONS[0],
  );
  const [mutedKeywordDraft, setMutedKeywordDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [privacyPrefs, setPrivacyPrefs] = useState({
    hideOnlineStatus: true,
    allowComments: true,
    allowDirectMessages: false,
    showPostsInFeed: true,
    safeMode: true,
  });
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [myPostsDeletingId, setMyPostsDeletingId] = useState<number | null>(
    null,
  );
  const [savedPosts, setSavedPosts] = useState<FeedPost[]>([]);
  const [savedPostsLoading, setSavedPostsLoading] = useState(false);

  const isCompact = width < 390;
  const isSubpage = activeTab !== "overview";

  const profileName = useMemo(() => {
    if (profile?.displayName?.trim()) {
      return profile.displayName.trim();
    }

    if (profile?.email?.trim()) {
      return profile.email.trim().split("@")[0];
    }

    return shortenIdentity(address);
  }, [address, profile?.displayName, profile?.email]);

  const profileHandle = useMemo(
    () => shortenIdentity(profile?.email || profile?.walletAddress || address),
    [address, profile?.email, profile?.walletAddress],
  );

  const profileBio = useMemo(
    () => profile?.bio?.trim() || "Sharing thoughts, not identity.",
    [profile?.bio],
  );

  const filteredNotifications = useMemo(() => {
    const query = notificationSearchQuery.trim().toLowerCase();
    if (!query) {
      return notifications;
    }

    return notifications.filter((item: NotificationItem) =>
      [item.title, item.body, item.type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [notificationSearchQuery, notifications]);

  const recentActivity = useMemo(
    () =>
      notifications.slice(0, 3).map((item: NotificationItem) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        time: formatDate(item.createdAt),
      })),
    [notifications],
  );

  const headerMeta = useMemo(
    () =>
      ({
        overview: { title: "Profile", subtitle: "Your anonymous identity" },
        alerts: {
          title: "Alerts",
          subtitle: "Posts, replies, rooms, signals.",
        },
        settings: {
          title: "Settings",
          subtitle: "Control the app from one place.",
        },
        privacy: {
          title: "Privacy & Safety",
          subtitle: "Identity, comments, visibility.",
        },
        edit: {
          title: "Edit Profile",
          subtitle: "Anonymous is your identity.",
        },
        appearance: {
          title: "Appearance",
          subtitle: "Choose how dark the app feels.",
        },
        content: {
          title: "Content Preferences",
          subtitle: "Filter what reaches your feed.",
        },
        support: {
          title: "Support",
          subtitle: "Get help or send a report quickly.",
        },
        myPosts: {
          title: "My Posts",
          subtitle: "Everything you've shared, in one place.",
        },
        saved: {
          title: "Saved",
          subtitle: "Posts you've bookmarked to revisit.",
        },
      })[activeTab],
    [activeTab],
  );

  const mutedKeywords = useMemo(
    () => parseKeywordList(mutedKeywordDraft),
    [mutedKeywordDraft],
  );

  const activeThemeOption = useMemo(
    () =>
      THEME_OPTIONS.find((option) => option.id === settings?.theme) ||
      THEME_OPTIONS[0],
    [settings?.theme],
  );

  const profileAccentSurface = useMemo(
    () => hexToRgba(profileAccent, 0.22),
    [profileAccent],
  );

  const profileAccentBorder = useMemo(
    () => hexToRgba(profileAccent, 0.46),
    [profileAccent],
  );

  const loadWallet = useCallback(async () => {
    if (!token) {
      return;
    }

    setRefreshing(true);
    try {
      const [meResponse, notificationsResponse] = await Promise.all([
        getMe(token),
        getNotifications(token),
      ]);
      setProfile(meResponse.data.profile);
      setAccess(meResponse.data.access);
      setNotifications(notificationsResponse.data);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(
        getFriendlyErrorMessage(
          error,
          "Unable to load your account right now.",
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadWallet();
    }, [loadWallet]),
  );

  const loadMyPosts = useCallback(async () => {
    if (!token) {
      return;
    }

    setMyPostsLoading(true);
    try {
      const response = await getFeed({ mine: true, limit: 50, token });
      setMyPosts(response.data);
    } catch (error) {
      setStatusMessage(
        getFriendlyErrorMessage(error, "Unable to load your posts."),
      );
    } finally {
      setMyPostsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "myPosts") {
      void loadMyPosts();
    }
  }, [activeTab, loadMyPosts]);

  const loadSavedPosts = useCallback(async () => {
    setSavedPostsLoading(true);
    try {
      const ids = await loadSavedPostIds();
      const results = await Promise.all(
        ids.map((id) =>
          getPost(id, token || undefined).then(
            (response) => response.data,
            () => null,
          ),
        ),
      );
      const valid = results.filter((post): post is FeedPost => post !== null);
      setSavedPosts(valid);

      if (valid.length !== ids.length) {
        await persistSavedPostIds(valid.map((post) => post.id));
      }
    } catch (error) {
      setStatusMessage(
        getFriendlyErrorMessage(error, "Unable to load saved posts."),
      );
    } finally {
      setSavedPostsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "saved") {
      void loadSavedPosts();
    }
  }, [activeTab, loadSavedPosts]);

  const handleUnsavePost = useCallback(async (post: FeedPost) => {
    setSavedPosts((current) => {
      const next = current.filter((item) => item.id !== post.id);
      void persistSavedPostIds(next.map((item) => item.id));
      return next;
    });
  }, []);

  const handleDeleteMyPost = useCallback(
    (post: FeedPost) => {
      if (!token) {
        return;
      }

      Alert.alert(
        "Delete post",
        "This will remove your post from the feed. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setMyPostsDeletingId(post.id);
              try {
                await deletePost(token, post.id);
                setMyPosts((current) =>
                  current.filter((item) => item.id !== post.id),
                );
              } catch (error) {
                setStatusMessage(
                  getFriendlyErrorMessage(error, "Unable to delete post."),
                );
              } finally {
                setMyPostsDeletingId(null);
              }
            },
          },
        ],
      );
    },
    [token],
  );

  useEffect(() => {
    if (profile) {
      setEditName(profile.displayName || "");
      setEditBio(profile.bio || "");
    }
  }, [profile]);

  useEffect(() => {
    let isMounted = true;

    const loadAccent = async () => {
      try {
        const storedAccent = await AsyncStorage.getItem(PROFILE_ACCENT_KEY);
        if (
          isMounted &&
          storedAccent &&
          PROFILE_ACCENT_OPTIONS.includes(
            storedAccent as (typeof PROFILE_ACCENT_OPTIONS)[number],
          )
        ) {
          setProfileAccent(storedAccent);
        }
      } catch {
        // Ignore local accent persistence errors.
      }
    };

    void loadAccent();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (settings) {
      setPrivacyPrefs({
        hideOnlineStatus: !settings.emailEnabled,
        allowComments: settings.pushEnabled,
        allowDirectMessages: settings.directMessagesEnabled ?? false,
        showPostsInFeed: settings.showWalletSummary,
        safeMode: !settings.marketingEnabled,
      });
      setMutedKeywordDraft((settings.mutedKeywords || []).join(", "));
    }
  }, [settings]);

  const saveSettings = useCallback(
    async (nextSettings: Partial<typeof settings>) => {
      if (!token) {
        return false;
      }

      try {
        await updateAppSettings(nextSettings);
        return true;
      } catch (error) {
        setStatusMessage(
          getFriendlyErrorMessage(error, "Unable to save settings."),
        );
        await loadWallet();
        return false;
      }
    },
    [loadWallet, token, updateAppSettings],
  );

  const updatePrivacyPref = useCallback(
    async (key: keyof typeof privacyPrefs, value: boolean) => {
      setPrivacyPrefs((current) => ({ ...current, [key]: value }));

      if (key === "hideOnlineStatus") {
        await saveSettings({ emailEnabled: !value });
      }

      if (key === "allowComments") {
        await saveSettings({ pushEnabled: value });
      }

      if (key === "showPostsInFeed") {
        await saveSettings({ showWalletSummary: value });
      }

      if (key === "safeMode") {
        await saveSettings({ marketingEnabled: !value });
      }

      if (key === "allowDirectMessages") {
        await saveSettings({ directMessagesEnabled: value });
      }
    },
    [saveSettings],
  );

  const saveMutedKeywords = useCallback(
    async (draft = mutedKeywordDraft) => {
      const nextKeywords = parseKeywordList(draft);
      const didSave = await saveSettings({ mutedKeywords: nextKeywords });
      if (!didSave) {
        return;
      }

      setMutedKeywordDraft(nextKeywords.join(", "));
      setStatusMessage(
        nextKeywords.length
          ? "Muted keywords updated."
          : "Muted keywords cleared.",
      );
    },
    [mutedKeywordDraft, saveSettings],
  );

  const saveThemePreference = useCallback(
    async (theme: typeof settings.theme) => {
      const didSave = await saveSettings({ theme });
      if (!didSave) {
        return;
      }

      const nextTheme =
        THEME_OPTIONS.find((option) => option.id === theme)?.title || "Dark";
      setStatusMessage(`${nextTheme} appearance saved.`);
    },
    [saveSettings],
  );

  const openSupportComposer = useCallback(
    async (mode: "help" | "report") => {
      const subject =
        mode === "report" ? "Ananymous bug report" : "Ananymous help request";
      const body = [
        `Display name: ${profileName}`,
        profile?.id ? `Account ID: ${profile.id}` : null,
        `Theme: ${activeThemeOption.title}`,
        "",
        mode === "report" ? "What went wrong?" : "How can we help you?",
        "",
      ]
        .filter(Boolean)
        .join("\n");

      const url = buildMailtoUrl(SUPPORT_EMAIL, subject, body);

      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          setStatusMessage(
            mode === "report"
              ? "Opening your bug report email draft."
              : "Opening your help email draft.",
          );
          return;
        }
      } catch {
        // Fall through to the share sheet.
      }

      try {
        await Share.share({
          message: `Send this to ${SUPPORT_EMAIL}\n\nSubject: ${subject}\n\n${body}`,
        });
        setStatusMessage("Share sheet opened with your support details.");
      } catch {
        setStatusMessage("No mail app was found on this device.");
      }
    },
    [activeThemeOption.title, profile?.id, profileName],
  );

  const shareFeedback = useCallback(async () => {
    try {
      await Share.share({
        message: [
          "Feedback for ANANYMOUS",
          "",
          "What feels great?",
          "What should change?",
          "",
          `Send your notes to ${SUPPORT_EMAIL} if you want a direct reply.`,
        ].join("\n"),
      });
      setStatusMessage("Feedback sheet opened.");
    } catch {
      setStatusMessage("Unable to open the feedback sheet right now.");
    }
  }, []);

  const markSingleRead = useCallback(
    async (notificationId: number) => {
      if (!token) {
        return;
      }

      try {
        const response = await markNotificationRead(token, notificationId);
        setNotifications((current: NotificationItem[]) =>
          current.map((item: NotificationItem) =>
            item.id === notificationId ? response.data : item,
          ),
        );
      } catch (error) {
        setStatusMessage(
          getFriendlyErrorMessage(error, "Unable to update this alert."),
        );
      }
    },
    [token],
  );

  const markEverythingRead = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      await markAllNotificationsRead(token);
      setNotifications((current: NotificationItem[]) =>
        current.map((item: NotificationItem) => ({ ...item, isRead: true })),
      );
    } catch (error) {
      setStatusMessage(
        getFriendlyErrorMessage(error, "Unable to update alerts."),
      );
    }
  }, [token]);

  const saveProfileDraft = async () => {
    if (!token) {
      setStatusMessage("Your session expired. Log in again to continue.");
      return;
    }

    setSavingProfile(true);
    try {
      const response = await updateProfile(token, {
        displayName: editName.trim(),
        bio: editBio.trim(),
      });
      await AsyncStorage.setItem(PROFILE_ACCENT_KEY, profileAccent);
      setProfile(response.data);
      setStatusMessage("Profile updated.");
      setActiveTab("overview");
    } catch (error) {
      setStatusMessage(
        getFriendlyErrorMessage(error, "Unable to save your profile."),
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const resetOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setStatusMessage("Onboarding will appear the next time the app starts.");
  };

  if (!profile && refreshing) {
    return (
      <ScreenSurface style={styles.loadingSurface}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </ScreenSurface>
    );
  }

  return (
    <ScreenSurface
      style={[styles.surface, isCompact && styles.surfaceCompact]}
      bleedTop
    >
      <ScrollView
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadWallet} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.headerCard, isCompact && styles.headerCardCompact]}
        >
          <View
            style={[
              styles.headerTopRow,
              isCompact && styles.headerTopRowCompact,
            ]}
          >
            <View style={styles.headerLead}>
              {isSubpage ? (
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => setActiveTab("overview")}
                >
                  <Ionicons name="chevron-back" size={18} color={COLORS.text} />
                </TouchableOpacity>
              ) : null}
              <View>
                <Text style={styles.headerTitle}>{headerMeta.title}</Text>
                <Text style={styles.headerSubtitle}>{headerMeta.subtitle}</Text>
              </View>
            </View>

            {!isSubpage ? (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => setActiveTab("alerts")}
                >
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={COLORS.accent}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => setActiveTab("settings")}
                >
                  <Ionicons
                    name="settings-outline"
                    size={18}
                    color={COLORS.accent}
                  />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {statusMessage ? (
          <View style={styles.statusBanner}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={COLORS.secondary}
            />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        ) : null}

        {activeTab === "overview" ? (
          <View>
            <View style={styles.profileHeroCard}>
              <View style={styles.profileAvatarShell}>
                <View
                  style={[
                    styles.profileAvatar,
                    {
                      backgroundColor: profileAccentSurface,
                      borderColor: profileAccentBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="shield-half-outline"
                    size={56}
                    color={COLORS.accent}
                  />
                </View>
                <TouchableOpacity
                  style={styles.editAvatarButton}
                  onPress={() => setActiveTab("edit")}
                >
                  <Ionicons
                    name="camera-outline"
                    size={14}
                    color={COLORS.text}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.profileName}>{profileName}</Text>
              <Text style={styles.profileStatus}>Active now</Text>
              <Text style={styles.profileBio}>{profileBio}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {profile?.postCount ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {profile?.commentCount ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Comments</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {profile?.voteCount ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Likes</Text>
                </View>
              </View>

              <View style={styles.quickActionRow}>
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => setActiveTab("myPosts")}
                >
                  <Ionicons
                    name="list-outline"
                    size={18}
                    color={COLORS.accent}
                  />
                  <Text style={styles.quickActionText}>My Posts</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => setActiveTab("saved")}
                >
                  <Ionicons
                    name="bookmark-outline"
                    size={18}
                    color={COLORS.accent}
                  />
                  <Text style={styles.quickActionText}>Saved</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={() => setActiveTab("alerts")}>
                  <Text style={styles.sectionLink}>See all</Text>
                </TouchableOpacity>
              </View>

              {recentActivity.length ? (
                recentActivity.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.activityRow}
                    onPress={() => markSingleRead(item.id)}
                  >
                    <View style={styles.activityIcon}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={15}
                        color={COLORS.primary}
                      />
                    </View>
                    <View style={styles.activityCopy}>
                      <Text style={styles.activityTitle}>{item.title}</Text>
                      <Text style={styles.activityBody}>{item.body}</Text>
                    </View>
                    <Text style={styles.activityTime}>{item.time}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>No recent activity yet.</Text>
              )}
            </View>

            <View style={styles.identityStrip}>
              <View style={styles.identityPill}>
                <Ionicons
                  name="eye-off-outline"
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.identityPillText}>
                  Identity hidden in posts
                </Text>
              </View>
              <View style={styles.identityPill}>
                <Ionicons
                  name="mail-outline"
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.identityPillText}>{profileHandle}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {activeTab === "alerts" ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Alerts</Text>
              <TouchableOpacity onPress={markEverythingRead}>
                <Text style={styles.sectionLink}>Mark all read</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={COLORS.gray} />
              <TextInput
                value={notificationSearchQuery}
                onChangeText={setNotificationSearchQuery}
                placeholder="Search alerts"
                placeholderTextColor={COLORS.gray}
                style={styles.searchInput}
              />
            </View>

            {filteredNotifications.length ? (
              filteredNotifications.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.alertCard,
                    !item.isRead && styles.alertCardUnread,
                  ]}
                  onPress={() => markSingleRead(item.id)}
                >
                  <Text style={styles.alertTitle}>{item.title}</Text>
                  <Text style={styles.alertBody}>{item.body}</Text>
                  <Text style={styles.alertTime}>
                    {formatDate(item.createdAt)}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No alerts match that search.</Text>
            )}
          </View>
        ) : null}

        {activeTab === "settings" ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.settingsGroup}>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setActiveTab("edit")}
              >
                <Text style={styles.settingsRowText}>Edit Profile</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.gray}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setActiveTab("privacy")}
              >
                <Text style={styles.settingsRowText}>Privacy & Safety</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.gray}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setActiveTab("alerts")}
              >
                <Text style={styles.settingsRowText}>Notifications</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.gray}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.settingsGroup}>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setActiveTab("appearance")}
              >
                <Text style={styles.settingsRowText}>Appearance</Text>
                <Text style={styles.settingsRowMeta}>
                  {activeThemeOption.title}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setActiveTab("content")}
              >
                <Text style={styles.settingsRowText}>Content Preferences</Text>
                <Text style={styles.settingsRowMeta}>
                  {settings?.mutedKeywords?.length ?? 0} muted
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={resetOnboarding}
              >
                <Text style={styles.settingsRowText}>Reset Onboarding</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.gray}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Support</Text>
            <View style={styles.settingsGroup}>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setActiveTab("support")}
              >
                <Text style={styles.settingsRowText}>Help Center</Text>
                <Text style={styles.settingsRowMeta}>Support</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => void openSupportComposer("report")}
              >
                <Text style={styles.settingsRowText}>Report a Problem</Text>
                <Text style={styles.settingsRowMeta}>Email</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={disconnectWallet}
            >
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {activeTab === "appearance" ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <Text style={styles.sectionDescription}>
              Keep the app dark, then choose how deep you want the surfaces to
              feel.
            </Text>

            {THEME_OPTIONS.map((option) => {
              const isActive = activeThemeOption.id === option.id;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    isActive && styles.optionCardActive,
                  ]}
                  onPress={() => void saveThemePreference(option.id)}
                >
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>
                  <Ionicons
                    name={isActive ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={isActive ? COLORS.primary : COLORS.gray}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {activeTab === "content" ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Content Preferences</Text>
            <Text style={styles.sectionDescription}>
              Mute keywords and hide sensitive posts without changing your
              anonymous identity.
            </Text>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceCopy}>
                <Text style={styles.preferenceTitle}>
                  Sensitive content filter
                </Text>
                <Text style={styles.preferenceSubtitle}>
                  Hide posts that may contain graphic or intense material.
                </Text>
              </View>
              <Switch
                value={privacyPrefs.safeMode}
                onValueChange={(value) =>
                  void updatePrivacyPref("safeMode", value)
                }
                trackColor={{ false: "#2B2B32", true: "rgba(139,61,255,0.50)" }}
                thumbColor={privacyPrefs.safeMode ? COLORS.primary : "#D9D9E6"}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputGroupLabel}>Muted keywords</Text>
              <TextInput
                value={mutedKeywordDraft}
                onChangeText={setMutedKeywordDraft}
                placeholder="spoilers, fights, politics"
                placeholderTextColor={COLORS.gray}
                style={[styles.profileInput, styles.profileInputMultiline]}
                multiline
              />
              <Text style={styles.helperText}>
                Separate words or phrases with commas. Matching posts can be
                filtered out more easily.
              </Text>
            </View>

            {mutedKeywords.length ? (
              <View style={styles.keywordWrap}>
                {mutedKeywords.map((item) => (
                  <View key={item} style={styles.keywordPill}>
                    <Text style={styles.keywordPillText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.secondaryCta, styles.actionButton]}
                onPress={() => void saveMutedKeywords("")}
              >
                <Text style={styles.secondaryCtaText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryCta, styles.actionButton]}
                onPress={() => void saveMutedKeywords()}
              >
                <Text style={styles.primaryCtaText}>Save Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {activeTab === "support" ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Support</Text>
            <Text style={styles.sectionDescription}>
              Open your mail app with the right subject line already filled in,
              or share feedback directly.
            </Text>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => void openSupportComposer("help")}
            >
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>Email Help</Text>
                <Text style={styles.optionDescription}>
                  Ask about your account, profile, alerts, or privacy controls.
                </Text>
              </View>
              <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => void openSupportComposer("report")}
            >
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>Report a Problem</Text>
                <Text style={styles.optionDescription}>
                  Send a bug report draft with your account context already
                  included.
                </Text>
              </View>
              <Ionicons name="bug-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => void shareFeedback()}
            >
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>Share Feedback</Text>
                <Text style={styles.optionDescription}>
                  Tell us what should improve next in the app experience.
                </Text>
              </View>
              <Ionicons
                name="chatbox-ellipses-outline"
                size={20}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        {activeTab === "privacy" ? (
          <View style={styles.sectionCard}>
            {[
              {
                key: "hideOnlineStatus",
                title: "Hide Online Status",
                subtitle: "Others won't see when you're active.",
              },
              {
                key: "allowComments",
                title: "Allow Comments",
                subtitle: "Allow others to comment on your posts.",
              },
              {
                key: "allowDirectMessages",
                title: "Allow Direct Messages",
                subtitle: "Receive messages from other users.",
              },
              {
                key: "showPostsInFeed",
                title: "Show My Posts in Feed",
                subtitle: "Your posts may appear in public feeds.",
              },
              {
                key: "safeMode",
                title: "Safe Mode",
                subtitle: "Hide potentially sensitive content.",
              },
            ].map((item) => (
              <View key={item.key} style={styles.privacyRow}>
                <View style={styles.privacyCopy}>
                  <Text style={styles.privacyTitle}>{item.title}</Text>
                  <Text style={styles.privacySubtitle}>{item.subtitle}</Text>
                </View>
                <Switch
                  value={privacyPrefs[item.key as keyof typeof privacyPrefs]}
                  onValueChange={(value) =>
                    void updatePrivacyPref(
                      item.key as keyof typeof privacyPrefs,
                      value,
                    )
                  }
                  trackColor={{
                    false: "#2B2B32",
                    true: "rgba(139,61,255,0.50)",
                  }}
                  thumbColor={
                    privacyPrefs[item.key as keyof typeof privacyPrefs]
                      ? COLORS.primary
                      : "#D9D9E6"
                  }
                />
              </View>
            ))}
          </View>
        ) : null}

        {activeTab === "edit" ? (
          <View style={styles.sectionCard}>
            <View style={styles.editAvatarBlock}>
              <View
                style={[
                  styles.profileAvatar,
                  {
                    backgroundColor: profileAccentSurface,
                    borderColor: profileAccentBorder,
                  },
                ]}
              >
                <Ionicons
                  name="shield-half-outline"
                  size={48}
                  color={COLORS.accent}
                />
              </View>
              <Text style={styles.editSubtitle}>
                Anonymous is your identity. You can change your display name
                anytime.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputGroupLabel}>Display Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="User_4821"
                placeholderTextColor={COLORS.gray}
                style={styles.profileInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputGroupLabel}>Status</Text>
              <TextInput
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Sharing thoughts, not identity."
                placeholderTextColor={COLORS.gray}
                style={[styles.profileInput, styles.profileInputMultiline]}
                multiline
              />
            </View>

            <View style={styles.colorRow}>
              {PROFILE_ACCENT_OPTIONS.map((color) => {
                const selected = profileAccent === color;

                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorDotButton,
                      selected && {
                        borderColor: color,
                        backgroundColor: hexToRgba(color, 0.14),
                      },
                    ]}
                    onPress={() => setProfileAccent(color)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.colorDot, { backgroundColor: color }]}>
                      {selected ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryCta,
                savingProfile && styles.primaryCtaDisabled,
              ]}
              onPress={() => void saveProfileDraft()}
              disabled={savingProfile}
            >
              <Text style={styles.primaryCtaText}>
                {savingProfile ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {activeTab === "myPosts" ? (
          <View style={styles.sectionCard}>
            {myPostsLoading && !myPosts.length ? (
              <View style={styles.myPostsLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.emptyText}>Loading your posts...</Text>
              </View>
            ) : myPosts.length ? (
              myPosts.map((post) => (
                <View key={post.id} style={styles.myPostCard}>
                  <Text style={styles.myPostBody} numberOfLines={4}>
                    {post.body?.trim() || "(image post)"}
                  </Text>
                  <View style={styles.myPostMetaRow}>
                    <View style={styles.myPostStat}>
                      <Ionicons
                        name="thumbs-up-outline"
                        size={13}
                        color={COLORS.gray}
                      />
                      <Text style={styles.myPostMetaText}>
                        {post.upVotes}
                      </Text>
                    </View>
                    <View style={styles.myPostStat}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={13}
                        color={COLORS.gray}
                      />
                      <Text style={styles.myPostMetaText}>
                        {post.commentCount}
                      </Text>
                    </View>
                    <Text style={styles.myPostMetaText}>
                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                    <TouchableOpacity
                      style={styles.myPostDeleteBtn}
                      onPress={() => handleDeleteMyPost(post)}
                      disabled={myPostsDeletingId === post.id}
                    >
                      {myPostsDeletingId === post.id ? (
                        <ActivityIndicator size="small" color="#F87171" />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={15}
                          color="#F87171"
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.myPostsLoading}>
                <Ionicons
                  name="list-outline"
                  size={24}
                  color={COLORS.gray}
                />
                <Text style={styles.emptyText}>
                  You haven&apos;t posted anything yet.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {activeTab === "saved" ? (
          <View style={styles.sectionCard}>
            {savedPostsLoading && !savedPosts.length ? (
              <View style={styles.myPostsLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.emptyText}>Loading saved posts...</Text>
              </View>
            ) : savedPosts.length ? (
              savedPosts.map((post) => (
                <View key={post.id} style={styles.myPostCard}>
                  <Text style={styles.myPostBody} numberOfLines={4}>
                    {post.body?.trim() || "(image post)"}
                  </Text>
                  <View style={styles.myPostMetaRow}>
                    <View style={styles.myPostStat}>
                      <Ionicons
                        name="thumbs-up-outline"
                        size={13}
                        color={COLORS.gray}
                      />
                      <Text style={styles.myPostMetaText}>
                        {post.upVotes}
                      </Text>
                    </View>
                    <View style={styles.myPostStat}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={13}
                        color={COLORS.gray}
                      />
                      <Text style={styles.myPostMetaText}>
                        {post.commentCount}
                      </Text>
                    </View>
                    <Text style={styles.myPostMetaText}>
                      {post.authorName?.trim() || "Anonymous"}
                    </Text>
                    <TouchableOpacity
                      style={styles.myPostSaveBtn}
                      onPress={() => void handleUnsavePost(post)}
                    >
                      <Ionicons name="bookmark" size={15} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.myPostsLoading}>
                <Ionicons name="bookmark-outline" size={24} color={COLORS.gray} />
                <Text style={styles.emptyText}>
                  Tap the bookmark icon on any post to save it here.
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  surface: { flex: 1, padding: 16 },
  surfaceCompact: { paddingHorizontal: 14 },
  loadingSurface: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: COLORS.gray, ...TYPOGRAPHY.label },
  content: {
    flexGrow: 1,
    paddingTop: 24,
    paddingBottom: 140,
  },
  headerCard: {
    backgroundColor: "#08080C",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 18,
    marginBottom: 16,
  },
  headerCardCompact: { padding: 14 },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  headerTopRowCompact: { alignItems: "flex-start" },
  headerLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerActions: { flexDirection: "row", gap: 10 },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101015",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.20)",
  },
  headerTitle: { color: COLORS.text, ...TYPOGRAPHY.heading },
  headerSubtitle: { color: COLORS.gray, ...TYPOGRAPHY.label, marginTop: 3 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#0C0C10",
    padding: 12,
    marginBottom: 14,
  },
  statusText: { color: COLORS.text, ...TYPOGRAPHY.label, flex: 1 },
  profileHeroCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#09090C",
    padding: 18,
    alignItems: "center",
    marginBottom: 14,
  },
  profileAvatarShell: {
    marginTop: 8,
    marginBottom: 14,
  },
  profileAvatar: {
    width: 122,
    height: 122,
    borderRadius: 61,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(125,60,255,0.20)",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.32)",
  },
  editAvatarButton: {
    position: "absolute",
    right: 0,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  profileName: {
    color: COLORS.text,
    ...TYPOGRAPHY.heading,
    marginBottom: 4,
  },
  profileStatus: {
    color: COLORS.primary,
    ...TYPOGRAPHY.meta,
    marginBottom: 8,
  },
  profileBio: {
    color: COLORS.gray,
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#111117",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    paddingVertical: 12,
  },
  statValue: { color: COLORS.text, ...TYPOGRAPHY.section },
  statLabel: { color: COLORS.gray, ...TYPOGRAPHY.meta, marginTop: 4 },
  quickActionRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#111117",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  quickActionText: { color: COLORS.text, ...TYPOGRAPHY.meta },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#09090C",
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { color: COLORS.text, ...TYPOGRAPHY.title, marginBottom: 10 },
  sectionLink: { color: COLORS.primary, ...TYPOGRAPHY.meta },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(139,61,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  activityCopy: { flex: 1 },
  activityTitle: { color: COLORS.text, ...TYPOGRAPHY.label, marginBottom: 2 },
  activityBody: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  activityTime: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    maxWidth: 88,
    textAlign: "right",
  },
  emptyText: { color: COLORS.gray, ...TYPOGRAPHY.label, marginTop: 10 },
  myPostsLoading: {
    alignItems: "center",
    paddingVertical: 28,
  },
  myPostCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#111117",
    padding: 14,
    marginBottom: 10,
  },
  myPostBody: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 10,
  },
  myPostMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  myPostStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  myPostMetaText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  myPostDeleteBtn: {
    marginLeft: "auto",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,113,113,0.1)",
  },
  myPostSaveBtn: {
    marginLeft: "auto",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,61,255,0.12)",
  },
  identityStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  identityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#0E0E12",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  identityPillText: { color: COLORS.text, ...TYPOGRAPHY.meta },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#111117",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    paddingVertical: 0,
  },
  alertCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#111117",
    padding: 14,
    marginBottom: 10,
  },
  alertCardUnread: {
    borderColor: "rgba(139,61,255,0.26)",
    backgroundColor: "rgba(139,61,255,0.08)",
  },
  alertTitle: { color: COLORS.text, ...TYPOGRAPHY.label, marginBottom: 6 },
  alertBody: { color: COLORS.gray, ...TYPOGRAPHY.meta, marginBottom: 8 },
  alertTime: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  settingsGroup: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#101015",
    marginBottom: 16,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  settingsRowText: { color: COLORS.text, ...TYPOGRAPHY.label },
  settingsRowMeta: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  sectionDescription: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    marginBottom: 14,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#101015",
    padding: 14,
    marginBottom: 12,
  },
  optionCardActive: {
    borderColor: "rgba(139,61,255,0.35)",
    backgroundColor: "rgba(139,61,255,0.10)",
  },
  optionCopy: { flex: 1 },
  optionTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 4,
  },
  optionDescription: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  logoutButton: {
    borderRadius: 16,
    backgroundColor: "rgba(70,17,33,0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 6,
  },
  logoutButtonText: { color: "#FF7A8A", ...TYPOGRAPHY.button },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: COLORS.text, ...TYPOGRAPHY.label, marginBottom: 3 },
  privacySubtitle: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#101015",
  },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { color: COLORS.text, ...TYPOGRAPHY.label, marginBottom: 4 },
  preferenceSubtitle: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  editAvatarBlock: { alignItems: "center", marginBottom: 18 },
  editSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    textAlign: "center",
    marginTop: 12,
  },
  inputGroup: { marginBottom: 14 },
  inputGroupLabel: { color: COLORS.gray, ...TYPOGRAPHY.meta, marginBottom: 8 },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  colorDotButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#101015",
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#111117",
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  profileInputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  helperText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    marginTop: 8,
  },
  keywordWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  keywordPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#111117",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  keywordPillText: { color: COLORS.text, ...TYPOGRAPHY.meta },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: { flex: 1 },
  secondaryCta: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#101015",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  secondaryCtaText: { color: COLORS.text, ...TYPOGRAPHY.button },
  primaryCta: {
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  primaryCtaDisabled: {
    opacity: 0.72,
  },
  primaryCtaText: { color: COLORS.text, ...TYPOGRAPHY.button },
});

export default WalletScreen;
