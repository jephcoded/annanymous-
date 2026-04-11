import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Dimensions,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import HeroHeading from "../components/HeroHeading";
import ScreenSurface from "../components/ScreenSurface";
import { useWallet } from "../contexts/WalletContext";
import {
    CommentItem,
    FeedPost,
    createComment,
    getCommentsByPost,
    getFeed,
    getRecentComments,
} from "../services/api";
import { buildContentRecord } from "../services/decentralized";
import { COLORS, TYPOGRAPHY } from "../theme";

type CommentSort = "newest" | "oldest";

const QUICK_PROMPTS = [
  "Can anyone confirm this?",
  "What happened next?",
  "Drop more context.",
  "Keep it sharp and factual.",
];

const CONCERN_COLOR = "#FB7185";

const COMMENT_LIMIT = 240;

const formatRelativeTime = (timestamp: string) => {
  const created = new Date(timestamp).getTime();
  const diffMinutes = Math.max(1, Math.floor((Date.now() - created) / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return `${Math.floor(diffMinutes / 1440)}d ago`;
};

const getThreadTone = (post: FeedPost | null, commentCount: number) => {
  if (!post) {
    return "Waiting for thread context.";
  }

  if (commentCount >= 6) {
    return "High momentum thread. Replies are landing quickly.";
  }

  if (post.upVotes >= 4) {
    return "This topic already has solid community support.";
  }

  if (post.downVotes >= 3) {
    return "This topic is divisive. Expect contrasting opinions.";
  }

  return "Early-stage thread. A thoughtful first reply can shape the tone.";
};

const CommentsScreen = () => {
  const route = useRoute<any>();
  const { token, isConnected } = useWallet();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [recentComments, setRecentComments] = useState<CommentItem[]>([]);
  const [draft, setDraft] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<CommentSort>("newest");

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) || null,
    [posts, selectedPostId],
  );
  const initialPostId = route.params?.initialPostId ?? null;

  const sortedComments = useMemo(() => {
    const nextComments = [...comments];

    return nextComments.sort((left, right) => {
      const delta =
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime();

      return sortMode === "newest" ? delta : -delta;
    });
  }, [comments, sortMode]);

  const loadComments = useCallback(async () => {
    setRefreshing(true);
    try {
      const [feedResponse, recentResponse] = await Promise.all([
        getFeed({ limit: 6 }),
        getRecentComments(8),
      ]);
      setPosts(feedResponse.data);
      setRecentComments(recentResponse.data);

      const nextPostId =
        initialPostId ?? selectedPostId ?? feedResponse.data[0]?.id ?? null;
      setSelectedPostId(nextPostId);

      if (nextPostId) {
        const commentsResponse = await getCommentsByPost(nextPostId);
        setComments(commentsResponse.data);
      } else {
        setComments([]);
      }
      setStatusMessage(null);
    } catch (error) {
      console.error("Comments sync failed", error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to load comments from the backend.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [initialPostId, selectedPostId]);

  const loadThread = useCallback(async (postId: number) => {
    setSelectedPostId(postId);
    setRefreshing(true);
    try {
      const response = await getCommentsByPost(postId);
      setComments(response.data);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to load thread.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (initialPostId) {
      loadThread(initialPostId);
    }
  }, [initialPostId, loadThread]);

  const submitComment = useCallback(async () => {
    if (!token || !selectedPostId) {
      setStatusMessage("Connect your wallet before commenting.");
      return;
    }

    const message = draft.trim();
    if (!message) {
      return;
    }

    setSubmitting(true);
    try {
      await createComment(
        token,
        selectedPostId,
        message,
        buildContentRecord(message),
      );
      setDraft("");
      await loadThread(selectedPostId);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to post comment.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [draft, loadThread, selectedPostId, token]);

  const heroStats = [
    {
      icon: "chatbubbles-outline" as const,
      label: `${comments.length} replies`,
      color: COLORS.secondary,
    },
    {
      icon: "pulse-outline" as const,
      label: comments.length >= 5 ? "Fast-moving thread" : "Quiet thread",
      color: COLORS.primary,
    },
    {
      icon: "shield-checkmark-outline" as const,
      label: isConnected ? "Ready to reply" : "Read-only mode",
      color: COLORS.gray,
    },
  ];

  return (
    <ScreenSurface style={styles.container}>
      <FlatList
        data={sortedComments}
        keyExtractor={(item) => `${item.id}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadComments} />
        }
        contentContainerStyle={{ paddingBottom: 140 }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <HeroHeading
              title="Comments"
              subtitle={
                selectedPost?.body ||
                "Pick a post, read the thread, and reply from one place."
              }
              ctaLabel="Refresh"
              ctaIcon="refresh"
              onPressCta={loadComments}
              stats={heroStats}
            />

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

            <Text style={styles.sectionLabel}>Choose a post</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {posts.map((post) => {
                const active = post.id === selectedPostId;
                return (
                  <TouchableOpacity
                    key={post.id}
                    style={[styles.postChip, active && styles.postChipActive]}
                    onPress={() => loadThread(post.id)}
                  >
                    <Text
                      style={[
                        styles.postChipText,
                        active && styles.postChipTextActive,
                      ]}
                      numberOfLines={2}
                    >
                      {post.body}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionLabel}>Recent activity</Text>
            <Text style={styles.activityLead}>
              Fresh posts and replies moving through the feed.
            </Text>
            <View style={styles.recentCard}>
              {recentComments.length ? (
                recentComments.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.recentItem,
                      index === recentComments.length - 1 &&
                        styles.recentItemLast,
                    ]}
                    onPress={() => loadThread(item.postId)}
                  >
                    <View style={styles.recentMetaRow}>
                      <Text style={styles.recentMetaLabel}>
                        Thread #{item.postId}
                      </Text>
                      <Text style={styles.recentMetaTime}>
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.recentPreview} numberOfLines={1}>
                      {item.postPreview}
                    </Text>
                    <Text style={styles.recentMessage} numberOfLines={2}>
                      {item.message}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptySubtitle}>
                  No comments in this post yet.
                </Text>
              )}
            </View>

            {selectedPost && (
              <View style={styles.threadSnapshotCard}>
                <View style={styles.threadSnapshotHeader}>
                  <Text style={styles.sectionLabel}>Thread</Text>
                  <Text style={styles.threadSnapshotTime}>
                    {formatRelativeTime(selectedPost.createdAt)}
                  </Text>
                </View>
                <Text style={styles.threadSnapshotBody}>
                  {selectedPost.body}
                </Text>
                <View style={styles.threadSnapshotStats}>
                  <View style={styles.threadStatPill}>
                    <Ionicons
                      name="thumbs-up-outline"
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.threadStatText}>
                      {selectedPost.upVotes} support
                    </Text>
                  </View>
                  <View style={styles.threadStatPill}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={14}
                      color={COLORS.secondary}
                    />
                    <Text style={styles.threadStatText}>
                      {comments.length} replies
                    </Text>
                  </View>
                  <View style={styles.threadStatPill}>
                    <Ionicons
                      name="warning-outline"
                      size={14}
                      color={CONCERN_COLOR}
                    />
                    <Text style={styles.threadStatText}>
                      {selectedPost.downVotes} concern
                    </Text>
                  </View>
                </View>
                <Text style={styles.threadSnapshotNote}>
                  {getThreadTone(selectedPost, comments.length)}
                </Text>
              </View>
            )}

            <View style={styles.threadToolbar}>
              <Text style={styles.sectionLabel}>Thread view</Text>
              <View style={styles.sortRow}>
                {(["newest", "oldest"] as CommentSort[]).map((mode) => {
                  const active = sortMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.sortChip, active && styles.sortChipActive]}
                      onPress={() => setSortMode(mode)}
                    >
                      <Text
                        style={[
                          styles.sortChipText,
                          active && styles.sortChipTextActive,
                        ]}
                      >
                        {mode === "newest" ? "Newest first" : "Oldest first"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.composerCard}>
              <Text style={styles.sectionLabel}>Write a reply</Text>
              <View style={styles.promptRow}>
                {QUICK_PROMPTS.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    style={styles.promptChip}
                    onPress={() =>
                      setDraft((current) => {
                        const next = current ? `${current} ${prompt}` : prompt;
                        return next.slice(0, COMMENT_LIMIT);
                      })
                    }
                  >
                    <Text style={styles.promptChipText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder={
                  isConnected
                    ? "Write an anonymous reply..."
                    : "Connect wallet to reply"
                }
                placeholderTextColor={COLORS.gray}
                value={draft}
                onChangeText={setDraft}
                editable={isConnected && !submitting}
                multiline
                maxLength={COMMENT_LIMIT}
              />
              <View style={styles.composerMetaRow}>
                <Text style={styles.composerMetaText}>
                  Keep replies sharp, useful, and anonymous.
                </Text>
                <Text style={styles.composerMetaText}>
                  {draft.trim().length}/{COMMENT_LIMIT}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!isConnected || !draft.trim() || submitting) &&
                    styles.sendBtnDisabled,
                ]}
                onPress={submitComment}
                disabled={!isConnected || !draft.trim() || submitting}
              >
                <Ionicons name="send-outline" size={18} color={COLORS.text} />
                <Text style={styles.sendBtnText}>
                  {submitting ? "Sending..." : "Reply"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rulesCard}>
              <Text style={styles.rulesTitle}>Thread guide</Text>
              <Text style={styles.rulesText}>
                Add context, verify details when you can, and avoid exposing
                real identities.
              </Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.commentCard}>
            <View style={styles.commentAccent} />
            <View style={styles.commentTopRow}>
              <View style={styles.commentHeader}>
                <View style={styles.avatarBadge}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                </View>
                <View>
                  <Text style={styles.anonId}>Anonymous #{item.id}</Text>
                  <Text style={styles.commentTime}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.replyBadge}>
                <Text style={styles.replyBadgeText}>Reply {index + 1}</Text>
              </View>
            </View>
            <Text style={styles.message}>{item.message}</Text>
            <View style={styles.commentFooter}>
              <Ionicons name="eye-outline" size={14} color={COLORS.gray} />
              <Text style={styles.commentFooterText}>
                Visible to everyone following this thread.
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="hourglass-outline" size={28} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No comments yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to reply to this post.
            </Text>
          </View>
        }
      />
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingBottom: 120 },
  listHeader: { marginBottom: 16 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    borderRadius: 18,
    marginBottom: 14,
  },
  statusText: { color: COLORS.text, flex: 1, ...TYPOGRAPHY.label },
  sectionLabel: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
    marginBottom: 12,
  },
  chipsRow: { gap: 10, paddingBottom: 8 },
  activityLead: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    marginTop: -6,
    marginBottom: 10,
  },
  postChip: {
    width: Math.min(Dimensions.get("window").width * 0.48, 200),
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  postChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  postChipText: { color: COLORS.gray, ...TYPOGRAPHY.label },
  postChipTextActive: { color: COLORS.text },
  recentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
    marginBottom: 18,
  },
  recentItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  recentItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  recentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  recentMetaLabel: { color: COLORS.secondary, ...TYPOGRAPHY.meta },
  recentMetaTime: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  recentPreview: {
    color: COLORS.primary,
    ...TYPOGRAPHY.label,
    marginBottom: 4,
  },
  recentMessage: { color: COLORS.text, ...TYPOGRAPHY.label },
  threadSnapshotCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
    marginBottom: 18,
  },
  threadSnapshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  threadSnapshotTime: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  threadSnapshotBody: { color: COLORS.text, ...TYPOGRAPHY.body },
  threadSnapshotStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  threadStatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  threadStatText: { color: COLORS.text, ...TYPOGRAPHY.meta },
  threadSnapshotNote: { color: COLORS.gray, ...TYPOGRAPHY.label },
  threadToolbar: {
    marginBottom: 18,
  },
  sortRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  sortChipActive: {
    borderColor: `${COLORS.primary}45`,
    backgroundColor: `${COLORS.primary}20`,
  },
  sortChipText: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  sortChipTextActive: { color: COLORS.text },
  composerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 18,
  },
  promptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  promptChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: `${COLORS.secondary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}24`,
  },
  promptChipText: {
    color: COLORS.secondary,
    ...TYPOGRAPHY.meta,
  },
  input: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.02)",
    color: COLORS.text,
    padding: 14,
    textAlignVertical: "top",
    marginBottom: 12,
    ...TYPOGRAPHY.body,
  },
  composerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  composerMetaText: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  sendBtnDisabled: { opacity: 0.55 },
  sendBtnText: { color: COLORS.text, ...TYPOGRAPHY.button },
  rulesCard: {
    backgroundColor: `${COLORS.secondary}12`,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}22`,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  rulesTitle: { color: COLORS.secondary, ...TYPOGRAPHY.label },
  rulesText: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  commentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  commentAccent: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
    backgroundColor: `${COLORS.primary}80`,
  },
  commentTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarBadge: {
    width: Math.min(Dimensions.get("window").width * 0.09, 36),
    height: Math.min(Dimensions.get("window").width * 0.09, 36),
    borderRadius: Math.min(Dimensions.get("window").width * 0.045, 18),
    backgroundColor: `${COLORS.primary}18`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  anonId: { color: COLORS.text, ...TYPOGRAPHY.label },
  commentTime: { color: COLORS.gray, ...TYPOGRAPHY.meta, marginTop: 2 },
  message: { color: COLORS.text, ...TYPOGRAPHY.body },
  replyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  replyBadgeText: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  commentFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  commentFooterText: { color: COLORS.gray, ...TYPOGRAPHY.meta },
  emptyState: { alignItems: "center", gap: 6, paddingVertical: 48 },
  emptyTitle: { color: COLORS.text, ...TYPOGRAPHY.section },
  emptySubtitle: { color: COLORS.gray, ...TYPOGRAPHY.label },
});

export default CommentsScreen;
