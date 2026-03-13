import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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

const formatRelativeTime = (timestamp: string) => {
  const created = new Date(timestamp).getTime();
  const diffMinutes = Math.max(1, Math.floor((Date.now() - created) / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return `${Math.floor(diffMinutes / 1440)}d ago`;
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

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) || null,
    [posts, selectedPostId],
  );
  const initialPostId = route.params?.initialPostId ?? null;

  const loadComments = useCallback(async () => {
    setRefreshing(true);
    try {
      const [feedResponse, recentResponse] = await Promise.all([
        getFeed({ limit: 6 }),
        getRecentComments(8),
      ]);
      setPosts(feedResponse.data);
      setRecentComments(recentResponse.data);

      const nextPostId = initialPostId ?? selectedPostId ?? feedResponse.data[0]?.id ?? null;
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

    setSubmitting(true);
    try {
      await createComment(
        token,
        selectedPostId,
        draft,
        buildContentRecord(draft),
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
      icon: "shield-checkmark-outline" as const,
      label: isConnected ? "Ready to reply" : "Read-only mode",
      color: COLORS.primary,
    },
  ];

  return (
    <ScreenSurface style={styles.container}>
      <FlatList
        data={comments}
        keyExtractor={(item) => `${item.id}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadComments} />
        }
        contentContainerStyle={{ paddingBottom: 140 }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <HeroHeading
              title="Anon Comments"
              subtitle={selectedPost?.body || "Recent replies from the feed."}
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

            <Text style={styles.sectionLabel}>Pick a post</Text>
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

            <Text style={styles.sectionLabel}>Quick activity</Text>
            <View style={styles.recentCard}>
              {recentComments.length ? (
                recentComments.map((item) => (
                  <View key={item.id} style={styles.recentItem}>
                    <Text style={styles.recentPreview} numberOfLines={1}>
                      {item.postPreview}
                    </Text>
                    <Text style={styles.recentMessage} numberOfLines={2}>
                      {item.message}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySubtitle}>
                  No comments in the backend yet.
                </Text>
              )}
            </View>

            <View style={styles.composerCard}>
              <Text style={styles.sectionLabel}>Reply to this post</Text>
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
              />
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
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.commentCard}>
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
            <Text style={styles.message}>{item.message}</Text>
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
  postChip: {
    width: 180,
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
  recentPreview: { color: COLORS.primary, ...TYPOGRAPHY.label, marginBottom: 4 },
  recentMessage: { color: COLORS.text, ...TYPOGRAPHY.label },
  composerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 18,
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
  commentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  emptyState: { alignItems: "center", gap: 6, paddingVertical: 48 },
  emptyTitle: { color: COLORS.text, ...TYPOGRAPHY.section },
  emptySubtitle: { color: COLORS.gray, ...TYPOGRAPHY.label },
});

export default CommentsScreen;
