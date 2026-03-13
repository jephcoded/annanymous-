import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import * as Animatable from "react-native-animatable";
import HeroHeading from "../components/HeroHeading";
import ScreenSurface from "../components/ScreenSurface";
import { useWallet } from "../contexts/WalletContext";
import { FeedPost, flagPost, getFeed, voteOnPost } from "../services/api";
import { buildActionRecord } from "../services/decentralized";
import { COLORS, TYPOGRAPHY } from "../theme";

const FALLBACK_STATUS = "Feed is syncing with the backend.";

const formatRelativeTime = (timestamp: string) => {
  const created = new Date(timestamp).getTime();
  const diffMinutes = Math.max(1, Math.floor((Date.now() - created) / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return `${Math.floor(diffMinutes / 1440)}d ago`;
};

type ActionPillProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  onPress?: () => void;
  disabled?: boolean;
};

const ActionPill = ({
  icon,
  label,
  value,
  color,
  onPress,
  disabled,
}: ActionPillProps) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.actionBtn,
      { borderColor: color, backgroundColor: `${color}1A` },
      disabled && styles.actionBtnDisabled,
    ]}
  >
    <Ionicons name={icon} size={18} color={color} style={styles.actionIcon} />
    <Text style={[styles.actionText, { color }]}>
      {label} · {value}
    </Text>
  </TouchableOpacity>
);

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { token, isConnected } = useWallet();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await getFeed({ limit: 8 });
      setPosts(response.data);
      setStatusMessage(response.data.length ? null : FALLBACK_STATUS);
    } catch (error) {
      console.error("Feed load failed", error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to load the anonymous feed right now.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const updateVoteState = useCallback(
    (postId: number, nextCounts: { upVotes: number; downVotes: number }) => {
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                upVotes: nextCounts.upVotes,
                downVotes: nextCounts.downVotes,
              }
            : post,
        ),
      );
    },
    [],
  );

  const handleVote = useCallback(
    async (postId: number, direction: "up" | "down") => {
      if (!token) {
        setStatusMessage("Connect your wallet before voting on posts.");
        return;
      }

      try {
        const response = await voteOnPost(
          token,
          postId,
          direction,
          buildActionRecord(),
        );
        updateVoteState(postId, response.data);
        setStatusMessage(null);
      } catch (error) {
        setStatusMessage(
          error instanceof Error ? error.message : "Unable to submit vote.",
        );
      }
    },
    [token, updateVoteState],
  );

  const handleFlag = useCallback(
    async (postId: number) => {
      if (!token) {
        setStatusMessage("Connect your wallet before reporting posts.");
        return;
      }

      try {
        await flagPost(token, postId, "Community review requested");
        Alert.alert("Reported", "The post has been sent for moderator review.");
      } catch (error) {
        setStatusMessage(
          error instanceof Error ? error.message : "Unable to report post.",
        );
      }
    },
    [token],
  );

  const heroStats = [
    {
      icon: "radio-outline" as const,
      label: `${posts.length} live posts`,
      color: COLORS.secondary,
    },
    {
      icon: "shield-checkmark-outline" as const,
      label: isConnected ? "Wallet verified" : "Read-only mode",
      color: COLORS.primary,
    },
  ];

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <HeroHeading
        title="Ananymous"
        subtitle="Unfiltered campus pulse, powered by your backend."
        ctaLabel="Refresh"
        ctaIcon="refresh"
        onPressCta={loadPosts}
        stats={heroStats}
      />
      <View style={styles.insightRow}>
        <View style={styles.insightCard}>
          <Ionicons name="flash-outline" size={18} color={COLORS.secondary} />
          <View style={styles.insightCopy}>
            <Text style={styles.insightTitle}>Realtime pulse</Text>
            <Text style={styles.insightText}>Posts, votes, and flags in one stream.</Text>
          </View>
        </View>
        <View style={styles.insightCard}>
          <Ionicons name="eye-off-outline" size={18} color={COLORS.primary} />
          <View style={styles.insightCopy}>
            <Text style={styles.insightTitle}>Identity protected</Text>
            <Text style={styles.insightText}>Wallet-gated, while the community stays masked.</Text>
          </View>
        </View>
      </View>
      {statusMessage && (
        <View style={styles.statusBanner}>
          <Ionicons
            name="cloud-offline-outline"
            size={18}
            color={COLORS.secondary}
          />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScreenSurface style={styles.container}>
      <FlatList<FeedPost>
        data={posts}
        keyExtractor={(item) => `${item.id}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadPosts} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={30} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No anonymous posts yet</Text>
            <Text style={styles.emptySubtitle}>
              Create the first post from the Post tab.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animatable.View
            animation="fadeInUp"
            delay={index * 90}
            useNativeDriver
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatarBadge}>
                  <Ionicons
                    name="shield-half-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                </View>
                <View>
                  <Text style={styles.anonId}>Anonymous #{item.id}</Text>
                  <Text style={styles.time}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.flagBtn}
                onPress={() => handleFlag(item.id)}
              >
                <Ionicons name="flag-outline" size={18} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {!!item.pollOptions.length && (
              <View style={styles.pollBadge}>
                <Ionicons
                  name="stats-chart-outline"
                  size={14}
                  color={COLORS.secondary}
                />
                <Text style={styles.pollBadgeText}>
                  Poll · {item.pollOptions.length} options
                </Text>
              </View>
            )}

            <Text style={styles.message}>{item.body}</Text>
            <View style={styles.divider} />
            <View style={styles.actions}>
              <ActionPill
                icon="thumbs-up-outline"
                label="Upvote"
                value={item.upVotes}
                color={COLORS.primary}
                onPress={() => handleVote(item.id, "up")}
                disabled={!isConnected}
              />
              <ActionPill
                icon="thumbs-down-outline"
                label="Down"
                value={item.downVotes}
                color={COLORS.secondary}
                onPress={() => handleVote(item.id, "down")}
                disabled={!isConnected}
              />
              <ActionPill
                icon="chatbubble-ellipses-outline"
                label="Comments"
                value={item.commentCount}
                color={COLORS.gray}
                onPress={() =>
                  navigation.navigate("Comments", { initialPostId: item.id })
                }
              />
            </View>
          </Animatable.View>
        )}
      />
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 140,
  },
  listContent: { paddingBottom: 120 },
  listHeader: { marginBottom: 12 },
  insightRow: {
    gap: 10,
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  insightCopy: { flex: 1 },
  insightTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  insightText: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 13,
    marginBottom: 18,
  },
  statusText: { color: COLORS.text, flex: 1, ...TYPOGRAPHY.label },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.34,
    shadowRadius: 24,
    elevation: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  avatarWrap: { flexDirection: "row", alignItems: "center" },
  avatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  anonId: { color: COLORS.text, ...TYPOGRAPHY.section },
  time: { color: COLORS.gray, ...TYPOGRAPHY.meta, marginTop: 2 },
  pollBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: `${COLORS.secondary}18`,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}30`,
  },
  pollBadgeText: { color: COLORS.secondary, ...TYPOGRAPHY.meta },
  message: { color: COLORS.text, ...TYPOGRAPHY.body, fontSize: 17, lineHeight: 26 },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
    opacity: 0.6,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    minWidth: 102,
  },
  actionBtnDisabled: {
    opacity: 0.55,
  },
  actionIcon: { marginRight: 6 },
  actionText: { ...TYPOGRAPHY.label },
  flagBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 9,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 68,
    gap: 8,
  },
  emptyTitle: { color: COLORS.text, ...TYPOGRAPHY.title },
  emptySubtitle: { color: COLORS.gray, ...TYPOGRAPHY.label, textAlign: "center" },
});

export default HomeScreen;
