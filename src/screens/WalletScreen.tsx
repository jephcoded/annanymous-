import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    TouchableOpacity
} from "react-native";
import HeroHeading from "../components/HeroHeading";
import ScreenSurface from "../components/ScreenSurface";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
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

const shortenWalletAddress = (address?: string | null) => {
  if (!address) {
    return "Wallet connected";
  }

  if (address.length <= 14) {
    return address;
  }

  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const getReputationSnapshot = (profile: WalletProfile | null) => {
  const postCount = profile?.postCount ?? 0;
  const commentCount = profile?.commentCount ?? 0;
  const voteCount = profile?.voteCount ?? 0;
  const karmaPoints = postCount * 5 + commentCount * 3 + voteCount;
  const engagementScore = Math.min(
    100,
    postCount * 8 + commentCount * 5 + voteCount * 2,
  );

  let badge = "New voice";
  if (karmaPoints >= 80) {
    badge = "Top contributor";
  } else if (karmaPoints >= 40) {
    badge = "Trusted source";
  } else if (karmaPoints >= 20) {
    badge = "Rising signal";
  }

  return { karmaPoints, engagementScore, badge };
};

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
  const reputation = useMemo(
    () => getReputationSnapshot(profile),
    [profile],
  );
  const accountHealth = useMemo(() => {
    const completedSignals = [
      Boolean(profile?.postCount),
      Boolean(profile?.commentCount),
      Boolean(profile?.voteCount),
      Boolean(settings?.pushEnabled),
    ].filter(Boolean).length;

    if (completedSignals >= 4) {
      return "High activity";
    }

    if (completedSignals >= 2) {
      return "Growing";
    }

    return "Early setup";
  }, [profile, settings]);

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
          title="Wallet"
          subtitle={
            shortenWalletAddress(address || profile?.walletAddress) ||
            "Wallet connected"
          }
          ctaLabel="Refresh"
          ctaIcon="refresh"
          onPressCta={loadWallet}
          stats={[
            {
              icon: "radio-outline",
              label: `${profile?.postCount ?? 0} posts`,
              color: COLORS.primary,
            },
            {
              icon: "sparkles-outline",
              label: `${unreadCount} unread`,
              color: COLORS.secondary,
            },
            {
              icon: "pulse-outline",
              label: accountHealth,
              color: COLORS.gray,
            },
          ]}
        />

        <ThemedView style={styles.tabRow}>
          {(["overview", "notifications", "settings"] as WalletTab[]).map(
            (tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, active && styles.tabBtnActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <ThemedText
                    type={active ? "defaultSemiBold" : "default"}
                    style={[styles.tabText, active && styles.tabTextActive]}
                  >
                    {tab === "notifications"
                      ? "Alerts"
                      : tab[0].toUpperCase() + tab.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              );
            },
          )}
        </ThemedView>

        {statusMessage && (
          <ThemedView style={styles.statusBanner}>
            <Ionicons
              name="warning-outline"
              size={16}
              color={COLORS.secondary}
            />
            <ThemedText type="defaultSemiBold" style={styles.statusText}>
              {statusMessage}
            </ThemedText>
          </ThemedView>
        )}

        {activeTab === "overview" && (
          <ThemedView style={styles.card}>
            <ThemedView style={styles.healthBanner}>
              <ThemedView>
                <ThemedText type="default" style={styles.healthLabel}>
                  Identity status
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.healthValue}>
                  {accountHealth}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.healthPill}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={COLORS.primary}
                />
                <ThemedText type="default" style={styles.healthPillText}>
                  Masked access layer
                </ThemedText>
              </ThemedView>
            </ThemedView>
            <ThemedView style={styles.accountHeader}>
              <ThemedView style={styles.iconWrap}>
                <Ionicons
                  name="shield-half-outline"
                  size={32}
                  color={COLORS.primary}
                />
              </ThemedView>
              <ThemedView style={styles.accountCopy}>
                <ThemedText type="title" style={styles.title}>
                  Account
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.address}>
                  {shortenWalletAddress(profile?.walletAddress || address)}
                </ThemedText>
                <ThemedText type="default" style={styles.caption}>
                  Member since{" "}
                  {profile?.createdAt ? formatDate(profile.createdAt) : "--"}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.addressCard}>
              <ThemedText type="default" style={styles.addressCardLabel}>
                Wallet address
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.addressCardValue}>
                {profile?.walletAddress || address}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.identityStrip}>
              <ThemedView style={styles.identityPill}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={COLORS.primary}
                />
                <ThemedText type="default" style={styles.identityText}>
                  Verified wallet
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.identityPill}>
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={COLORS.secondary}
                />
                <ThemedText type="default" style={styles.identityText}>
                  {unreadCount} live signals
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.accountSummaryRow}>
              <ThemedView style={styles.accountSummaryCard}>
                <ThemedText type="default" style={styles.accountSummaryLabel}>
                  Posts
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.accountSummaryValue}>
                  {profile?.postCount ?? 0}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.accountSummaryCard}>
                <ThemedText type="default" style={styles.accountSummaryLabel}>
                  Replies
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.accountSummaryValue}>
                  {profile?.commentCount ?? 0}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.accountSummaryCard}>
                <ThemedText type="default" style={styles.accountSummaryLabel}>
                  Signals
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.accountSummaryValue}>
                  {profile?.voteCount ?? 0}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.buyerSignalCard}>
              <ThemedText type="defaultSemiBold" style={styles.buyerSignalTitle}>
                Standing
              </ThemedText>
              <ThemedText type="default" style={styles.buyerSignalText}>
                Your wallet unlocks posting, reactions, communities, and reputation without exposing your public identity inside the app.
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.reputationCard}>
              <ThemedView style={styles.reputationHeader}>
                <ThemedView>
                  <ThemedText type="defaultSemiBold" style={styles.reputationTitle}>
                    Reputation
                  </ThemedText>
                  <ThemedText type="default" style={styles.reputationSubtitle}>
                    Credibility that grows from participation, not profile exposure.
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.reputationBadge}>
                  <Ionicons
                    name="ribbon-outline"
                    size={14}
                    color={COLORS.primary}
                  />
                  <ThemedText type="default" style={styles.reputationBadgeText}>
                    {reputation.badge}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
              <ThemedView style={styles.reputationStats}>
                <ThemedView style={styles.reputationStat}>
                  <ThemedText type="default" style={styles.reputationStatLabel}>
                    Karma
                  </ThemedText>
                  <ThemedText style={styles.reputationStatValue}>
                    {reputation.karmaPoints}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.reputationStat}>
                  <ThemedText type="default" style={styles.reputationStatLabel}>
                    Engagement
                  </ThemedText>
                  <ThemedText style={styles.reputationStatValue}>
                    {reputation.engagementScore}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.statsRow}>
              <ThemedView style={styles.statCard}>
                <Ionicons
                  name="radio-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <ThemedText type="default" style={styles.statLabel}>
                  Posts
                </ThemedText>
                <ThemedText type="title" style={styles.statValue}>
                  {profile?.postCount ?? 0}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.statCard}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color={COLORS.secondary}
                />
                <ThemedText type="default" style={styles.statLabel}>
                  Comments
                </ThemedText>
                <ThemedText type="title" style={styles.statValue}>
                  {profile?.commentCount ?? 0}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.statCard}>
                <Ionicons
                  name="pulse-outline"
                  size={18}
                  color={COLORS.secondary}
                />
                <ThemedText type="default" style={styles.statLabel}>
                  Signals
                </ThemedText>
                <ThemedText type="title" style={styles.statValue}>
                  {profile?.voteCount ?? 0}
                </ThemedText>
              </ThemedView>
            </ThemedView>

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
              <ThemedText type="defaultSemiBold" style={styles.disconnectBtnText}>
                Disconnect Wallet
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        {activeTab === "notifications" && (
          <ThemedView style={styles.card}>
            <ThemedView style={styles.notificationsHeader}>
              <ThemedText type="title" style={styles.title}>
                Alerts
              </ThemedText>
              <TouchableOpacity onPress={markEverythingRead}>
                <ThemedText type="link" style={styles.linkText}>
                  Mark all read
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>

            <ThemedView style={styles.notificationsSummary}>
              <ThemedText type="defaultSemiBold" style={styles.notificationsHeadline}>
                Alert center
              </ThemedText>
              <ThemedText type="default" style={styles.notificationsSummaryText}>
                Fresh activity from your posts, replies, communities, and account signals appears here.
              </ThemedText>
            </ThemedView>

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
                  <ThemedView style={styles.notificationTopRow}>
                    <ThemedText type="defaultSemiBold" style={styles.notificationTitle}>
                      {item.title}
                    </ThemedText>
                    {!item.isRead && <ThemedView style={styles.unreadDot} />}
                  </ThemedView>
                  <ThemedText type="default" style={styles.notificationBody}>
                    {item.body}
                  </ThemedText>
                  <ThemedText type="default" style={styles.notificationTime}>
                    {formatDate(item.createdAt)}
                  </ThemedText>
                </TouchableOpacity>
              ))
            ) : (
              <ThemedText type="default" style={styles.emptySubtitle}>
                No notifications yet.
              </ThemedText>
            )}
          </ThemedView>
        )}

        {activeTab === "settings" && settings && (
          <ThemedView style={styles.card}>
            <ThemedText type="title" style={styles.title}>
              Settings
            </ThemedText>
            <ThemedText type="default" style={styles.settingsLead}>
              Control alerts, visibility, and how your private account space behaves.
            </ThemedText>
            <ThemedView style={styles.settingsSummaryCard}>
              <ThemedText type="defaultSemiBold" style={styles.settingsSummaryTitle}>
                Quiet control layer
              </ThemedText>
              <ThemedText type="default" style={styles.settingsSummaryText}>
                These controls keep the experience safer, calmer, and more deliberate as you become a repeat contributor.
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.settingRow}>
              <ThemedView style={styles.settingCopy}>
                <ThemedText type="defaultSemiBold" style={styles.settingTitle}>
                  Push notifications
                </ThemedText>
                <ThemedText type="default" style={styles.settingSubtitle}>
                  Receive alerts for comments and votes.
                </ThemedText>
              </ThemedView>
              <Switch
                value={settings.pushEnabled}
                onValueChange={(value) => saveSettings({ pushEnabled: value })}
                trackColor={{
                  false: COLORS.border,
                  true: `${COLORS.primary}80`,
                }}
                thumbColor={settings.pushEnabled ? COLORS.primary : COLORS.gray}
              />
            </ThemedView>
            <ThemedView style={styles.settingRow}>
              <ThemedView style={styles.settingCopy}>
                <ThemedText type="defaultSemiBold" style={styles.settingTitle}>
                  Email updates
                </ThemedText>
                <ThemedText type="default" style={styles.settingSubtitle}>
                  Keep email off unless you add it later.
                </ThemedText>
              </ThemedView>
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
            </ThemedView>
            <ThemedView style={styles.settingRow}>
              <ThemedView style={styles.settingCopy}>
                <ThemedText type="defaultSemiBold" style={styles.settingTitle}>
                  Marketing updates
                </ThemedText>
                <ThemedText type="default" style={styles.settingSubtitle}>
                  Product tips and event announcements.
                </ThemedText>
              </ThemedView>
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
            </ThemedView>
            <ThemedView style={styles.settingRow}>
              <ThemedView style={styles.settingCopy}>
                <ThemedText type="defaultSemiBold" style={styles.settingTitle}>
                  Show wallet summary
                </ThemedText>
                <ThemedText type="default" style={styles.settingSubtitle}>
                  Keep account totals visible in the app.
                </ThemedText>
              </ThemedView>
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
            </ThemedView>
          </ThemedView>
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
  healthBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  healthLabel: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  healthValue: { color: COLORS.text, ...TYPOGRAPHY.section, marginTop: 2 },
  healthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
    backgroundColor: `${COLORS.primary}12`,
  },
  healthPillText: { color: COLORS.text, ...TYPOGRAPHY.meta },
  iconWrap: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  accountCopy: { flex: 1 },
  title: {
    color: COLORS.text,
    ...TYPOGRAPHY.title,
    marginBottom: 4,
  },
  address: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    letterSpacing: 1,
  },
  caption: { color: COLORS.gray, ...TYPOGRAPHY.meta, marginTop: 2 },
  addressCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 14,
  },
  addressCardLabel: { color: COLORS.gray, ...TYPOGRAPHY.meta, marginBottom: 6 },
  addressCardValue: { color: COLORS.text, ...TYPOGRAPHY.label },
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
  accountSummaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  accountSummaryCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    gap: 4,
  },
  accountSummaryLabel: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  accountSummaryValue: { color: COLORS.text, ...TYPOGRAPHY.section },
  buyerSignalCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 18,
  },
  reputationCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 18,
  },
  reputationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  reputationTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 4,
  },
  reputationSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  reputationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
    backgroundColor: `${COLORS.primary}12`,
  },
  reputationBadgeText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
  reputationStats: {
    flexDirection: "row",
    gap: 10,
  },
  reputationStat: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
  },
  reputationStatLabel: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    marginBottom: 4,
  },
  reputationStatValue: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
  },
  buyerSignalTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 4,
  },
  buyerSignalText: { color: COLORS.gray, ...TYPOGRAPHY.meta },
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
  statValue: {
    color: COLORS.text,
    ...TYPOGRAPHY.title,
    fontSize: 18,
    lineHeight: 22,
  },
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
  notificationBody: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    fontWeight: "500",
  },
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
  settingsSummaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 6,
  },
  settingsSummaryTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 4,
  },
  settingsSummaryText: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  settingCopy: { flex: 1, marginRight: 16 },
  settingTitle: { color: COLORS.text, ...TYPOGRAPHY.label, marginBottom: 4 },
  settingSubtitle: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  emptySubtitle: { color: COLORS.gray, ...TYPOGRAPHY.label },
});

export default WalletScreen;
