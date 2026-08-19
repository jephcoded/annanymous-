import { LinearGradient } from "expo-linear-gradient";
import React, {
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_ORIGIN } from "../config/api";
import { useWallet } from "../contexts/WalletContext";
import {
    AdminActivityItem,
    AdminOverview,
    AdminRecentPost,
    AdminReport,
    AdminUser,
    banAdminUser,
    deleteAdminPost,
    getAdminOverview,
    getAdminUser,
    getMe,
    listAdminUsers,
    resolveAdminReport,
    SessionAccess,
    unbanAdminUser,
} from "../services/api";

const palette = {
  bg: "#08101F",
  bgAlt: "#111B34",
  panel: "rgba(18, 29, 52, 0.92)",
  panelStrong: "rgba(23, 35, 64, 0.98)",
  panelSoft: "rgba(255,255,255,0.04)",
  stroke: "rgba(157, 173, 203, 0.18)",
  text: "#EEF4FF",
  muted: "#91A0BD",
  blue: "#5B7CFF",
  red: "#FF6157",
  green: "#4AC18F",
  amber: "#FFB86A",
};

const NAV_ITEMS = [
  { label: "Dashboard", glyph: "DB" },
  { label: "Users", glyph: "US" },
  { label: "Posts", glyph: "PT" },
  { label: "Reports", glyph: "RP" },
  { label: "Logs", glyph: "LG" },
  { label: "Settings", glyph: "ST" },
] as const;

const STAT_META = [
  {
    key: "totalUsers",
    label: "Total Users",
    glyph: "US",
    accent: palette.blue,
  },
  {
    key: "activePosts",
    label: "Active Posts",
    glyph: "PS",
    accent: palette.green,
  },
  {
    key: "reportedPosts",
    label: "Reported Posts",
    glyph: "RP",
    accent: palette.red,
  },
  {
    key: "bannedUsers",
    label: "Banned Users",
    glyph: "BN",
    accent: palette.amber,
  },
] as const;

