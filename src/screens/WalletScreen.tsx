import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import HeroHeading from "../components/HeroHeading";
import ScreenSurface from "../components/ScreenSurface";
import { useWallet } from "../contexts/WalletContext";
import {
    NotificationItem,
    UserSettings,
    WalletProfile,
    getMe,
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    updateSettings,
} from "../services/api";
  import { COLORS, TYPOGRAPHY } from "../theme";
import ConnectWalletScreen from "./auth/ConnectWalletScreen";

type WalletTab = "overview" | "notifications" | "settings";

const formatDate = (timestamp: string) => new Date(timestamp).toLocaleString();

const WalletScreen = () => {
  const { address, token, isConnected, disconnectWallet } = useWallet();
  const [activeTab, setActiveTab] = useState<WalletTab>("overview");
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
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
      setSettings(meResponse.data.settings);
      setNotifications(notificationsResponse.data);
      setStatusMessage(null);
    } catch (error) {
      console.error("Wallet sync failed", error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to load your account right now.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const saveSettings = useCallback(
    async (nextSettings: Partial<UserSettings>) => {
      if (!token || !settings) {
        return;
      }

      const merged = { ...settings, ...nextSettings };
      setSettings(merged);
      try {
        const response = await updateSettings(token, nextSettings);
        setSettings(response.data);
      } catch (error) {
        setStatusMessage(
          error instanceof Error ? error.message : "Unable to save settings.",
        );
        await loadWallet();
      }
    },
    [loadWallet, settings, token],
  );

  const markSingleRead = useCallback(
    async (notificationId: number) => {
      if (!token) {
        return;
      }

      try {
        const response = await markNotificationRead(token, notificationId);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notificationId ? response.data : item,
          ),
        );
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Unable to mark notification as read.",
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
      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true })),
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to update notifications.",
      );
    }
  }, [token]);

  if (!isConnected) {
    return <ConnectWalletScreen />;
  }

  return (
    <ScreenSurface style={styles.surface} bleedTop>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingVertical: 24,
          paddingBottom: 140,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadWallet} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeroHeading
          title="Wallet Hub"
          subtitle={address || profile?.walletAddress || "Wallet connected"}
          ctaLabel="Refresh"
          ctaIcon="refresh"
          onPressCta={loadWallet}
          stats={[
            {
              icon: "megaphone-outline",
              label: `${profile?.postCount ?? 0} posts`,
              color: COLORS.primary,
            },
            {
              icon: "notifications-outline",
              label: `${unreadCount} unread`,
              color: COLORS.secondary,
            },
          ]}
        />

        <View style={styles.tabRow}>
          {(["overview", "notifications", "settings"] as WalletTab[]).map(
            (tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, active && styles.tabBtnActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
                  >
                    {tab[0].toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>

        {statusMessage && (
          <View style={styles.statusBanner}>
            <Ionicons
              name="warning-outline"
              size={16}
              color={COLORS.secondary}
            />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

        {activeTab === "overview" && (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="wallet-outline"
                size={36}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.title}>Anonymous Account</Text>
            <Text style={styles.address}>
              {profile?.walletAddress || address}
            </Text>
            <Text style={styles.caption}>
              Joined:{" "}
              {profile?.createdAt ? formatDate(profile.createdAt) : "--"}
            </Text>

            <View style={styles.identityStrip}>
              <View style={styles.identityPill}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.identityText}>Verified wallet</Text>
              </View>
              <View style={styles.identityPill}>
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={COLORS.secondary}
                />
                <Text style={styles.identityText}>{unreadCount} unread alerts</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons
                  name="megaphone-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.statLabel}>Posts</Text>
                <Text style={styles.statValue}>{profile?.postCount ?? 0}</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color={COLORS.secondary}
                />
                <Text style={styles.statLabel}>Comments</Text>
                <Text style={styles.statValue}>
                  {profile?.commentCount ?? 0}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="thumbs-up-outline" size={18} color="#4ADE80" />
                <Text style={styles.statLabel}>Votes</Text>
                <Text style={styles.statValue}>{profile?.voteCount ?? 0}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.disconnectBtn}
              onPress={disconnectWallet}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={COLORS.text}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.disconnectBtnText}>Disconnect Wallet</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "notifications" && (
          <View style={styles.card}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.title}>Notifications</Text>
              <TouchableOpacity onPress={markEverythingRead}>
                <Text style={styles.linkText}>Mark all read</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.notificationsSummary}>
              <Text style={styles.notificationsHeadline}>Signal center</Text>
              <Text style={styles.notificationsSummaryText}>
                Fresh activity from your posts, comments, and votes appears here.
              </Text>
            </View>

            {notifications.length ? (
              notifications.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.notificationCard,
                    !item.isRead && styles.notificationUnread,
                  ]}
                  onPress={() => markSingleRead(item.id)}
                >
                  <View style={styles.notificationTopRow}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    {!item.isRead && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationBody}>{item.body}</Text>
                  <Text style={styles.notificationTime}>
                    {formatDate(item.createdAt)}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptySubtitle}>No notifications yet.</Text>
            )}
          </View>
        )}

        {activeTab === "settings" && settings && (
          <View style={styles.card}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.settingsLead}>
              Control alerts, privacy visibility, and how your anonymous space feels.
            </Text>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Push notifications</Text>
                <Text style={styles.settingSubtitle}>
                  Receive alerts for comments and votes.
                </Text>
              </View>
              <Switch
                value={settings.pushEnabled}
                onValueChange={(value) => saveSettings({ pushEnabled: value })}
                trackColor={{
                  false: COLORS.border,
                  true: `${COLORS.primary}80`,
                }}
                thumbColor={settings.pushEnabled ? COLORS.primary : COLORS.gray}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Email updates</Text>
                <Text style={styles.settingSubtitle}>
                  Keep email off unless you add it later.
                </Text>
              </View>
              <Switch
                value={settings.emailEnabled}
                onValueChange={(value) => saveSettings({ emailEnabled: value })}
                trackColor={{
                  false: COLORS.border,
                  true: `${COLORS.primary}80`,
                }}
                thumbColor={
                  settings.emailEnabled ? COLORS.primary : COLORS.gray
                }
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Marketing updates</Text>
                <Text style={styles.settingSubtitle}>
                  Product tips and event announcements.
                </Text>
              </View>
              <Switch
                value={settings.marketingEnabled}
                onValueChange={(value) =>
                  saveSettings({ marketingEnabled: value })
                }
                trackColor={{
                  false: COLORS.border,
                  true: `${COLORS.primary}80`,
                }}
                thumbColor={
                  settings.marketingEnabled ? COLORS.primary : COLORS.gray
                }
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Show wallet summary</Text>
                <Text style={styles.settingSubtitle}>
                  Keep account totals visible in the app.
                </Text>
              </View>
              <Switch
                value={settings.showWalletSummary}
                onValueChange={(value) =>
                  saveSettings({ showWalletSummary: value })
                }
                trackColor={{
                  false: COLORS.border,
                  true: `${COLORS.primary}80`,
                }}
                thumbColor={
                  settings.showWalletSummary ? COLORS.primary : COLORS.gray
                }
              />
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  surface: { flex: 1, padding: 16 },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: `${COLORS.primary}18`,
  },
  tabText: { color: COLORS.gray, ...TYPOGRAPHY.label },
  tabTextActive: { color: COLORS.text },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 12,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusText: { color: COLORS.text, flex: 1, ...TYPOGRAPHY.label },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 14,
    marginBottom: 18,
  },
  iconWrap: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  title: {
    color: COLORS.text,
    ...TYPOGRAPHY.title,
    marginBottom: 4,
  },
  address: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    marginBottom: 12,
    letterSpacing: 1,
  },
  caption: { color: COLORS.gray, ...TYPOGRAPHY.meta, marginBottom: 12 },
  identityStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  identityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  identityText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20, width: "100%" },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  statValue: { color: COLORS.text, ...TYPOGRAPHY.title, fontSize: 18, lineHeight: 22 },
  disconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  disconnectBtnText: { color: COLORS.text, ...TYPOGRAPHY.button },
  notificationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  notificationsSummary: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 14,
  },
  notificationsHeadline: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 4,
  },
  notificationsSummaryText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  linkText: { color: COLORS.primary, ...TYPOGRAPHY.label },
  notificationCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  notificationUnread: {
    borderColor: COLORS.primary,
  },
  notificationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  notificationTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    flex: 1,
    marginRight: 10,
  },
  notificationBody: { color: COLORS.gray, ...TYPOGRAPHY.label, fontWeight: "500" },
  notificationTime: { color: COLORS.gray, ...TYPOGRAPHY.meta, marginTop: 8 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingsLead: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    marginBottom: 12,
  },
  settingCopy: { flex: 1, marginRight: 16 },
  settingTitle: { color: COLORS.text, ...TYPOGRAPHY.label, marginBottom: 4 },
  settingSubtitle: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  emptySubtitle: { color: COLORS.gray, ...TYPOGRAPHY.label },
});

export default WalletScreen;
