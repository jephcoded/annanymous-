import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenSurface from "../components/ScreenSurface";
import { useWallet } from "../contexts/WalletContext";
import {
  CommentItem,
  createComment,
  deletePost,
  FeedPost,
  getCommentsByPost,
  getFeed,
  getMe,
  removePostVote,
  voteOnPost,
} from "../services/api";
import { buildContentRecord } from "../services/decentralized";
import { TYPOGRAPHY } from "../theme";
import { filterPostsForSettings } from "../utils/contentPreferences";
import { getFriendlyErrorMessage } from "../utils/errorMessages";

const HOME_COLORS = {
  text: "#FBE4D8",
  muted: "#DFB6B2",
  accent: "#FBE4D8",
  accentSoft: "#DFB6B2",
  accentDim: "rgba(255,255,255,0.05)",
  stroke: "rgba(255,255,255,0.08)",
  overlay: "rgba(9,9,12,0.96)",
  surface: "#0F1014",
  surfaceSoft: "#111117",
  surfaceDeep: "#09090C",
  purple: "#8B3DFF",
  purpleSoft: "rgba(139,61,255,0.12)",
};

const COMMENT_LIMIT = 220;
const FEED_TABS = ["For you", "Nearby", "Trending", "Latest"] as const;
type FeedTab = (typeof FEED_TABS)[number];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const formatRelativeTime = (timestamp: string) => {
  const created = new Date(timestamp).getTime();
  const diffMinutes = Math.max(1, Math.floor((Date.now() - created) / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
  return `${Math.floor(diffMinutes / 1440)}d`;
};

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { token, settings } = useWallet();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [failedMediaIds, setFailedMediaIds] = useState<Record<number, true>>(
    {},
  );
  const [likingPostIds, setLikingPostIds] = useState<Record<number, true>>({});
  const [actionPost, setActionPost] = useState<FeedPost | null>(null);
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
  const [sheetComments, setSheetComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [expandedMediaUrl, setExpandedMediaUrl] = useState<string | null>(null);
  const [activeFeedTab, setActiveFeedTab] = useState<FeedTab>("For you");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const commentsCacheRef = useRef<Record<number, CommentItem[]>>({});
  const activeCommentPostIdRef = useRef<number | null>(null);

  const isCompact = width < 380;
  const topInset = insets.top + (isCompact ? 8 : 10);
  const fixedHeaderHeight =
    insets.top +
    (isCompact ? (isSearchOpen ? 164 : 118) : isSearchOpen ? 174 : 126);

  const loadPosts = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await getFeed({ limit: 12, token: token || undefined });
      setPosts(response.data);
      setLoadError(null);
    } catch (error) {
      setLoadError(
        getFriendlyErrorMessage(error, "Unable to refresh the anonymous feed."),
      );
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (!token) {
      setCurrentUserId(null);
      return;
    }

    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const response = await getMe(token);
        if (!isMounted) {
          return;
        }

        const parsedUserId = Number(
          response.data.access?.userId ?? response.data.profile.id,
        );
        setCurrentUserId(Number.isFinite(parsedUserId) ? parsedUserId : null);
      } catch {
        if (isMounted) {
          setCurrentUserId(null);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const openPost = useCallback(() => navigation.navigate("Post"), [navigation]);
  const openWallet = useCallback(
    () => navigation.navigate("Wallet"),
    [navigation],
  );
  const toggleSearch = useCallback(() => {
    setIsSearchOpen((current) => {
      if (current) {
        setSearchQuery("");
      }

      return !current;
    });
  }, []);

  const markMediaFailed = useCallback((postId: number) => {
    setFailedMediaIds((current) => {
      if (current[postId]) {
        return current;
      }

      return { ...current, [postId]: true };
    });
  }, []);

  const hasRenderableMedia = useCallback(
    (post: FeedPost | null) =>
      Boolean(post?.mediaUrl && !failedMediaIds[post.id]),
    [failedMediaIds],
  );

  const openMediaViewer = useCallback(
    (post: FeedPost) => {
      if (!post.mediaUrl || failedMediaIds[post.id]) {
        return;
      }

      setExpandedMediaUrl(post.mediaUrl);
    },
    [failedMediaIds],
  );

  const openActionSheet = useCallback((post: FeedPost) => {
    setActionPost(post);
  }, []);

  const canManagePost = useCallback(
    (post: FeedPost | null) => {
      if (!post) {
        return false;
      }

      if (post.isOwner) {
        return true;
      }

      if (currentUserId == null || post.userId == null) {
        return false;
      }

      return Number(post.userId) === currentUserId;
    },
    [currentUserId],
  );

  const confirmDeletePost = useCallback(
    (post: FeedPost) => {
      if (!token || deletingPostId || !canManagePost(post)) {
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
              setDeletingPostId(post.id);
              try {
                await deletePost(token, post.id);
                setPosts((current) =>
                  current.filter((item) => item.id !== post.id),
                );
                setActionPost(null);
                if (commentPost?.id === post.id) {
                  setCommentPost(null);
                  setSheetComments([]);
                }
              } catch (error) {
                setLoadError(
                  getFriendlyErrorMessage(error, "Unable to delete the post."),
                );
              } finally {
                setDeletingPostId(null);
              }
            },
          },
        ],
      );
    },
    [canManagePost, commentPost?.id, deletingPostId, token],
  );

  const toggleLike = useCallback(
    async (postId: number) => {
      if (!token) {
        setLoadError("Your session expired. Log in again to continue.");
        return;
      }

      if (likingPostIds[postId]) {
        return;
      }

      setLikingPostIds((current) => ({ ...current, [postId]: true }));
      try {
        const targetPost = posts.find((post) => post.id === postId);
        const response =
          targetPost?.userVote === "up"
            ? await removePostVote(token, postId)
            : await voteOnPost(token, postId, "up");
        setPosts((current) =>
          current.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  upVotes: response.data.upVotes,
                  downVotes: response.data.downVotes,
                  userVote: response.data.userVote || null,
                }
              : post,
          ),
        );
      } catch (error) {
        setLoadError(
          getFriendlyErrorMessage(error, "Unable to update this reaction."),
        );
      } finally {
        setLikingPostIds((current) => {
          const next = { ...current };
          delete next[postId];
          return next;
        });
      }
    },
    [likingPostIds, posts, token],
  );

  const sharePost = useCallback(async (post: FeedPost) => {
    const message = post.body?.trim() || "Check this post on ANON.";

    try {
      await Share.share({ message });
    } catch {
      setLoadError("Unable to open the share sheet right now.");
    }
  }, []);

  const loadInlineComments = useCallback(async (
    postId: number,
    options?: { showLoader?: boolean },
  ) => {
    if (options?.showLoader !== false) {
      setCommentsLoading(true);
    }

    try {
      const response = await getCommentsByPost(postId);
      commentsCacheRef.current[postId] = response.data;

      if (activeCommentPostIdRef.current === postId) {
        setSheetComments(response.data);
        setLoadError(null);
      }
    } catch (error) {
      if (activeCommentPostIdRef.current === postId) {
        setLoadError(
          getFriendlyErrorMessage(error, "Unable to load comments."),
        );
        setSheetComments([]);
      }
    } finally {
      if (activeCommentPostIdRef.current === postId) {
        setCommentsLoading(false);
      }
    }
  }, []);

  const openCommentsSheet = useCallback(
    (post: FeedPost) => {
      setActionPost(null);
      activeCommentPostIdRef.current = post.id;
      setCommentPost(post);
      setCommentDraft("");

      const cachedComments = commentsCacheRef.current[post.id];
      setSheetComments(cachedComments || []);
      setCommentsLoading(!cachedComments);

      void loadInlineComments(post.id, {
        showLoader: !cachedComments,
      });
    },
    [loadInlineComments],
  );

  const closeCommentsSheet = useCallback(() => {
    activeCommentPostIdRef.current = null;
    setCommentPost(null);
    setCommentDraft("");
    setCommentsLoading(false);
  }, []);

  const submitComment = useCallback(async () => {
    if (!token || !commentPost) {
      setLoadError("Your session expired. Log in again to continue.");
      return;
    }

    const message = commentDraft.trim();
    if (!message) {
      return;
    }

    setCommentSubmitting(true);
    try {
      const response = await createComment(
        token,
        commentPost.id,
        message,
        buildContentRecord(message),
      );

      setCommentDraft("");
      setPosts((current) =>
        current.map((post) =>
          post.id === commentPost.id
            ? { ...post, commentCount: post.commentCount + 1 }
            : post,
        ),
      );

      setSheetComments((current) => {
        const next = [...current, response.data];
        commentsCacheRef.current[commentPost.id] = next;
        return next;
      });

      void loadInlineComments(commentPost.id, { showLoader: false });
    } catch (error) {
      setLoadError(getFriendlyErrorMessage(error, "Unable to post comment."));
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentDraft, commentPost, loadInlineComments, token]);

  const topUtilityActions = useMemo(
    () => [
      {
        id: "search",
        icon: isSearchOpen ? "close-outline" : "search-outline",
        onPress: toggleSearch,
      },
      { id: "alerts", icon: "notifications-outline", onPress: openWallet },
    ],
    [isSearchOpen, openWallet, toggleSearch],
  );

  const displayPosts = useMemo(() => {
    const next = [...filterPostsForSettings(posts, settings)];

    switch (activeFeedTab) {
      case "Trending":
        return next.sort(
          (left, right) =>
            right.trendingScore - left.trendingScore ||
            right.upVotes +
              right.commentCount -
              (left.upVotes + left.commentCount),
        );
      case "Latest":
        return next.sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        );
      case "Nearby": {
        const nearby = next.filter(
          (item) =>
            Boolean(item.cityTag || item.campusTag) ||
            item.category === "city" ||
            item.category === "school",
        );

        return nearby.length ? nearby : next;
      }
      default:
        return next;
    }
  }, [activeFeedTab, posts, settings]);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return displayPosts;
    }

    return displayPosts.filter((item) => {
      const searchParts = [
        item.body,
        item.category,
        item.cityTag,
        item.campusTag,
        ...(item.hashtags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchParts.includes(query);
    });
  }, [displayPosts, searchQuery]);

  return (
    <ScreenSurface style={styles.surface} bleedTop>
      <View
        style={[
          styles.fixedTopShell,
          isCompact && styles.fixedTopShellCompact,
          { paddingTop: topInset },
        ]}
      >
        <View style={[styles.topShell, isCompact && styles.topShellCompact]}>
          <View style={styles.topRow}>
            <View style={styles.brandGroup}>
              <Text
                style={[
                  styles.brandTitle,
                  isCompact && styles.brandTitleCompact,
                ]}
              >
                ANON
              </Text>
            </View>
            <View style={styles.topActionsCompact}>
              {topUtilityActions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.topIconButton,
                    isCompact && styles.topIconButtonCompact,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.88}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={17}
                    color={HOME_COLORS.accent}
                  />
                  {item.id === "alerts" ? (
                    <View style={styles.notificationDot} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {isSearchOpen ? (
            <View
              style={[styles.searchBar, isCompact && styles.searchBarCompact]}
            >
              <Ionicons
                name="search-outline"
                size={16}
                color={HOME_COLORS.accentSoft}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search posts, tags, city, campus"
                placeholderTextColor={HOME_COLORS.muted}
                style={styles.searchInput}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.trim() ? (
                <TouchableOpacity
                  style={styles.searchClearButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Ionicons name="close" size={14} color={HOME_COLORS.accent} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.headerActionScrollContent,
              isCompact && styles.headerActionScrollContentCompact,
            ]}
          >
            {FEED_TABS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.headerAction,
                  isCompact && styles.headerActionCompact,
                  activeFeedTab === item && styles.headerActionActive,
                ]}
                onPress={() => setActiveFeedTab(item)}
                activeOpacity={0.88}
              >
                <Text
                  style={[
                    styles.headerActionText,
                    isCompact && styles.headerActionTextCompact,
                    activeFeedTab === item && styles.headerActionTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadError ? (
            <View style={styles.statusBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={HOME_COLORS.accent}
              />
              <Text style={styles.statusText}>{loadError}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => `${item.id}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadPosts} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: fixedHeaderHeight },
        ]}
        ListEmptyComponent={
          refreshing ? null : (
            <View style={styles.emptyState}>
              <Ionicons
                name="radio-outline"
                size={24}
                color={HOME_COLORS.accent}
              />
              <Text style={styles.emptyTitle}>
                {searchQuery.trim() ? "No matching posts" : "No posts yet"}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? "Try a different word, hashtag, city, or category."
                  : "Fresh anonymous posts will appear here."}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isLiked = item.userVote === "up";
          const isLiking = Boolean(likingPostIds[item.id]);
          const likeCount = item.upVotes;
          const authorLabel = item.authorName?.trim()
            ? item.authorName.trim()
            : `User_${String(item.userId ?? item.id).slice(-4)}`;
          const metaLabel = item.cityTag || item.campusTag || "Anonymous zone";
          const bodyPreview = item.body?.trim() || "";

          return (
            <View style={styles.postBlock}>
              <View style={styles.postHeader}>
                <View style={styles.postIdentity}>
                  <View style={styles.avatarShell}>
                    <Ionicons
                      name="shield-half-outline"
                      size={15}
                      color={HOME_COLORS.text}
                    />
                  </View>
                  <View style={styles.identityTextWrap}>
                    <Text style={styles.authorText}>{authorLabel}</Text>
                    <Text style={styles.metaText}>
                      {formatRelativeTime(item.createdAt)} ago . {metaLabel}
                    </Text>
                  </View>
                </View>
                <View style={styles.postHeaderRight}>
                  <TouchableOpacity
                    style={styles.moreButton}
                    activeOpacity={0.8}
                    onPress={() => void openActionSheet(item)}
                  >
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={18}
                      color={HOME_COLORS.accent}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {bodyPreview ? (
                <Text style={styles.captionText}>{bodyPreview}</Text>
              ) : null}

              {hasRenderableMedia(item) ? (
                <TouchableOpacity
                  activeOpacity={0.94}
                  onPress={() => openMediaViewer(item)}
                >
                  <Image
                    source={{ uri: item.mediaUrl ?? undefined }}
                    style={styles.postImage}
                    contentFit="cover"
                    onError={() => markMediaFailed(item.id)}
                  />
                </TouchableOpacity>
              ) : null}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.metricButton}
                  onPress={() => void toggleLike(item.id)}
                  disabled={isLiking}
                >
                  <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={16}
                    color={HOME_COLORS.purple}
                  />
                  <Text
                    style={[
                      styles.metricText,
                      styles.metricTextPurple,
                      isLiked && styles.metricTextActive,
                    ]}
                  >
                    {likeCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.metricButton}
                  onPress={() => void openCommentsSheet(item)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={15}
                    color={HOME_COLORS.purple}
                  />
                  <Text style={[styles.metricText, styles.metricTextPurple]}>
                    {item.commentCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.metricButton}
                  onPress={() => void sharePost(item)}
                >
                  <Ionicons
                    name="paper-plane-outline"
                    size={15}
                    color={HOME_COLORS.accentSoft}
                  />
                  <Text style={styles.metricText}>{item.downVotes}</Text>
                </TouchableOpacity>
                <View style={styles.actionSpacer} />
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => void openActionSheet(item)}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={15}
                    color={HOME_COLORS.accentSoft}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.statsLine}>
                {authorLabel} . {formatDate(item.createdAt)}
              </Text>
            </View>
          );
        }}
      />

      <TouchableOpacity
        style={styles.floatingCreateButton}
        onPress={openPost}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={22} color={HOME_COLORS.text} />
      </TouchableOpacity>

      <Modal
        visible={Boolean(actionPost)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionPost(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setActionPost(null)}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Post actions</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setActionPost(null)}
              >
                <Ionicons name="close" size={18} color={HOME_COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSubtitle}>
              Choose what to do with this post.
            </Text>

            {actionPost ? (
              <>
                <TouchableOpacity
                  style={styles.sheetActionButton}
                  onPress={() => void openCommentsSheet(actionPost)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color={HOME_COLORS.purple}
                  />
                  <Text style={styles.sheetActionText}>Open comments</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sheetActionButton}
                  onPress={() => void sharePost(actionPost)}
                >
                  <Ionicons
                    name="paper-plane-outline"
                    size={18}
                    color={HOME_COLORS.purple}
                  />
                  <Text style={styles.sheetActionText}>Share post</Text>
                </TouchableOpacity>
                {token && canManagePost(actionPost) ? (
                  <TouchableOpacity
                    style={styles.sheetActionButton}
                    onPress={() => confirmDeletePost(actionPost)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={HOME_COLORS.purple}
                    />
                    <Text style={styles.sheetActionText}>Delete post</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(expandedMediaUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedMediaUrl(null)}
      >
        <View style={styles.mediaViewerBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setExpandedMediaUrl(null)}
          />
          {expandedMediaUrl ? (
            <View style={styles.mediaViewerCard}>
              <TouchableOpacity
                style={styles.mediaViewerClose}
                onPress={() => setExpandedMediaUrl(null)}
              >
                <Ionicons name="close" size={22} color={HOME_COLORS.text} />
              </TouchableOpacity>
              <Image
                source={{ uri: expandedMediaUrl }}
                style={styles.mediaViewerImage}
                contentFit="contain"
              />
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={Boolean(commentPost)}
        transparent
        animationType="slide"
        onRequestClose={closeCommentsSheet}
      >
        <KeyboardAvoidingView
          style={styles.sheetKeyboardShell}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
        >
          <View style={styles.sheetBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeCommentsSheet}
            />
            <View
              style={[
                styles.commentsSheet,
                { paddingBottom: Math.max(18, insets.bottom + 10) },
              ]}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Comments</Text>
                  <Text style={styles.sheetSubtitle}>
                    Reply without leaving the post.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={closeCommentsSheet}
                >
                  <Ionicons name="close" size={18} color={HOME_COLORS.text} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={sheetComments}
                keyExtractor={(item) => `${item.id}`}
                style={styles.commentsList}
                contentContainerStyle={[
                  styles.commentsListContent,
                  { paddingBottom: 24 },
                ]}
                ListEmptyComponent={
                  commentsLoading ? (
                    <Text style={styles.commentEmptyText}>
                      Loading comments...
                    </Text>
                  ) : (
                    <Text style={styles.commentEmptyText}>
                      No comments yet. Start the thread.
                    </Text>
                  )
                }
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <View style={styles.commentAvatar}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={14}
                        color={HOME_COLORS.purple}
                      />
                    </View>
                    <View style={styles.commentBodyWrap}>
                      <Text style={styles.commentBodyText}>
                        <Text style={styles.commentAuthor}>
                          {item.authorName?.trim() || "u.comment"}{" "}
                        </Text>
                        {item.message}
                      </Text>
                      <Text style={styles.commentMeta}>
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                )}
              />

              <View
                style={[
                  styles.commentComposer,
                  { paddingBottom: Math.max(4, insets.bottom) },
                ]}
              >
                <TextInput
                  value={commentDraft}
                  onChangeText={setCommentDraft}
                  placeholder="Write a comment"
                  placeholderTextColor={HOME_COLORS.muted}
                  style={styles.commentInput}
                  multiline
                  maxLength={COMMENT_LIMIT}
                />
                <TouchableOpacity
                  style={styles.commentSendButton}
                  onPress={() => void submitComment()}
                  disabled={commentSubmitting || !commentDraft.trim()}
                >
                  <Text style={styles.commentSendText}>
                    {commentSubmitting ? "Posting" : "Post"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    paddingHorizontal: 0,
  },
  content: {
    paddingBottom: 120,
  },
  fixedTopShell: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    zIndex: 20,
    backgroundColor: "#08050B",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(223,182,178,0.16)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  fixedTopShellCompact: {
    left: 6,
    right: 6,
    borderRadius: 26,
  },
  topShell: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#08050B",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(223,182,178,0.08)",
  },
  topShellCompact: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  brandGroup: {
    justifyContent: "center",
  },
  brandTitle: {
    color: HOME_COLORS.text,
    ...TYPOGRAPHY.title,
    letterSpacing: 0.4,
  },
  brandTitleCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HOME_COLORS.accentDim,
    borderWidth: 1,
    borderColor: HOME_COLORS.stroke,
  },
  topActionsCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    position: "relative",
  },
  topIconButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  notificationDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HOME_COLORS.purple,
  },
  headerActionScrollContent: {
    gap: 8,
    paddingRight: 18,
    paddingTop: 4,
    paddingBottom: 2,
  },
  headerActionScrollContentCompact: {
    gap: 6,
    paddingRight: 12,
  },
  headerAction: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerActionCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  headerActionActive: {
    backgroundColor: HOME_COLORS.purple,
    borderColor: "rgba(139,61,255,0.40)",
  },
  headerActionText: {
    color: HOME_COLORS.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.meta.fontFamily,
  },
  headerActionTextCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
  headerActionTextActive: {
    color: "#FFFFFF",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  statusText: {
    color: HOME_COLORS.text,
    ...TYPOGRAPHY.label,
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 54,
  },
  emptyTitle: {
    color: HOME_COLORS.text,
    ...TYPOGRAPHY.section,
    marginTop: 10,
    marginBottom: 6,
  },
  emptyText: {
    color: HOME_COLORS.muted,
    ...TYPOGRAPHY.label,
    textAlign: "center",
  },
  postBlock: {
    marginHorizontal: 0,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: HOME_COLORS.surfaceDeep,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  postImage: {
    width: "100%",
    height: 240,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchBarCompact: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    color: HOME_COLORS.text,
    ...TYPOGRAPHY.label,
    paddingVertical: 10,
  },
  searchClearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  postIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarShell: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HOME_COLORS.purpleSoft,
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.35)",
  },
  identityTextWrap: {
    gap: 1,
  },
  authorText: {
    color: HOME_COLORS.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.label.fontFamily,
  },
  metaText: {
    color: HOME_COLORS.muted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
    fontFamily: TYPOGRAPHY.meta.fontFamily,
  },
  postHeaderRight: {
    alignItems: "flex-end",
  },
  moreButton: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  actionButton: {
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  metricButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricText: {
    color: HOME_COLORS.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.meta.fontFamily,
  },
  metricTextPurple: {
    color: HOME_COLORS.purple,
  },
  metricTextActive: {
    color: HOME_COLORS.purple,
  },
  actionSpacer: {
    flex: 1,
  },
  statsLine: {
    color: HOME_COLORS.muted,
    ...TYPOGRAPHY.meta,
    paddingHorizontal: 14,
    marginTop: 0,
    marginBottom: 14,
  },
  captionText: {
    color: HOME_COLORS.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    paddingHorizontal: 14,
    marginTop: 0,
  },
  floatingCreateButton: {
    position: "absolute",
    right: 18,
    bottom: 118,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HOME_COLORS.purple,
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.44)",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  mediaViewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  mediaViewerCard: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaViewerClose: {
    position: "absolute",
    top: 6,
    right: 0,
    zIndex: 3,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  mediaViewerImage: {
    width: "100%",
    height: "82%",
  },
  sheetKeyboardShell: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: HOME_COLORS.overlay,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderColor: HOME_COLORS.stroke,
  },
  commentsSheet: {
    minHeight: "68%",
    maxHeight: "86%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#06060A",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderColor: HOME_COLORS.stroke,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    color: HOME_COLORS.text,
    ...TYPOGRAPHY.section,
  },
  sheetSubtitle: {
    color: HOME_COLORS.muted,
    ...TYPOGRAPHY.meta,
    marginBottom: 10,
  },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HOME_COLORS.accentDim,
    borderWidth: 1,
    borderColor: HOME_COLORS.stroke,
  },
  sheetActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(139,61,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.18)",
    marginBottom: 10,
  },
  sheetActionText: {
    color: HOME_COLORS.text,
    ...TYPOGRAPHY.label,
  },
  commentPostPreview: {
    paddingBottom: 14,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  commentPreviewAuthor: {
    color: "#E6C0BC",
    ...TYPOGRAPHY.meta,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  commentPreviewText: {
    color: "#FFF5F0",
    ...TYPOGRAPHY.label,
    lineHeight: 21,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingBottom: 12,
  },
  commentRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139,61,255,0.12)",
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,61,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.16)",
  },
  commentBodyWrap: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
    paddingRight: 4,
  },
  commentBodyText: {
    color: "#F7F2FF",
    ...TYPOGRAPHY.label,
    lineHeight: 22,
  },
  commentAuthor: {
    color: HOME_COLORS.purple,
    fontWeight: "800",
  },
  commentMeta: {
    color: "#A58FD0",
    ...TYPOGRAPHY.meta,
  },
  commentEmptyText: {
    color: HOME_COLORS.muted,
    ...TYPOGRAPHY.label,
    textAlign: "center",
    marginTop: 24,
  },
  commentComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 0,
    marginTop: 6,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: "rgba(139,61,255,0.12)",
  },
  commentInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(139,61,255,0.14)",
    color: "#F7F2FF",
    ...TYPOGRAPHY.label,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  commentSendButton: {
    minWidth: 74,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HOME_COLORS.purple,
    borderWidth: 1,
    borderColor: HOME_COLORS.purple,
  },
  commentSendText: {
    color: "#F7F2FF",
    ...TYPOGRAPHY.label,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.84)",
    justifyContent: "center",
    padding: 18,
  },
  previewSheet: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: HOME_COLORS.stroke,
    backgroundColor: HOME_COLORS.overlay,
    overflow: "hidden",
    padding: 14,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  previewTitle: {
    color: HOME_COLORS.text,
    ...TYPOGRAPHY.section,
  },
  previewCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: HOME_COLORS.stroke,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  previewImageFrame: {
    width: "100%",
    minHeight: 280,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
});

export default HomeScreen;
