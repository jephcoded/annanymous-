import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import HeroHeading from "../components/HeroHeading";
import ScreenSurface from "../components/ScreenSurface";
import { useWallet } from "../contexts/WalletContext";
import { FeedPost, getFeed } from "../services/api";
import { COLORS, TYPOGRAPHY } from "../theme";

const DISCOVERY_CATEGORIES = [
  "all",
  "school",
  "relationships",
  "tech",
  "confession",
  "city",
] as const;

const DISCOVERY_MODES = [
  {
    id: "trending",
    label: "Trending",
    helper: "Fast-moving posts with strong reactions.",
  },
  {
    id: "latest",
    label: "Fresh",
    helper: "Newest anonymous drops in the feed.",
  },
  {
    id: "confession",
    label: "Confessions",
    helper: "Secrets, vulnerable posts, and raw honesty.",
  },
  {
    id: "qna",
    label: "Q&A",
    helper: "Question-led threads that pull answers quickly.",
  },
  {
    id: "nearby",
    label: "Nearby",
    helper: "Privacy-safe campus and city signals.",
  },
] as const;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const DiscoverScreen = () => {
  const navigation = useNavigation<any>();
  const { isConnected } = useWallet();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof DISCOVERY_CATEGORIES)[number]>("all");
  const [selectedMode, setSelectedMode] =
    useState<(typeof DISCOVERY_MODES)[number]["id"]>("trending");
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);

  const campusSignal = "main-campus";
  const citySignal = "london";

  const loadPosts = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await getFeed({
        limit: 14,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        contentMode:
          selectedMode === "confession" || selectedMode === "qna"
            ? selectedMode
            : undefined,
        trending: selectedMode === "trending",
        campusTag: selectedMode === "nearby" ? campusSignal : undefined,
        cityTag: selectedMode === "nearby" ? citySignal : undefined,
        hashtag: selectedHashtag || undefined,
      });

      setPosts(response.data);
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load discovery right now.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [selectedCategory, selectedHashtag, selectedMode]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const featuredPost = posts[0] ?? null;
  const totalReplies = useMemo(
    () => posts.reduce((sum, post) => sum + post.commentCount, 0),
    [posts],
  );
  const totalTrend = useMemo(
    () => posts.reduce((sum, post) => sum + post.trendingScore, 0),
    [posts],
  );
  const trendingHashtags = useMemo(
    () =>
      Array.from(
        new Set(posts.flatMap((post) => post.hashtags || []).filter(Boolean)),
      ).slice(0, 8),
    [posts],
  );
  const nearbyCount = useMemo(
    () => posts.filter((post) => post.campusTag || post.cityTag).length,
    [posts],
  );
  const activeMode = DISCOVERY_MODES.find((mode) => mode.id === selectedMode);

  return (
    <ScreenSurface style={styles.surface} bleedTop>
      <FlatList
        data={posts}
        keyExtractor={(item) => `${item.id}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadPosts} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <HeroHeading
              title="Discover"
              subtitle="Follow the strongest signals, surface the right mood, and move between trending, confessions, Q&A, and nearby threads."
              ctaLabel={isConnected ? "Start a post" : "Unlock posting"}
              ctaIcon={isConnected ? "add-outline" : "wallet-outline"}
              onPressCta={() =>
                navigation.navigate(isConnected ? "Post" : "Wallet")
              }
              stats={[
                {
                  icon: "flame-outline",
                  label: `${featuredPost?.trendingScore ?? 0} top score`,
                  color: COLORS.primary,
                },
                {
                  icon: "chatbubble-ellipses-outline",
                  label: `${totalReplies} replies in view`,
                  color: COLORS.secondary,
                },
                {
                  icon: "location-outline",
                  label: `${nearbyCount} nearby tagged`,
                  color: COLORS.gray,
                },
              ]}
            />

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{posts.length}</Text>
                <Text style={styles.summaryLabel}>Posts surfaced</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{totalTrend}</Text>
                <Text style={styles.summaryLabel}>Trend score</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{trendingHashtags.length}</Text>
                <Text style={styles.summaryLabel}>Live hashtags</Text>
              </View>
            </View>

            <View style={styles.filterCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionTitle}>Explore lanes</Text>
                  <Text style={styles.sectionMeta}>
                    {activeMode?.helper || "Find the feed shape you want."}
                  </Text>
                </View>
                {selectedHashtag ? (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => setSelectedHashtag(null)}
                  >
                    <Text style={styles.clearBtnText}>Clear tag</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modeRow}
              >
                {DISCOVERY_MODES.map((mode) => {
                  const active = selectedMode === mode.id;
                  return (
                    <TouchableOpacity
                      key={mode.id}
                      style={[styles.modeCard, active && styles.modeCardActive]}
                      onPress={() => setSelectedMode(mode.id)}
                    >
                      <Text
                        style={[
                          styles.modeTitle,
                          active && styles.modeTitleActive,
                        ]}
                      >
                        {mode.label}
                      </Text>
                      <Text style={styles.modeHelper}>{mode.helper}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {DISCOVERY_CATEGORIES.map((category) => {
                  const active = selectedCategory === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        active && styles.categoryChipActive,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          active && styles.categoryChipTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {!!trendingHashtags.length && (
                <View style={styles.hashtagWrap}>
                  {trendingHashtags.map((tag) => {
                    const active = selectedHashtag === tag;
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.hashtagChip,
                          active && styles.hashtagChipActive,
                        ]}
                        onPress={() =>
                          setSelectedHashtag((current) =>
                            current === tag ? null : tag,
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.hashtagChipText,
                            active && styles.hashtagChipTextActive,
                          ]}
                        >
                          #{tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {loadError ? (
              <View style={styles.statusBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={COLORS.secondary}
                />
                <Text style={styles.statusText}>{loadError}</Text>
              </View>
            ) : null}

            {featuredPost ? (
              <View style={styles.spotlightCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Spotlight thread</Text>
                  <Text style={styles.sectionMeta}>
                    {formatDate(featuredPost.createdAt)}
                  </Text>
                </View>
                <View style={styles.spotlightBadgeRow}>
                  <View style={styles.spotlightPill}>
                    <Text style={styles.spotlightPillText}>
                      {featuredPost.contentMode}
                    </Text>
                  </View>
                  <View style={styles.spotlightPill}>
                    <Text style={styles.spotlightPillText}>
                      {featuredPost.category}
                    </Text>
                  </View>
                  {featuredPost.expiresAt ? (
                    <View style={styles.spotlightPill}>
                      <Text style={styles.spotlightPillText}>24h</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.spotlightBody} numberOfLines={4}>
                  {featuredPost.body}
                </Text>
                {featuredPost.mediaUrl ? (
                  <Image
                    source={{ uri: featuredPost.mediaUrl }}
                    style={styles.spotlightImage}
                    contentFit="cover"
                  />
                ) : null}
                <View style={styles.spotlightStats}>
                  <View style={styles.signalPill}>
                    <Ionicons
                      name="flame-outline"
                      size={15}
                      color={COLORS.primary}
                    />
                    <Text style={styles.signalText}>
                      {featuredPost.trendingScore} trend
                    </Text>
                  </View>
                  <View style={styles.signalPill}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={15}
                      color={COLORS.secondary}
                    />
                    <Text style={styles.signalText}>
                      {featuredPost.commentCount} replies
                    </Text>
                  </View>
                  <View style={styles.signalPill}>
                    <Ionicons
                      name="arrow-up-circle-outline"
                      size={15}
                      color={COLORS.gray}
                    />
                    <Text style={styles.signalText}>
                      {featuredPost.upVotes} boosts
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Discovery results</Text>
              <Text style={styles.sectionMeta}>
                {selectedHashtag ? `Filtered by #${selectedHashtag}` : "Pull to refresh"}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          refreshing ? null : (
            <View style={styles.emptyCard}>
              <Ionicons name="compass-outline" size={22} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>Nothing surfaced yet</Text>
              <Text style={styles.emptyText}>
                Try a different lane, category, or hashtag to widen the search.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.feedCard}>
            <View style={styles.feedTopRow}>
              <View style={styles.feedIdentity}>
                <View style={styles.avatarShell}>
                  <Ionicons
                    name="compass-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                </View>
                <View>
                  <Text style={styles.feedAuthor}>Anonymous signal</Text>
                  <Text style={styles.feedDate}>{formatDate(item.createdAt)}</Text>
                </View>
              </View>
              <View style={styles.rankPill}>
                <Text style={styles.rankPillText}>{item.trendingScore} score</Text>
              </View>
            </View>

            <View style={styles.feedBadgeRow}>
              <View style={styles.feedBadge}>
                <Text style={styles.feedBadgeText}>{item.contentMode}</Text>
              </View>
              <View style={styles.feedBadge}>
                <Text style={styles.feedBadgeText}>{item.category}</Text>
              </View>
              {item.campusTag ? (
                <View style={styles.feedBadge}>
                  <Text style={styles.feedBadgeText}>campus: {item.campusTag}</Text>
                </View>
              ) : null}
              {item.cityTag ? (
                <View style={styles.feedBadge}>
                  <Text style={styles.feedBadgeText}>city: {item.cityTag}</Text>
                </View>
              ) : null}
            </View>

            {item.mediaUrl ? (
              <Image
                source={{ uri: item.mediaUrl }}
                style={styles.feedImage}
                contentFit="cover"
              />
            ) : null}
            <Text style={styles.feedBody} numberOfLines={3}>
              {item.body || "Image post"}
            </Text>

            {!!item.hashtags.length && (
              <View style={styles.feedHashtagRow}>
                {item.hashtags.slice(0, 5).map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => setSelectedHashtag(tag)}
                  >
                    <Text style={styles.feedHashtagText}>#{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.feedFooter}>
              <Text style={styles.feedFooterText}>{item.commentCount} replies</Text>
              <Text style={styles.feedFooterText}>{item.upVotes} boosts</Text>
              <Text style={styles.feedFooterText}>
                {item.pollOptions.length ? `${item.pollOptions.length} poll options` : "text thread"}
              </Text>
            </View>
          </View>
        )}
      />
    </ScreenSurface>
  );
};

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    paddingTop: 24,
    paddingBottom: 140,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  summaryValue: {
    color: COLORS.text,
    ...TYPOGRAPHY.title,
    marginBottom: 4,
  },
  summaryLabel: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  filterCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.title,
  },
  sectionMeta: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    flexShrink: 1,
  },
  clearBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearBtnText: {
    color: COLORS.secondary,
    ...TYPOGRAPHY.meta,
  },
  modeRow: {
    gap: 10,
    paddingBottom: 12,
  },
  modeCard: {
    width: 176,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
  },
  modeCardActive: {
    borderColor: `${COLORS.primary}45`,
    backgroundColor: `${COLORS.primary}14`,
  },
  modeTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    marginBottom: 4,
  },
  modeTitleActive: {
    color: COLORS.text,
  },
  modeHelper: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 12,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  categoryChipActive: {
    borderColor: `${COLORS.secondary}45`,
    backgroundColor: `${COLORS.secondary}16`,
  },
  categoryChipText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    textTransform: "capitalize",
  },
  categoryChipTextActive: {
    color: COLORS.text,
  },
  hashtagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hashtagChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hashtagChipActive: {
    borderColor: `${COLORS.primary}45`,
    backgroundColor: `${COLORS.primary}14`,
  },
  hashtagChipText: {
    color: COLORS.secondary,
    ...TYPOGRAPHY.meta,
  },
  hashtagChipTextActive: {
    color: COLORS.text,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 14,
    marginBottom: 18,
  },
  statusText: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
    flex: 1,
  },
  spotlightCard: {
    backgroundColor: COLORS.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 18,
  },
  spotlightBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  spotlightPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  spotlightPillText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    textTransform: "capitalize",
  },
  spotlightBody: {
    color: COLORS.text,
    ...TYPOGRAPHY.body,
    marginBottom: 14,
  },
  spotlightImage: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  spotlightStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  signalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  signalText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 24,
    marginTop: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
    marginTop: 10,
    marginBottom: 6,
  },
  emptyText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.label,
    textAlign: "center",
  },
  feedCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  feedTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  feedIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarShell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${COLORS.primary}18`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    alignItems: "center",
    justifyContent: "center",
  },
  feedAuthor: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
  },
  feedDate: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  rankPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: `${COLORS.primary}18`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
  },
  rankPillText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
  feedBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  feedBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  feedBadgeText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
    textTransform: "capitalize",
  },
  feedBody: {
    color: COLORS.text,
    ...TYPOGRAPHY.body,
    marginBottom: 14,
  },
  feedImage: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  feedHashtagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  feedHashtagText: {
    color: COLORS.secondary,
    ...TYPOGRAPHY.meta,
  },
  feedFooter: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  feedFooterText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
});

export default DiscoverScreen;
