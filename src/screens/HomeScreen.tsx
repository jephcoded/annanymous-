import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import HeroHeading from "../components/HeroHeading";
import GuideModal from "../components/GuideModal";
import ScreenSurface from "../components/ScreenSurface";
import { useWallet } from "../contexts/WalletContext";
import { FeedPost, getFeed } from "../services/api";
import { COLORS, TYPOGRAPHY } from "../theme";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { isConnected } = useWallet();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await getFeed({ limit: 6 });
      setPosts(response.data);
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to refresh the anonymous feed.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const featuredPost = posts[0] ?? null;
  const trendingHashtags = useMemo(
    () =>
      Array.from(
        new Set(posts.flatMap((post) => post.hashtags || []).filter(Boolean)),
      ).slice(0, 4),
    [posts],
  );

  const heroStats = [
    {
      icon: "radio-outline" as const,
      label: `${posts.length} live posts`,
      color: COLORS.primary,
    },
    {
      icon: "shield-checkmark-outline" as const,
      label: isConnected ? "Posting unlocked" : "Read-only mode",
      color: COLORS.secondary,
    },
    {
      icon: "people-outline" as const,
      label: "Communities open",
      color: COLORS.gray,
    },
  ];

  const openDiscover = () => navigation.navigate("Discover");
  const openComments = (initialPostId?: number) =>
    navigation.navigate("Post", {
      screen: "Comments",
      params: initialPostId ? { initialPostId } : undefined,
    });
  const openPolls = () => navigation.navigate("Post", { screen: "Polls" });
  const openPost = () => navigation.navigate(isConnected ? "Post" : "Wallet");
  const openWallet = () => navigation.navigate("Wallet");
  const openCommunities = () => navigation.navigate("Communities");

  const menuItems = [
    {
      id: "post",
      icon: isConnected ? "create-outline" : "lock-closed-outline",
      title: isConnected ? "Create post" : "Unlock posting",
      subtitle: isConnected ? "Open the composer." : "Connect before posting.",
      onPress: openPost,
    },
    {
      id: "discover",
      icon: "compass-outline",
      title: "Discover",
      subtitle: "Trending, hashtags, Q&A.",
      onPress: openDiscover,
    },
    {
      id: "comments",
      icon: "chatbubble-outline",
      title: "Comments",
      subtitle: "Open live threads under Post.",
      onPress: () => openComments(featuredPost?.id),
    },
    {
      id: "polls",
      icon: "stats-chart-outline",
      title: "Polls",
      subtitle: "Vote or create fast polls.",
      onPress: openPolls,
    },
    {
      id: "community",
      icon: "people-outline",
      title: "Community",
      subtitle: "Join invite-only rooms.",
      onPress: openCommunities,
    },
    {
      id: "wallet",
      icon: "shield-half-outline",
      title: "Wallet",
      subtitle: "Connect and manage access.",
      onPress: openWallet,
    },
  ];

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
              title="Ananymous"
              subtitle="Pick a section from the menu, then open only what you need."
              ctaLabel={isConnected ? "Open composer" : "Connect wallet"}
              ctaIcon={isConnected ? "create-outline" : "wallet-outline"}
              onPressCta={openPost}
              stats={heroStats}
              gradientColors={[COLORS.background, COLORS.card]}
            />
            <GuideModal
              guideKey="home"
              title="How To Use This App"
              items={[
                "Tap Post on the bottom bar to create a caption, image post, or poll.",
                "Tap Community on the bottom bar to create a room or join by code.",
                "Tap Wallet before posting if your account is still read-only.",
                "Use the Home menu cards when you want shortcuts to comments, polls, and discover.",
              ]}
            />

            <View style={styles.menuGrid}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuCard}
                  onPress={item.onPress}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={COLORS.text}
                    />
                  </View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </TouchableOpacity>
              ))}
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

            <View style={styles.spotlightCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quick spotlight</Text>
                <TouchableOpacity onPress={featuredPost ? () => openComments(featuredPost.id) : openDiscover}>
                  <Text style={styles.linkText}>
                    {featuredPost ? "Open thread" : "Open discover"}
                  </Text>
                </TouchableOpacity>
              </View>
              {featuredPost ? (
                <>
                  <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                  <Text style={styles.badgeText}>{featuredPost.contentMode}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{featuredPost.category}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{formatDate(featuredPost.createdAt)}</Text>
                    </View>
                  </View>
                  {featuredPost.mediaUrl ? (
                    <Image
                      source={{ uri: featuredPost.mediaUrl }}
                      style={styles.spotlightImage}
                      contentFit="cover"
                    />
                  ) : null}
                  <Text style={styles.spotlightBody} numberOfLines={4}>
                    {featuredPost.body || "Image post"}
                  </Text>
                  <View style={styles.spotlightFooter}>
                    <Text style={styles.spotlightMeta}>
                      {featuredPost.commentCount} replies
                    </Text>
                    <Text style={styles.spotlightMeta}>
                      {featuredPost.upVotes} upvotes
                    </Text>
                    <Text style={styles.spotlightMeta}>
                      {featuredPost.trendingScore} trend
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.emptyText}>
                  The feed is quiet right now. Pull to refresh or open the composer to start it.
                </Text>
              )}
            </View>

            {!!trendingHashtags.length && (
              <View style={styles.tagCard}>
                <Text style={styles.sectionTitle}>Trending tags</Text>
                <View style={styles.tagRow}>
                  {trendingHashtags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.tagPill}
                      onPress={openDiscover}
                    >
                      <Text style={styles.tagText}>#{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Feed</Text>
              <Text style={styles.sectionMeta}>Pull to refresh</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          refreshing ? null : (
            <View style={styles.emptyCard}>
              <Ionicons name="radio-outline" size={22} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>
                Once fresh anonymous posts land, they will show here.
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
                    name="shield-half-outline"
                    size={16}
                    color={COLORS.text}
                  />
                </View>
                <View>
                  <Text style={styles.feedAuthor}>Anon signal</Text>
                  <Text style={styles.feedDate}>{formatDate(item.createdAt)}</Text>
                </View>
              </View>
              <View style={styles.feedBadge}>
                <Text style={styles.feedBadgeText}>{item.contentMode}</Text>
              </View>
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
            <View style={styles.feedFooter}>
              <Text style={styles.feedFooterText}>{item.commentCount} replies</Text>
              <Text style={styles.feedFooterText}>{item.upVotes} upvotes</Text>
              <TouchableOpacity onPress={() => openComments(item.id)}>
                <Text style={styles.feedAction}>Open comments</Text>
              </TouchableOpacity>
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
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  menuCard: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 16,
    minHeight: 132,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: 14,
  },
  menuTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.section,
    marginBottom: 6,
  },
  menuSubtitle: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 18,
  },
  tagCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 18,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    color: COLORS.text,
    ...TYPOGRAPHY.meta,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    ...TYPOGRAPHY.title,
  },
  sectionMeta: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  linkText: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  badgeText: {
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
  spotlightFooter: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  spotlightMeta: {
    color: COLORS.gray,
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
    backgroundColor: COLORS.card,
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
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
  feedBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.05)",
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
  feedFooter: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  feedFooterText: {
    color: COLORS.gray,
    ...TYPOGRAPHY.meta,
  },
  feedAction: {
    color: COLORS.text,
    ...TYPOGRAPHY.label,
  },
});

export default HomeScreen;
