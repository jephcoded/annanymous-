import { FeedPost, UserSettings } from "../services/api";

const SAFE_MODE_PATTERNS = [
  /\bnsfw\b/i,
  /\bexplicit\b/i,
  /\b18\+\b/i,
  /\bnude\b/i,
  /\bsex\b/i,
  /\bporn\b/i,
  /\bgore\b/i,
  /\bviolent\b/i,
  /\bviolence\b/i,
];

const normalizeKeyword = (value: string) => value.trim().toLowerCase();

const buildPostSearchText = (post: FeedPost) =>
  [
    post.body,
    post.category,
    post.contentMode,
    post.cityTag,
    post.campusTag,
    ...(post.hashtags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const isSafeModeEnabled = (settings?: UserSettings | null) =>
  Boolean(settings) && !settings?.marketingEnabled;

export const shouldHidePostForSettings = (
  post: FeedPost,
  settings?: UserSettings | null,
) => {
  if (!settings) {
    return false;
  }

  const searchText = buildPostSearchText(post);
  const mutedKeywords = (settings.mutedKeywords || [])
    .map(normalizeKeyword)
    .filter(Boolean);

  if (mutedKeywords.some((keyword) => searchText.includes(keyword))) {
    return true;
  }

  if (isSafeModeEnabled(settings)) {
    return SAFE_MODE_PATTERNS.some((pattern) => pattern.test(searchText));
  }

  return false;
};

export const filterPostsForSettings = (
  posts: FeedPost[],
  settings?: UserSettings | null,
) => posts.filter((post) => !shouldHidePostForSettings(post, settings));
