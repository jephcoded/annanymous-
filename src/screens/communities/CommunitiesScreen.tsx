import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useState } from "react";
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
  View,
} from "react-native";

import HeroHeading from "../../components/HeroHeading";
import GuideModal from "../../components/GuideModal";
import ScreenSurface from "../../components/ScreenSurface";
import { useWallet } from "../../contexts/WalletContext";
import {
  Community,
  createCommunityInvite,
  getCommunities,
  joinCommunityByInvite,
} from "../../services/api";
import { COLORS, TYPOGRAPHY } from "../../theme";

type CommunityStackParamList = {
  Communities: undefined;
  CreateCommunity: undefined;
  CommunityChat: { communityId: number; communityName?: string };
};

const CommunitiesScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<CommunityStackParamList>>();
  const { token, isConnected } = useWallet();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inviteLoadingId, setInviteLoadingId] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchCommunities = useCallback(async () => {
    if (!token) {
      setCommunities([]);
      setStatusMessage("Connect your wallet to create, join, and chat in communities.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await getCommunities(token);
      setCommunities(response.data);
      setStatusMessage(
        response.data.length
          ? null
          : "No community rooms yet. Create one or join with an invite code.",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to load communities.",
      );
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

  const handleJoinByCode = useCallback(async () => {
    if (!token) {
      Alert.alert("Wallet required", "Connect your wallet to join a community.");
      return;
    }

    const normalizedCode = inviteCode.trim();
    if (!normalizedCode) {
      Alert.alert("Invite code needed", "Enter an invite code to join.");
      return;
    }

    setJoining(true);
    try {
      await joinCommunityByInvite(token, normalizedCode);
      setInviteCode("");
      setStatusMessage(
        "Invite accepted. If approval is required, your membership will stay pending until an admin activates it.",
      );
      await fetchCommunities();
    } catch (error) {
      Alert.alert(
        "Unable to join",
        error instanceof Error ? error.message : "Join request failed.",
      );
    } finally {
      setJoining(false);
    }
  }, [fetchCommunities, inviteCode, token]);

  const handleShareInvite = useCallback(
    async (community: Community) => {
      if (!token) {
        return;
      }

      setInviteLoadingId(community.id);
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
          error instanceof Error ? error.message : "Could not generate an invite.",
        );
      } finally {
        setInviteLoadingId(null);
      }
    },
    [token],
  );

  const heroStats = [
    {
      icon: "people-outline" as const,
      label: `${communities.length} rooms`,
      color: COLORS.primary,
    },
    {
      icon: "shield-checkmark-outline" as const,
      label: isConnected ? "Wallet ready" : "Connect to join",
      color: COLORS.secondary,
    },
    {
      icon: "paper-plane-outline" as const,
      label: "Invite-based access",
      color: COLORS.gray,
    },
  ];

  return (
    <ScreenSurface style={styles.surface}>
      <FlatList
        data={communities}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <HeroHeading
              title="Community"
              subtitle="Create private rooms, join with invite codes, and keep group chat in one simple place."
              ctaLabel="Create room"
              ctaIcon="add-circle-outline"
              onPressCta={() => navigation.navigate("CreateCommunity")}
              stats={heroStats}
            />
            <GuideModal
              guideKey="community"
              title="Community Guide"
              items={[
                "Tap Create room to create a new private community.",
                "Use Join with code when someone shares an invite code with you.",
                "Open a room to chat, and use invite sharing to bring in more people.",
                "The room creator becomes the first admin automatically.",
              ]}
            />

            <View style={styles.joinCard}>
              <Text style={styles.cardTitle}>Join with code</Text>
              <Text style={styles.cardSubtitle}>
                Paste a room code to request access and show up in the community list.
              </Text>
              <View style={styles.joinRow}>
                <TextInput
                  style={styles.joinInput}
                  placeholder="Enter invite code"
                  placeholderTextColor={COLORS.gray}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  editable={!joining}
                />
                <TouchableOpacity
                  style={[
                    styles.joinButton,
                    (!inviteCode.trim() || joining) && styles.joinButtonDisabled,
                  ]}
                  onPress={handleJoinByCode}
                  disabled={!inviteCode.trim() || joining}
                >
                  {joining ? (
                    <ActivityIndicator color={COLORS.text} size="small" />
                  ) : (
                    <Text style={styles.joinButtonText}>Join</Text>
                  )}
                </TouchableOpacity>
              </View>
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

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your rooms</Text>
              <Text style={styles.sectionMeta}>Tap a room to open chat</Text>
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
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons
                name="people-circle-outline"
                size={28}
                color={COLORS.primary}
              />
              <Text style={styles.emptyTitle}>No communities yet</Text>
              <Text style={styles.emptyText}>
                Create a room, share the code, and start chatting privately.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isPending = item.status === "pending";
          const isAdmin = Boolean(item.isAdmin);

          return (
            <TouchableOpacity
              style={styles.communityCard}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate("CommunityChat", {
                  communityId: item.id,
                  communityName: item.name,
                })
              }
            >
              <View style={styles.cardTopRow}>
                <View style={styles.identityRow}>
                  <View style={styles.avatar}>
                    <Ionicons
                      name="people-outline"
                      size={18}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.identityCopy}>
                    <Text style={styles.communityName}>{item.name}</Text>
                    <Text style={styles.communityMeta}>
                      {item.memberCount} members
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    isPending ? styles.pendingPill : styles.activePill,
                  ]}
                >
                  <Text style={styles.statusPillText}>
                    {isPending ? "Pending" : "Active"}
                  </Text>
                </View>
              </View>

              <Text
                style={item.description ? styles.description : styles.descriptionMuted}
              >
                {item.description ||
                  "No description yet. Open the room and start the conversation."}
              </Text>

              <View style={styles.footerRow}>
                <Text style={styles.inviteCode}>Code: {item.inviteCode}</Text>
                {isAdmin ? (
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => handleShareInvite(item)}
                    disabled={inviteLoadingId === item.id}
                  >
                    {inviteLoadingId === item.id ? (
                      <ActivityIndicator color={COLORS.text} size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="share-social-outline"
                          size={15}
                          color={COLORS.text}
                        />
                        <Text style={styles.shareButtonText}>Share invite</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.memberBadge}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={14}
                      color={COLORS.secondary}
                    />
                    <Text style={styles.memberBadgeText}>
                      {isPending ? "Awaiting approval" : "Member"}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  surface: { flex: 1, padding: 16 },
  content: { paddingBottom: 140 },
  joinCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: { color: COLORS.text, ...TYPOGRAPHY.section, marginBottom: 4 },
  cardSubtitle: { color: COLORS.gray, ...TYPOGRAPHY.label, marginBottom: 14 },
  joinRow: { flexDirection: "row", gap: 10 },
  joinInput: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...TYPOGRAPHY.label,
  },
  joinButton: {
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: `${COLORS.secondary}20`,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}35`,
    paddingHorizontal: 16,
  },
  joinButtonDisabled: { opacity: 0.55 },
  joinButtonText: { color: COLORS.text, ...TYPOGRAPHY.label },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 16,
  },
  statusText: { color: COLORS.text, ...TYPOGRAPHY.label, flex: 1 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: { color: COLORS.text, ...TYPOGRAPHY.title },
  sectionMeta: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  loading: { marginTop: 28 },
  emptyCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
    marginTop: 10,
    marginBottom: 6,
  },
  emptyText: { color: COLORS.gray, ...TYPOGRAPHY.label, textAlign: "center" },
  communityCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  identityRow: { flexDirection: "row", gap: 12, flex: 1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${COLORS.primary}18`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  identityCopy: { flex: 1 },
  communityName: { color: COLORS.text, ...TYPOGRAPHY.section, marginBottom: 2 },
  communityMeta: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  pendingPill: {
    backgroundColor: "rgba(251,191,36,0.12)",
    borderColor: "rgba(251,191,36,0.25)",
  },
  activePill: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: `${COLORS.primary}25`,
  },
  statusPillText: { color: COLORS.text, ...TYPOGRAPHY.meta },
  description: { color: COLORS.text, ...TYPOGRAPHY.label, marginBottom: 14 },
  descriptionMuted: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  inviteCode: { color: COLORS.secondary, ...TYPOGRAPHY.meta },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${COLORS.primary}18`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  shareButtonText: { color: COLORS.text, ...TYPOGRAPHY.meta },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberBadgeText: { color: COLORS.text, ...TYPOGRAPHY.meta },
});

export default CommunitiesScreen;