const formatWallet = (value?: string | null) => {
  if (!value) {
    return "Unknown wallet";
  }

  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAction = (item: AdminActivityItem) =>
  item.action
    .split("_")
    .map(
      (segment: string) => segment.charAt(0).toUpperCase() + segment.slice(1),
    )
    .join(" ");

const askForInput = (message: string, initialValue = "") => {
  if (Platform.OS !== "web" || typeof globalThis.prompt !== "function") {
    return initialValue.trim();
  }

  const value = globalThis.prompt(message, initialValue);
  if (value === null) {
    return null;
  }

  return value.trim();
};

const buildActivityNote = (item: AdminActivityItem) => {
  const metaEntries = Object.entries(item.meta || {}).filter(
    ([, value]) => value != null,
  );
  if (!metaEntries.length) {
    return formatAction(item);
  }

  const detail = metaEntries
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ");

  return `${formatAction(item)} | ${detail}`;
};

const bannerLabel = (hasError: boolean) => (hasError ? "ERR" : "OK");

function AdminDashboard() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    address,
    token,
    isConnected,
    isAuthenticating,
    error,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const [access, setAccess] = useState<SessionAccess | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isStacked = width < 1120;
  const isCompact = width < 860;
  const canReturnToApp = Platform.OS === "web" && typeof window !== "undefined";

  const returnToApp = useCallback(() => {
    if (!canReturnToApp) {
      return;
    }

    window.location.assign("/");
  }, [canReturnToApp]);

  const refreshOverview = useCallback(async (sessionToken: string) => {
    const response = await getAdminOverview(sessionToken, {
      recentLimit: 6,
      reportLimit: 6,
      bannedLimit: 6,
      activityLimit: 8,
    });
    setOverview(response.data);
  }, []);

  const refreshUsers = useCallback(
    async (sessionToken: string, searchValue: string) => {
      setUsersLoading(true);
      try {
        const response = await listAdminUsers(sessionToken, {
          query: searchValue,
          limit: 8,
        });
        setUsers(response.data);
        setSelectedUserId((currentId) => {
          if (
            currentId &&
            response.data.some((item: AdminUser) => item.id === currentId)
          ) {
            return currentId;
          }

          return response.data[0]?.id ?? null;
        });
      } finally {
        setUsersLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!token || !isConnected) {
        setAccess(null);
        setOverview(null);
        setUsers([]);
        setSelectedUser(null);
        setSelectedUserId(null);
        setScreenError(null);
        return;
      }

      setLoading(true);
      setScreenError(null);

      try {
        const meResponse = await getMe(token);
        if (cancelled) {
          return;
        }

        setAccess(meResponse.data.access);

        if (!meResponse.data.access.isAdmin) {
          setOverview(null);
          setUsers([]);
          setSelectedUser(null);
          return;
        }

        await Promise.all([
          refreshOverview(token),
          refreshUsers(token, deferredQuery),
        ]);
      } catch (loadError) {
        if (!cancelled) {
          setScreenError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load admin data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, isConnected, refreshOverview, refreshUsers, token]);

  useEffect(() => {
    let cancelled = false;

    const loadSelectedUser = async () => {
      if (!token || !access?.isAdmin || !selectedUserId) {
        setSelectedUser(null);
        return;
      }

      setSelectedUserLoading(true);
      try {
        const response = await getAdminUser(token, selectedUserId);
        if (!cancelled) {
          setSelectedUser(response.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setScreenError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load selected user.",
          );
        }
      } finally {
        if (!cancelled) {
          setSelectedUserLoading(false);
        }
      }
    };

    void loadSelectedUser();

    return () => {
      cancelled = true;
    };
  }, [access?.isAdmin, selectedUserId, token]);

  const runAction = useCallback(
    async (actionKey: string, operation: () => Promise<void>) => {
      setPendingAction(actionKey);
      setScreenError(null);
      setStatusMessage(null);
      try {
        await operation();
      } catch (actionError) {
        setScreenError(
          actionError instanceof Error ? actionError.message : "Action failed.",
        );
      } finally {
        setPendingAction(null);
      }
    },
    [],
  );

  const handleDeletePost = useCallback(
    async (post: AdminRecentPost) => {
      if (!token) {
        return;
      }

      const reason = askForInput(
        `Delete post #${post.id}. Optional reason:`,
        "Removed by admin",
      );
      if (reason === null) {
        return;
      }

      await runAction(`delete-post-${post.id}`, async () => {
        await deleteAdminPost(token, post.id, reason || undefined);
        await Promise.all([
          refreshOverview(token),
          refreshUsers(token, deferredQuery),
        ]);
        setStatusMessage(`Post #${post.id} deleted.`);
      });
    },
    [deferredQuery, refreshOverview, refreshUsers, runAction, token],
  );

  const handleResolveReport = useCallback(
    async (report: AdminReport) => {
      if (!token) {
        return;
      }

      const note = askForInput(
        `Resolve report #${report.id}. Optional note:`,
        "Resolved by admin",
      );
      if (note === null) {
        return;
      }

      await runAction(`resolve-report-${report.id}`, async () => {
        await resolveAdminReport(token, report.id, note || undefined);
        await refreshOverview(token);
        setStatusMessage(`Report #${report.id} resolved.`);
      });
    },
    [refreshOverview, runAction, token],
  );

  const handleBanUser = useCallback(async () => {
    if (!token || !selectedUser) {
      return;
    }

    const reason = askForInput(
      `Ban ${selectedUser.walletAddress}. Reason:`,
      selectedUser.bannedReason || "Banned by admin",
    );
    if (reason === null) {
      return;
    }

    await runAction(`ban-user-${selectedUser.id}`, async () => {
      await banAdminUser(token, selectedUser.id, reason || undefined);
      await Promise.all([
        refreshOverview(token),
        refreshUsers(token, deferredQuery),
      ]);
      const nextUser = await getAdminUser(token, selectedUser.id);
      setSelectedUser(nextUser.data);
      setStatusMessage(
        `User ${formatWallet(selectedUser.walletAddress)} banned.`,
      );
    });
  }, [
    deferredQuery,
    refreshOverview,
    refreshUsers,
    runAction,
    selectedUser,
    token,
  ]);

  const handleUnbanUser = useCallback(async () => {
    if (!token || !selectedUser) {
      return;
    }

    await runAction(`unban-user-${selectedUser.id}`, async () => {
      await unbanAdminUser(token, selectedUser.id);
      await Promise.all([
        refreshOverview(token),
        refreshUsers(token, deferredQuery),
      ]);
      const nextUser = await getAdminUser(token, selectedUser.id);
      setSelectedUser(nextUser.data);
      setStatusMessage(
        `User ${formatWallet(selectedUser.walletAddress)} unbanned.`,
      );
    });
  }, [
    deferredQuery,
    refreshOverview,
    refreshUsers,
    runAction,
    selectedUser,
    token,
  ]);

  const statCards = useMemo(() => {
    const stats = overview?.stats;
    return STAT_META.map((item) => ({
      ...item,
      value: stats ? String(stats[item.key]) : "-",
    }));
  }, [overview?.stats]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top + 12}
    >
      <LinearGradient
        colors={[palette.bg, palette.bgAlt, "#091426"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={styles.glowPrimary} />
      <View pointerEvents="none" style={styles.glowSecondary} />

      <View style={[styles.frame, isStacked && styles.frameStacked]}>
        <LinearGradient
          colors={["rgba(24,34,62,0.96)", "rgba(13,20,39,0.98)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.sidebar, isStacked && styles.sidebarStacked]}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>AD</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>Anonymous Admin</Text>
              <Text style={styles.brandSubtitle}>Moderation console</Text>
            </View>
          </View>

          <View style={[styles.navList, isStacked && styles.navListStacked]}>
            {NAV_ITEMS.map((item, index) => (
              <View
                key={item.label}
                style={[styles.navItem, index === 0 && styles.navItemActive]}
              >
                <View
                  style={[
                    styles.navGlyphWrap,
                    index === 0 && styles.navGlyphWrapActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.navGlyph,
                      index === 0 && styles.navGlyphActive,
                    ]}
                  >
                    {item.glyph}
                  </Text>
                </View>
                <Text
                  style={[styles.navText, index === 0 && styles.navTextActive]}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          {!isStacked ? (
            <View style={styles.sidebarFoot}>
              <Text style={styles.sidebarFootText}>Connected API</Text>
              <Text style={styles.sidebarFootValue}>{API_ORIGIN}</Text>
            </View>
          ) : null}
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.topBar, isCompact && styles.topBarStacked]}>
            <View>
              <Text style={styles.pageTitle}>Welcome, Admin</Text>
              <Text style={styles.pageSubtitle}>
                {access?.walletAddress
                  ? `wallet: ${formatWallet(access.walletAddress)}`
                  : `wallet: ${formatWallet(address)}`}
              </Text>
            </View>

            <View style={styles.topActions}>
              {canReturnToApp ? (
                <Pressable style={styles.ghostButton} onPress={returnToApp}>
                  <Text style={styles.ghostButtonText}>Back to App</Text>
                </Pressable>
              ) : null}

              {token && access?.isAdmin ? (
                <Pressable
                  style={styles.ghostButton}
                  onPress={() => {
                    void runAction("refresh", async () => {
                      await Promise.all([
                        refreshOverview(token),
                        refreshUsers(token, deferredQuery),
                      ]);
                      if (selectedUserId) {
                        const response = await getAdminUser(
                          token,
                          selectedUserId,
                        );
                        setSelectedUser(response.data);
                      }
                      setStatusMessage("Dashboard refreshed.");
                    });
                  }}
                >
                  <Text style={styles.ghostButtonText}>Refresh</Text>
                </Pressable>
              ) : null}

              {isConnected ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => void disconnectWallet()}
                >
                  <Text style={styles.primaryButtonText}>Logout</Text>
                  <Text style={styles.buttonSuffix}>OUT</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => void connectWallet()}
                >
                  <Text style={styles.primaryButtonText}>Connect Wallet</Text>
                  <Text style={styles.buttonSuffix}>WEB3</Text>
                </Pressable>
              )}
            </View>
          </View>

          {error || screenError || statusMessage ? (
            <View
              style={[
                styles.banner,
                (error || screenError) && styles.bannerError,
              ]}
            >
              <View
                style={[
                  styles.bannerBadge,
                  error || screenError
                    ? styles.bannerBadgeError
                    : styles.bannerBadgeSuccess,
                ]}
              >
                <Text style={styles.bannerBadgeText}>
                  {bannerLabel(Boolean(error || screenError))}
                </Text>
              </View>
              <Text style={styles.bannerText}>
                {error || screenError || statusMessage}
              </Text>
            </View>
          ) : null}

          {!isConnected ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateEyebrow}>Admin Access</Text>
              <Text style={styles.stateTitle}>
                Connect the same wallet system your app uses
              </Text>
              <Text style={styles.stateBody}>
                This admin page is now wired to your app backend. Sign in with a
                wallet listed in ADMIN_WALLETS on the backend.
              </Text>
              <Pressable
                style={styles.stateButton}
                onPress={() => void connectWallet()}
              >
                <Text style={styles.stateButtonText}>Connect wallet</Text>
              </Pressable>
            </View>
          ) : isAuthenticating && !access ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={palette.text} />
              <Text style={styles.stateTitle}>Restoring admin session</Text>
            </View>
          ) : access && !access.isAdmin ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateEyebrow}>Access Denied</Text>
              <Text style={styles.stateTitle}>
                {formatWallet(access.walletAddress)} is not an admin wallet
              </Text>
              <Text style={styles.stateBody}>
                Add this wallet to the backend ADMIN_WALLETS environment
                variable, then reconnect.
              </Text>
            </View>
          ) : loading && !overview ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={palette.text} />
              <Text style={styles.stateTitle}>Loading moderation data</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsGrid}>
                {statCards.map((card) => (
                  <View
                    key={card.key}
                    style={[
                      styles.statCard,
                      isCompact && styles.statCardCompact,
                    ]}
                  >
                    <View style={styles.statHeader}>
                      <Text style={styles.statLabel}>{card.label}</Text>
                      <View
                        style={[
                          styles.statIconWrap,
                          { backgroundColor: `${card.accent}24` },
                        ]}
                      >
                        <Text
                          style={[styles.statIconText, { color: card.accent }]}
                        >
                          {card.glyph}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.statValue}>{card.value}</Text>
                  </View>
                ))}
              </View>

              <View
                style={[
                  styles.dashboardGrid,
                  isStacked && styles.dashboardGridStacked,
                ]}
              >
                <View style={styles.primaryColumn}>
                  <View style={styles.panel}>
                    <View style={styles.panelHeader}>
                      <Text style={styles.panelTitle}>Recent Posts</Text>
                      <Text style={styles.panelMeta}>Live backend data</Text>
                    </View>
                    {overview?.recentPosts.length ? (
                      overview.recentPosts.map((post: AdminRecentPost) => (
                        <View
                          key={post.id}
                          style={[
                            styles.rowCard,
                            isCompact && styles.rowCardCompact,
                          ]}
                        >
                          <View style={styles.rowMain}>
                            <Text style={styles.rowTitle}>
                              {formatWallet(post.walletAddress)}
                            </Text>
                            <Text style={styles.rowBody} numberOfLines={2}>
                              {post.body}
                            </Text>
                            <Text style={styles.rowMeta}>
                              {formatDate(post.createdAt)}
                            </Text>
                          </View>
                          <View style={styles.rowActions}>
                            <Pressable
                              style={[styles.miniButton, styles.dangerButton]}
                              onPress={() => void handleDeletePost(post)}
                              disabled={
                                pendingAction === `delete-post-${post.id}`
                              }
                            >
                              <Text style={styles.miniButtonText}>
                                {pendingAction === `delete-post-${post.id}`
                                  ? "Working..."
                                  : "Delete"}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>
                        No recent posts available.
                      </Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.doublePanelRow,
                      isCompact && styles.doublePanelRowStacked,
                    ]}
                  >
                    <View style={[styles.panel, styles.flexPanel]}>
                      <View style={styles.panelHeader}>
                        <Text style={styles.panelTitle}>Reports</Text>
                        <Text style={styles.panelMeta}>
                          {overview?.reports.length ?? 0} open
                        </Text>
                      </View>
                      {overview?.reports.length ? (
                        overview.reports.map((report: AdminReport) => (
                          <View key={report.id} style={styles.rowCard}>
                            <View style={styles.rowMain}>
                              <Text style={styles.rowTitle}>
                                Post #{report.postId}
                              </Text>
                              <Text style={styles.rowBody} numberOfLines={2}>
                                {report.reason}
                              </Text>
                              <Text style={styles.rowMeta}>
                                reporter {formatWallet(report.reporterWallet)} |
                                author {formatWallet(report.authorWallet)}
                              </Text>
                            </View>
                            <View style={styles.rowActions}>
                              <Pressable
                                style={[
                                  styles.miniButton,
                                  styles.successButton,
                                ]}
                                onPress={() => void handleResolveReport(report)}
                                disabled={
                                  pendingAction ===
                                  `resolve-report-${report.id}`
                                }
                              >
                                <Text style={styles.miniButtonText}>
                                  {pendingAction ===
                                  `resolve-report-${report.id}`
                                    ? "Working..."
                                    : "Resolve"}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>No open reports.</Text>
                      )}
                    </View>

                    <View style={[styles.panel, styles.flexPanel]}>
                      <View style={styles.panelHeader}>
                        <Text style={styles.panelTitle}>
                          Admin Activity Log
                        </Text>
                        <Text style={styles.panelMeta}>Audit trail</Text>
                      </View>
                      {overview?.activity.length ? (
                        overview.activity.map((item: AdminActivityItem) => (
                          <View key={item.id} style={styles.logRow}>
                            <View style={styles.logDot} />
                            <View style={styles.logCopy}>
                              <Text style={styles.rowTitle}>
                                {formatWallet(item.adminWallet)}
                              </Text>
                              <Text style={styles.rowBody} numberOfLines={2}>
                                {buildActivityNote(item)}
                              </Text>
                            </View>
                            <Text style={styles.logTime}>
                              {formatDate(item.createdAt)}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>
                          No admin activity recorded yet.
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.sideColumn}>
                  <View style={styles.panel}>
                    <View style={styles.panelHeader}>
                      <Text style={styles.panelTitle}>User Management</Text>
                      <Text style={styles.panelMeta}>Search and moderate</Text>
                    </View>
                    <View style={styles.searchBar}>
                      <Text style={styles.searchGlyph}>Q</Text>
                      <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search wallet or display name"
                        placeholderTextColor={palette.muted}
                        style={styles.searchInput}
                      />
                    </View>

                    <View style={styles.userList}>
                      {usersLoading ? (
                        <ActivityIndicator color={palette.text} />
                      ) : users.length ? (
                        users.map((user) => (
                          <Pressable
                            key={user.id}
                            onPress={() => setSelectedUserId(user.id)}
                            style={[
                              styles.userListItem,
                              selectedUserId === user.id &&
                                styles.userListItemActive,
                            ]}
                          >
                            <View>
                              <Text style={styles.rowTitle}>
                                {formatWallet(user.walletAddress)}
                              </Text>
                              <Text style={styles.rowMeta}>
                                {user.postCount} posts | {user.commentCount}{" "}
                                comments
                              </Text>
                            </View>
                            {user.isBanned ? (
                              <View style={styles.statusPillDanger}>
                                <Text style={styles.statusPillText}>
                                  Banned
                                </Text>
                              </View>
                            ) : null}
                          </Pressable>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>No users found.</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.panel}>
                    <View style={styles.panelHeader}>
                      <Text style={styles.panelTitle}>Selected User</Text>
                      <Text style={styles.panelMeta}>Live profile</Text>
                    </View>
                    {selectedUserLoading ? (
                      <ActivityIndicator color={palette.text} />
                    ) : selectedUser ? (
                      <>
                        <Text style={styles.detailWallet}>
                          {selectedUser.walletAddress}
                        </Text>
                        <Text style={styles.detailMeta}>
                          Created {formatDate(selectedUser.createdAt)}
                        </Text>
                        <View style={styles.detailGrid}>
                          <View style={styles.detailCard}>
                            <Text style={styles.detailLabel}>Posts</Text>
                            <Text style={styles.detailValue}>
                              {selectedUser.postCount}
                            </Text>
                          </View>
                          <View style={styles.detailCard}>
                            <Text style={styles.detailLabel}>Comments</Text>
                            <Text style={styles.detailValue}>
                              {selectedUser.commentCount}
                            </Text>
                          </View>
                          <View style={styles.detailCard}>
                            <Text style={styles.detailLabel}>Votes</Text>
                            <Text style={styles.detailValue}>
                              {selectedUser.voteCount ?? 0}
                            </Text>
                          </View>
                        </View>
                        {selectedUser.isBanned ? (
                          <View style={styles.warningNote}>
                            <Text style={styles.warningTitle}>Banned</Text>
                            <Text style={styles.warningText}>
                              {selectedUser.bannedReason ||
                                "No reason recorded."}
                            </Text>
                          </View>
                        ) : null}
                        <View style={styles.managementActions}>
                          {selectedUser.isBanned ? (
                            <Pressable
                              style={[
                                styles.managementButton,
                                styles.successButton,
                              ]}
                              onPress={() => void handleUnbanUser()}
                              disabled={
                                pendingAction ===
                                `unban-user-${selectedUser.id}`
                              }
                            >
                              <Text style={styles.managementButtonText}>
                                {pendingAction ===
                                `unban-user-${selectedUser.id}`
                                  ? "Working..."
                                  : "Unban User"}
                              </Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              style={[
                                styles.managementButton,
                                styles.dangerButton,
                              ]}
                              onPress={() => void handleBanUser()}
                              disabled={
                                pendingAction === `ban-user-${selectedUser.id}`
                              }
                            >
                              <Text style={styles.managementButtonText}>
                                {pendingAction === `ban-user-${selectedUser.id}`
                                  ? "Working..."
                                  : "Ban User"}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </>
                    ) : (
                      <Text style={styles.emptyText}>
                        Pick a user to inspect.
                      </Text>
                    )}
                  </View>

                  <View style={styles.panel}>
                    <View style={styles.panelHeader}>
                      <Text style={styles.panelTitle}>Banned Users</Text>
                      <Text style={styles.panelMeta}>
                        {overview?.bannedUsers.length ?? 0} shown
                      </Text>
                    </View>
                    {overview?.bannedUsers.length ? (
                      overview.bannedUsers.map(
                        (user: AdminOverview["bannedUsers"][number]) => (
                          <Pressable
                            key={user.id}
                            style={styles.bannedItem}
                            onPress={() => setSelectedUserId(user.id)}
                          >
                            <View style={styles.bannedGlyphWrap}>
                              <Text style={styles.bannedGlyph}>BN</Text>
                            </View>
                            <View style={styles.bannedCopy}>
                              <Text style={styles.rowTitle}>
                                {formatWallet(user.walletAddress)}
                              </Text>
                              <Text style={styles.rowMeta}>
                                {user.bannedReason || "Banned by admin"}
                              </Text>
                            </View>
                          </Pressable>
                        ),
                      )
                    ) : (
                      <Text style={styles.emptyText}>No banned users.</Text>
                    )}
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  glowPrimary: {
    position: "absolute",
    top: 40,
    right: -70,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(91, 124, 255, 0.18)",
  },
  glowSecondary: {
    position: "absolute",
    bottom: 60,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(69, 102, 180, 0.18)",
  },
  frame: {
    flex: 1,
    flexDirection: "row",
    gap: 18,
    padding: 18,
  },
  frameStacked: {
    flexDirection: "column",
  },
  sidebar: {
    width: 230,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: palette.stroke,
    justifyContent: "space-between",
  },
  sidebarStacked: {
    width: "100%",
    gap: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandIconText: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  brandTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
  },
  brandSubtitle: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 3,
  },
  navList: {
    marginTop: 24,
    gap: 8,
    flex: 1,
  },
  navListStacked: {
    marginTop: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 0,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  navGlyphWrap: {
    minWidth: 30,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
  },
  navGlyphWrapActive: {
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  navGlyph: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  navGlyphActive: {
    color: palette.text,
  },
  navItemActive: {
    backgroundColor: "rgba(91, 124, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(120, 146, 255, 0.24)",
  },
  navText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  navTextActive: {
    color: palette.text,
  },
  sidebarFoot: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: palette.stroke,
  },
  sidebarFootText: {
    color: palette.muted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sidebarFootValue: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    gap: 16,
    paddingBottom: 26,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  topBarStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  pageTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "800",
  },
  pageSubtitle: {
    color: palette.muted,
    marginTop: 4,
    fontSize: 13,
  },
  topActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: palette.stroke,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: palette.text,
    fontWeight: "700",
    fontSize: 13,
  },
  buttonSuffix: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  ghostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(91,124,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(120,146,255,0.22)",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
  },
  ghostButtonText: {
    color: palette.text,
    fontWeight: "700",
    fontSize: 13,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(74,193,143,0.12)",
    borderWidth: 1,
    borderColor: "rgba(74,193,143,0.22)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerError: {
    backgroundColor: "rgba(255,97,87,0.10)",
    borderColor: "rgba(255,97,87,0.18)",
  },
  bannerText: {
    color: palette.text,
    fontSize: 13,
    flex: 1,
  },
  bannerBadge: {
    minWidth: 36,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center",
  },
  bannerBadgeError: {
    backgroundColor: "rgba(255,97,87,0.18)",
  },
  bannerBadgeSuccess: {
    backgroundColor: "rgba(74,193,143,0.18)",
  },
  bannerBadgeText: {
    color: palette.text,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  stateCard: {
    backgroundColor: palette.panelStrong,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.stroke,
    padding: 28,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  stateEyebrow: {
    color: palette.muted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  stateTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    maxWidth: 620,
  },
  stateBody: {
    color: palette.muted,
    fontSize: 14,
    textAlign: "center",
    maxWidth: 620,
    lineHeight: 21,
  },
  stateButton: {
    backgroundColor: palette.blue,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  stateButtonText: {
    color: palette.text,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  statCard: {
    flexBasis: "24%",
    flexGrow: 1,
    minWidth: 220,
    backgroundColor: palette.panelStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.stroke,
    padding: 16,
  },
  statCardCompact: {
    minWidth: 170,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  statValue: {
    color: palette.text,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 14,
  },
  dashboardGrid: {
    flexDirection: "row",
    gap: 16,
  },
  dashboardGridStacked: {
    flexDirection: "column",
  },
  primaryColumn: {
    flex: 1.7,
    gap: 16,
  },
  sideColumn: {
    flex: 1,
    gap: 16,
  },
  panel: {
    backgroundColor: palette.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.stroke,
    padding: 16,
  },
  flexPanel: {
    flex: 1,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  panelTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "700",
  },
  panelMeta: {
    color: palette.muted,
    fontSize: 12,
  },
  rowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(157, 173, 203, 0.10)",
  },
  rowCardCompact: {
    flexDirection: "column",
  },
  rowMain: {
    flex: 1,
    gap: 4,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  rowTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  rowBody: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  rowMeta: {
    color: palette.muted,
    fontSize: 11,
  },
  miniButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  miniButtonText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
  },
  successButton: {
    backgroundColor: palette.green,
  },
  dangerButton: {
    backgroundColor: palette.red,
  },
  doublePanelRow: {
    flexDirection: "row",
    gap: 16,
  },
  doublePanelRowStacked: {
    flexDirection: "column",
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(157, 173, 203, 0.10)",
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.amber,
  },
  logCopy: {
    flex: 1,
    gap: 4,
  },
  logTime: {
    color: palette.muted,
    fontSize: 11,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: palette.panelSoft,
    borderWidth: 1,
    borderColor: palette.stroke,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchGlyph: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "800",
    width: 16,
    textAlign: "center",
  },
  searchInput: {
    flex: 1,
    color: palette.text,
    padding: 0,
  },
  userList: {
    gap: 8,
  },
  userListItem: {
    backgroundColor: palette.panelSoft,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  userListItemActive: {
    borderColor: "rgba(120, 146, 255, 0.34)",
    backgroundColor: "rgba(91,124,255,0.16)",
  },
  statusPillDanger: {
    backgroundColor: "rgba(255,97,87,0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "700",
  },
  detailWallet: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  detailMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailCard: {
    flexGrow: 1,
    minWidth: 92,
    backgroundColor: palette.panelSoft,
    borderRadius: 14,
    padding: 12,
  },
  detailLabel: {
    color: palette.muted,
    fontSize: 11,
  },
  detailValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
  },
  warningNote: {
    backgroundColor: "rgba(255,97,87,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,97,87,0.20)",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  warningTitle: {
    color: palette.text,
    fontWeight: "700",
    fontSize: 12,
  },
  warningText: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 6,
  },
  managementActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  managementButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  managementButtonText: {
    color: palette.text,
    fontWeight: "700",
    fontSize: 13,
  },
  bannedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: palette.panelSoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  bannedGlyphWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannedGlyph: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  bannedCopy: {
    flex: 1,
    gap: 4,
  },
  emptyText: {
    color: palette.muted,
    fontSize: 13,
    paddingVertical: 10,
  },
});

export default AdminDashboard;
