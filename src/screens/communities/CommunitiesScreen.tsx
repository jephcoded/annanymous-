import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
    type GestureResponderEvent,
} from "react-native";

import ScreenSurface from "../../components/ScreenSurface";
import { useWallet } from "../../contexts/WalletContext";
import {
    Community,
    createCommunityInvite,
    getCommunities,
    joinCommunity,
    joinCommunityByInvite,
} from "../../services/api";
import { COLORS, TYPOGRAPHY } from "../../theme";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";

type CommunityStackParamList = {
  Communities: undefined;
  CreateCommunity: undefined;
  CommunityChat: { communityId: number; communityName?: string };
};

const COMMUNITY_TABS = ["Groups", "Topics", "People"] as const;
type CommunityTab = (typeof COMMUNITY_TABS)[number];

const formatCompactCount = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  }

  return `${value}`;
};

const getCommunityVisual = (name: string) => {
  const label = name.toLowerCase();

  if (
    label.includes("student") ||
    label.includes("school") ||
    label.includes("campus")
  ) {
    return {
      bg: "rgba(241,226,205,0.16)",
      icon: "school-outline" as const,
      color: "#F1E2CD",
    };
  }

  if (label.includes("relationship") || label.includes("love")) {
    return {
      bg: "rgba(255,77,147,0.16)",
      icon: "heart" as const,
      color: "#FF4D93",
    };
  }

  if (
    label.includes("tech") ||
    label.includes("code") ||
    label.includes("coder")
  ) {
    return {
      bg: "rgba(126,248,208,0.16)",
      icon: "code-slash" as const,
      color: "#7EF8D0",
    };
  }

  return {
    bg: "rgba(139,61,255,0.18)",
    icon: "airplane-outline" as const,
    color: COLORS.primary,
  };
};

const CommunitiesScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<CommunityStackParamList>>();
  const { token } = useWallet();
  const { width } = useWindowDimensions();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [inviteCodeDraft, setInviteCodeDraft] = useState("");
  const [showInviteEntry, setShowInviteEntry] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CommunityTab>("Groups");
  const isCompact = width < 380;

  const fetchCommunities = useCallback(async () => {
    if (!token) {
      setCommunities([]);
      setStatusMessage("Your session expired. Log in again to continue.");
      setLoading(false);
      setRefreshing(false);
      return [] as Community[];
    }

    try {
      const response = await getCommunities(token);
      setCommunities(response.data);
      setStatusMessage(
        response.data.length
          ? null
          : "No community rooms yet. Create one or join with an invite code.",
      );
      return response.data;
    } catch (error) {
      setStatusMessage(
        getFriendlyErrorMessage(error, "Unable to load communities."),
      );
      return [] as Community[];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchCommunities();
    }, [fetchCommunities]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCommunities();
  }, [fetchCommunities]);

  const openCreateFlow = useCallback(() => {
    navigation.navigate("CreateCommunity");
  }, [navigation]);

  const handleJoinByCode = useCallback(async () => {
    const inviteCode = inviteCodeDraft.trim();
    if (!inviteCode) {
      setStatusMessage("Enter an invite code before joining.");
      return;
    }

    if (!token) {
      setStatusMessage("Your session expired. Log in again to continue.");
      return;
    }

    setInviteSubmitting(true);
    try {
      const response = await joinCommunityByInvite(token, inviteCode);
      await fetchCommunities();
      setInviteCodeDraft("");
      setShowInviteEntry(false);

      const membershipStatus =
        typeof response.data.status === "string"
          ? response.data.status.toLowerCase()
          : "pending";

      setStatusMessage(
        membershipStatus === "active"
          ? "Invite accepted. Your room is now available in the list."
          : "Invite submitted. The room owner can approve you next.",
      );
    } catch (error) {
      setStatusMessage(
        getFriendlyErrorMessage(error, "Unable to join with that invite code."),
      );
    } finally {
      setInviteSubmitting(false);
    }
  }, [fetchCommunities, inviteCodeDraft, token]);

  const handleShareInvite = useCallback(
    async (community: Community) => {
      if (!token) {
        return;
      }

      try {
        const response = await createCommunityInvite(token, {
          communityId: community.id,
        });
        const generatedCode =
          response.data.inviteCode || community.inviteCode || "";

        await Share.share({
          message: `Join ${community.name} on Ananymous with invite code: ${generatedCode}`,
        });

        setStatusMessage(`Invite ready for ${community.name}.`);
      } catch (error) {
        Alert.alert(
          "Invite failed",
          getFriendlyErrorMessage(error, "Could not generate an invite."),
        );
      }
    },
    [token],
  );

  const trendingTopics = useMemo(
    () =>
      [...communities]
        .sort((left, right) => right.memberCount - left.memberCount)
        .slice(0, 4)
        .map((community) => ({
          id: community.id,
          label: community.name.replace(/\s+/g, ""),
          meta: `${formatCompactCount(Math.max(community.memberCount * 58, 980))} posts`,
        })),
    [communities],
  );

  const visibleGroups = useMemo(() => {
    if (activeTab === "Topics") {
      return [...communities].sort(
        (left, right) => right.memberCount - left.memberCount,
      );
    }

    if (activeTab === "People") {
      return [...communities].sort(
        (left, right) => right.memberCount - left.memberCount,
      );
    }

    return communities;
  }, [activeTab, communities]);

  const groupsPreview = useMemo(
    () => visibleGroups.slice(0, 4),
    [visibleGroups],
  );

  const handleOpenOrJoin = useCallback(
    async (community: Community) => {
      if (!token) {
        setStatusMessage("Your session expired. Log in again to continue.");
        return;
      }

      if (community.status === "active" || community.isAdmin) {
        navigation.navigate("CommunityChat", {
          communityId: community.id,
          communityName: community.name,
        });
        return;
      }

      if (community.status === "pending") {
        setStatusMessage(`${community.name} is waiting for approval.`);
        return;
      }

      setJoiningId(community.id);
      try {
        await joinCommunity(token, community.id);
        setCommunities((current) =>
          current.map((item) =>
            item.id === community.id
              ? { ...item, status: "active", memberCount: item.memberCount + 1 }
              : item,
          ),
        );
        navigation.navigate("CommunityChat", {
          communityId: community.id,
          communityName: community.name,
        });
      } catch (error) {
        setStatusMessage(
          getFriendlyErrorMessage(error, "Unable to join community."),
        );
      } finally {
        setJoiningId(null);
      }
    },
    [navigation, token],
  );

  return (
    <ScreenSurface style={[styles.surface, isCompact && styles.surfaceCompact]}>
      <FlatList
        data={activeTab === "Groups" ? groupsPreview : []}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.heroCard}>
              <View
                style={[
                  styles.headerTopRow,
                  isCompact && styles.headerTopRowCompact,
                ]}
              >
                <View>
                  <Text style={styles.headerEyebrow}>Community</Text>
                  <Text
                    style={[
                      styles.headerTitle,
                      isCompact && styles.headerTitleCompact,
                    ]}
                  >
                    Find your people
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    Rooms, trends, and chat spaces styled to match the rest of
                    the app.
                  </Text>
                </View>

                <View
                  style={[
                    styles.headerActions,
                    isCompact && styles.headerActionsCompact,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.headerIconBtn}
                    onPress={onRefresh}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={18}
                      color={COLORS.accent}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerIconBtn}
                    onPress={() => navigation.navigate("CreateCommunity")}
                  >
                    <Ionicons
                      name="add-outline"
                      size={18}
                      color={COLORS.accent}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaPill}>
                  <Ionicons
                    name="people-outline"
                    size={13}
                    color={COLORS.primary}
                  />
                  <Text style={styles.heroMetaText}>
                    {communities.length} active rooms
                  </Text>
                </View>
                <View style={styles.heroMetaPill}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={13}
                    color={COLORS.secondary}
                  />
                  <Text style={styles.heroMetaText}>Anonymous by default</Text>
                </View>
              </View>

              <View style={styles.heroCtaRow}>
                <TouchableOpacity
                  style={styles.heroPrimaryCta}
                  onPress={openCreateFlow}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={COLORS.text}
                  />
                  <Text style={styles.heroPrimaryCtaText}>Create room</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.heroSecondaryCta}
                  onPress={() => setShowInviteEntry((current) => !current)}
                >
                  <Ionicons
                    name="key-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.heroSecondaryCtaText}>Join by code</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showInviteEntry ? (
              <View style={styles.inviteCard}>
                <Text style={styles.inviteTitle}>Join with invite code</Text>
                <Text style={styles.inviteSubtitle}>
                  Paste the room code you were given and we will request access.
                </Text>
                <TextInput
                  value={inviteCodeDraft}
                  onChangeText={setInviteCodeDraft}
                  placeholder="Paste invite code"
                  placeholderTextColor={COLORS.gray}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.inviteInput}
                />
                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    style={styles.inviteGhostButton}
                    onPress={() => {
                      setShowInviteEntry(false);
                      setInviteCodeDraft("");
                    }}
                  >
                    <Text style={styles.inviteGhostButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.invitePrimaryButton}
                    onPress={() => void handleJoinByCode()}
                    disabled={inviteSubmitting}
                  >
                    {inviteSubmitting ? (
                      <ActivityIndicator size="small" color={COLORS.text} />
                    ) : (
                      <Text style={styles.invitePrimaryButtonText}>
                        Join room
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View style={[styles.tabsRow, isCompact && styles.tabsRowCompact]}>
              {COMMUNITY_TABS.map((tab) => {
                const active = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={styles.tabButton}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text
                      style={[
                        styles.tabButtonText,
                        active && styles.tabButtonTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                    <View
                      style={[
                        styles.tabIndicator,
                        active && styles.tabIndicatorActive,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {statusMessage ? (
              <View style={styles.statusBanner}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={COLORS.secondary}
                />
                <Text style={styles.statusText}>{statusMessage}</Text>
              </View>
            ) : null}

            <View
              style={[
                styles.sectionHeader,
                isCompact && styles.sectionHeaderCompact,
              ]}
            >
              <Text style={styles.sectionTitle}>
                {activeTab === "Groups"
                  ? "Popular Groups"
                  : activeTab === "Topics"
                    ? "Trending Topics"
                    : "Popular People"}
              </Text>
              <Text style={styles.sectionMeta}>See all</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={styles.loading}
            />
          ) : activeTab === "Groups" ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="people-outline"
                size={30}
                color={COLORS.primary}
              />
              <Text style={styles.emptyTitle}>No communities yet</Text>
              <Text style={styles.emptyText}>
                Create a room and share the code.
              </Text>
              <View style={styles.emptyActionRow}>
                <TouchableOpacity
                  style={styles.heroPrimaryCta}
                  onPress={openCreateFlow}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={COLORS.text}
                  />
                  <Text style={styles.heroPrimaryCtaText}>Create room</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.heroSecondaryCta}
                  onPress={() => setShowInviteEntry(true)}
                >
                  <Ionicons
                    name="key-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.heroSecondaryCtaText}>Use invite</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.footerSection}>
              {trendingTopics.map(
                (topic: { id: number; label: string; meta: string }) => (
                  <View
                    key={`${activeTab}-${topic.id}`}
                    style={styles.topicRow}
                  >
                    <View style={styles.topicBullet}>
                      <Ionicons
                        name={
                          activeTab === "People"
                            ? "person-outline"
                            : "trending-up-outline"
                        }
                        size={14}
                        color={COLORS.text}
                      />
                    </View>
                    <View style={styles.topicCopy}>
                      <Text style={styles.topicName}>
                        {activeTab === "People"
                          ? topic.label
                          : `#${topic.label}`}
                      </Text>
                      <Text style={styles.topicMeta}>{topic.meta}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.gray}
                    />
                  </View>
                ),
              )}
            </View>
          )
        }
        ListFooterComponent={
          activeTab === "Groups" && trendingTopics.length ? (
            <View style={styles.footerSection}>
              <View
                style={[
                  styles.sectionHeader,
                  isCompact && styles.sectionHeaderCompact,
                ]}
              >
                <Text style={styles.sectionTitle}>Trending Topics</Text>
                <Text style={styles.sectionMeta}>See all</Text>
              </View>
              {trendingTopics.map(
                (topic: { id: number; label: string; meta: string }) => (
                  <View key={topic.id} style={styles.topicRow}>
                    <View style={styles.topicBullet}>
                      <Ionicons
                        name="pricetag-outline"
                        size={14}
                        color={COLORS.text}
                      />
                    </View>
                    <View style={styles.topicCopy}>
                      <Text style={styles.topicName}>#{topic.label}</Text>
                      <Text style={styles.topicMeta}>{topic.meta}</Text>
                    </View>
                    <Ionicons
                      name="trending-up-outline"
                      size={16}
                      color="#35E38A"
                    />
                  </View>
                ),
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isPending = item.status === "pending";
          const isAdmin = Boolean(item.isAdmin);
          const isActive = item.status === "active" || isAdmin;
          const actionLabel = isPending
            ? "Pending"
            : isAdmin
              ? "Share"
              : isActive
                ? "Open"
                : "Join";
          const visual = getCommunityVisual(item.name);

          return (
            <TouchableOpacity
              style={[
                styles.communityCard,
                isCompact && styles.communityCardCompact,
              ]}
              activeOpacity={0.9}
              onPress={() => void handleOpenOrJoin(item)}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.identityRow}>
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: visual.bg,
                        borderColor: "transparent",
                      },
                    ]}
                  >
                    <Ionicons
                      name={visual.icon}
                      size={18}
                      color={visual.color}
                    />
                  </View>
                  <View style={styles.identityCopy}>
                    <Text style={styles.communityName}>{item.name}</Text>
                    <Text style={styles.communityMeta}>
                      {formatCompactCount(Math.max(item.memberCount, 1))}{" "}
                      members
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.joinPill,
                    isCompact && styles.joinPillCompact,
                    isPending && styles.joinPillDisabled,
                  ]}
                  disabled={isPending || joiningId === item.id}
                  onPress={(event: GestureResponderEvent) => {
                    event.stopPropagation();

                    if (isAdmin) {
                      void handleShareInvite(item);
                      return;
                    }

                    void handleOpenOrJoin(item);
                  }}
                >
                  {joiningId === item.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.joinPillText}>{actionLabel}</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text
                style={
                  item.description
                    ? styles.description
                    : styles.descriptionMuted
                }
              >
                {item.description ||
                  "Talk, gist, and connect with your people."}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  surface: { flex: 1, padding: 16 },
  surfaceCompact: { paddingHorizontal: 14 },
  content: { paddingBottom: 140 },
  heroCard: {
    paddingBottom: 18,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  headerTopRowCompact: {
    alignItems: "flex-start",
  },
  headerEyebrow: {
    color: COLORS.primary,
    ...TYPOGRAPHY.meta,
    marginBottom: 6,
  },
  headerTitle: { color: COLORS.text, ...TYPOGRAPHY.heading },
  headerTitleCompact: {
    fontSize: 24,
    lineHeight: 30,
  },
  headerSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    marginTop: 6,
    maxWidth: 280,
  },
  headerActions: { flexDirection: "row", gap: 10 },
  headerActionsCompact: { gap: 8 },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  heroCtaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  heroMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    backgroundColor: "#101015",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroMetaText: { color: COLORS.text, ...TYPOGRAPHY.meta },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E0E12",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.22)",
  },
  heroPrimaryCta: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  heroPrimaryCtaText: {
    color: COLORS.text,
    ...TYPOGRAPHY.button,
  },
  heroSecondaryCta: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.22)",
    backgroundColor: "#0E0E12",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  heroSecondaryCtaText: {
    color: COLORS.text,
    ...TYPOGRAPHY.button,
  },
  inviteCard: {
    paddingBottom: 16,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  inviteTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
    marginBottom: 6,
  },
  inviteSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    marginBottom: 12,
  },
  inviteInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#101015",
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    ...TYPOGRAPHY.label,
  },
  inviteActions: {
    flexDirection: "row",
    gap: 10,
  },
  inviteGhostButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#101015",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteGhostButtonText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.button,
  },
  invitePrimaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  invitePrimaryButtonText: {
    color: COLORS.text,
    ...TYPOGRAPHY.button,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  tabsRowCompact: { gap: 16 },
  tabButton: { paddingBottom: 10 },
  tabButtonText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    fontSize: 12,
  },
  tabButtonTextActive: { color: COLORS.text },
  tabIndicator: {
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
    marginTop: 8,
  },
  tabIndicatorActive: { backgroundColor: COLORS.primary },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0D0D11",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    marginBottom: 16,
  },
  statusText: { color: COLORS.text, ...TYPOGRAPHY.label, flex: 1 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  sectionHeaderCompact: {
    alignItems: "flex-start",
  },
  sectionTitle: { color: COLORS.text, ...TYPOGRAPHY.title },
  sectionMeta: { color: COLORS.primary, ...TYPOGRAPHY.meta },
  loading: { marginTop: 28 },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  emptyTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
    marginTop: 10,
    marginBottom: 6,
  },
  emptyText: { color: COLORS.gray, ...TYPOGRAPHY.label, textAlign: "center" },
  emptyActionRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 16,
  },
  communityCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  communityCardCompact: {
    paddingVertical: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  identityRow: { flexDirection: "row", gap: 12, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  identityCopy: { flex: 1 },
  communityName: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
    fontSize: 15,
    lineHeight: 19,
    marginBottom: 3,
  },
  communityMeta: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    fontSize: 10,
    lineHeight: 13,
    opacity: 0.92,
  },
  joinPill: {
    minWidth: 62,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  joinPillCompact: {
    minWidth: 54,
    paddingHorizontal: 12,
  },
  joinPillDisabled: {
    opacity: 0.55,
  },
  joinPillText: {
    color: "#FFFFFF",
    ...TYPOGRAPHY.meta,
    fontSize: 11,
    lineHeight: 14,
  },
  description: {
    color: "#ACA3BB",
    ...TYPOGRAPHY.label,
    fontSize: 11,
    lineHeight: 15,
  },
  descriptionMuted: {
    color: "#8F879E",
    ...TYPOGRAPHY.label,
    fontSize: 11,
    lineHeight: 15,
  },
  footerSection: {
    marginTop: 8,
    marginBottom: 18,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  topicBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E0E12",
  },
  topicCopy: { flex: 1 },
  topicName: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 1,
  },
  topicMeta: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    fontSize: 10,
    lineHeight: 13,
  },
});

export default CommunitiesScreen;
