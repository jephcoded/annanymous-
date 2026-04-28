import {
    API_BASE_URL,
    API_ORIGIN,
    IS_LEGACY_PRODUCTION_API,
} from "../config/api";

type AuthFailure = {
  code?: string;
  message?: string;
  status?: number;
};

let authFailureHandler: ((failure: AuthFailure) => void) | null = null;

export const registerAuthFailureHandler = (
  handler: ((failure: AuthFailure) => void) | null,
) => {
  authFailureHandler = handler;

  return () => {
    if (authFailureHandler === handler) {
      authFailureHandler = null;
    }
  };
};

// Community chat message types
export type CommunityMessage = {
  id: number;
  communityId: number;
  userId: number;
  sender: string;
  message: string;
  createdAt: string;
};

// Fetch messages for a community
export const getCommunityMessages = async (
  token: string,
  communityId: number,
) =>
  request<{ data: CommunityMessage[] }>(
    `/community-messages/${communityId}/messages`,
    { token },
  );

// Send a message to a community
export const sendCommunityMessage = async (
  token: string,
  payload: { communityId: number; message: string },
) =>
  request<{ data: CommunityMessage }>("/community-messages/send", {
    method: "POST",
    token,
    body: payload,
  });
// Community types
export type Community = {
  id: number;
  name: string;
  description?: string;
  memberCount: number;
  inviteCode: string;
  status?: string | null;
  isAdmin?: boolean;
  isPrivate?: boolean;
  createdAt?: string;
};

export type CommunityMember = {
  id: number;
  userId: number;
  isAdmin: boolean;
  status: string;
};

// Community API
export const getCommunities = async (token: string) =>
  request<{ data: Community[] }>("/communities", { token });

export const createCommunity = async (
  token: string,
  payload: { name: string; description?: string },
) => {
  try {
    return await request<{ data: Community }>("/communities/create", {
      method: "POST",
      token,
      body: payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/Route not found|Request failed/i.test(message)) {
      throw error;
    }

    return request<{ data: Community }>("/communities", {
      method: "POST",
      token,
      body: payload,
    });
  }
};

export const createCommunityInvite = async (
  token: string,
  payload: { communityId: number; expiresAt?: string },
) =>
  request<{ data: { inviteCode: string } }>("/communities/invite", {
    method: "POST",
    token,
    body: payload,
  });

export const joinCommunityByInvite = async (
  token: string,
  inviteCode: string,
) =>
  request<{ data: CommunityMember }>("/communities/join", {
    method: "POST",
    token,
    body: { inviteCode },
  });

export const joinCommunity = async (token: string, communityId: number) =>
  request<{ data: CommunityMember }>(`/communities/${communityId}/join`, {
    method: "POST",
    token,
  });

export type DecentralizedRecord = {
  contentCid?: string | null;
  contentHash?: string | null;
  chainId?: number | null;
  contractAddress?: string | null;
  transactionHash?: string | null;
  syncStatus?: string | null;
};

export type FeedPost = {
  id: number;
  body: string;
  mediaUrl: string | null;
  createdAt: string;
  userId: number | null;
  authorName?: string | null;
  isOwner?: boolean;
  category: string;
  hashtags: string[];
  contentMode: "standard" | "confession" | "qna" | "story";
  expiresAt: string | null;
  campusTag: string | null;
  cityTag: string | null;
  upVotes: number;
  downVotes: number;
  userVote?: "up" | "down" | null;
  commentCount: number;
  trendingScore: number;
  pollOptions: { id: number; label: string; votes: number }[];
  decentralized?: DecentralizedRecord | null;
};

export type FeedResponse = {
  data: FeedPost[];
  paging?: {
    cursor: number | null;
    hasMore: boolean;
  };
};

export type CommentItem = {
  id: number;
  postId: number;
  userId: number | null;
  authorName?: string | null;
  message: string;
  createdAt: string;
  postPreview?: string;
  decentralized?: DecentralizedRecord | null;
};

export type WalletProfile = {
  id: number;
  walletAddress: string | null;
  email: string | null;
  displayName: string | null;
  bio?: string | null;
  authType?: string | null;
  createdAt: string;
  postCount: number;
  commentCount: number;
  voteCount: number;
  unreadCount: number;
};

export type SessionAccess = {
  userId: number;
  walletAddress: string | null;
  email: string | null;
  authType: string | null;
  isAdmin: boolean;
  isBanned: boolean;
};

export type AuthUser = {
  id: number;
  walletAddress: string | null;
  email: string | null;
  displayName: string | null;
  bio?: string | null;
  authType: string | null;
  isAdmin: boolean;
};

export type UserSettings = {
  userId: number;
  pushEnabled: boolean;
  emailEnabled: boolean;
  marketingEnabled: boolean;
  showWalletSummary: boolean;
  directMessagesEnabled: boolean;
  mutedKeywords: string[];
  theme: string;
  updatedAt: string;
};

export type NotificationItem = {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  meta: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

export type AdminUser = {
  id: number;
  walletAddress: string;
  displayName: string | null;
  createdAt: string;
  isBanned: boolean;
  bannedReason?: string | null;
  bannedAt?: string | null;
  postCount: number;
  commentCount: number;
  voteCount?: number;
};

export type AdminStats = {
  totalUsers: number;
  activePosts: number;
  reportedPosts: number;
  bannedUsers: number;
};

export type AdminRecentPost = {
  id: number;
  body: string;
  createdAt: string;
  userId: number | null;
  walletAddress: string | null;
};

export type AdminReport = {
  id: number;
  postId: number;
  reason: string;
  status: string;
  createdAt: string;
  reporterWallet: string | null;
  authorWallet: string | null;
  postPreview: string;
};

export type AdminActivityItem = {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
  adminWallet: string | null;
};

export type AdminOverview = {
  stats: AdminStats;
  recentPosts: AdminRecentPost[];
  reports: AdminReport[];
  bannedUsers: Array<{
    id: number;
    walletAddress: string;
    bannedReason: string | null;
    bannedAt: string | null;
  }>;
  activity: AdminActivityItem[];
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
};

const normalizeMediaUrl = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  if (trimmed.startsWith("ipfs://")) {
    const cid = trimmed.replace("ipfs://", "").replace(/^ipfs\//, "");
    return cid ? `https://ipfs.io/ipfs/${cid}` : null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    if (
      !__DEV__ &&
      /https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(?::\d+)?/i.test(trimmed)
    ) {
      return null;
    }

    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return `${API_ORIGIN}${trimmed}`;
  }

  if (/^(uploads|api)\//i.test(trimmed)) {
    return `${API_ORIGIN}/${trimmed.replace(/^\/+/, "")}`;
  }

  return null;
};

const normalizeFeedPost = (post: FeedPost): FeedPost => ({
  ...post,
  authorName: post.authorName?.trim() || null,
  isOwner: Boolean(post.isOwner),
  mediaUrl: normalizeMediaUrl(post.mediaUrl),
  userVote: post.userVote || null,
});

const buildHeaders = (token?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const request = async <T>(path: string, options: RequestOptions = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: buildHeaders(options.token),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorCode = payload?.error?.code;
    const errorMessage = payload?.error?.message || "Request failed";
    const isPasswordAuthRoute =
      path === "/auth/login" || path === "/auth/signup";

    if (options.token && response.status === 401) {
      authFailureHandler?.({
        code: errorCode,
        message: errorMessage,
        status: response.status,
      });
    }

    if (response.status === 401 && errorCode === "TOKEN_INVALID") {
      throw new Error("Session expired. Log in again.");
    }

    if (response.status === 401 && errorCode === "AUTH_REQUIRED") {
      throw new Error("Log in to continue.");
    }

    if (response.status === 404 && isPasswordAuthRoute) {
      throw new Error(
        IS_LEGACY_PRODUCTION_API
          ? "This APK is pointed at the old wallet-only backend, so email login and create account will not work. Rebuild with EXPO_PUBLIC_API_BASE_URL set to the current Render backend URL."
          : "This backend does not expose email login or create account routes.",
      );
    }

    throw new Error(errorMessage);
  }

  return payload as T;
};

export const registerPushToken = async (
  token: string,
  payload: { pushToken: string; pushPlatform: string },
) =>
  request<{
    data: {
      userId: number;
      pushToken: string;
      platform: string | null;
      lastSeenAt: string;
    };
  }>("/auth/settings/push-token", {
    method: "POST",
    token,
    body: payload,
  });

export const getFeed = async (params?: {
  limit?: number;
  pollsOnly?: boolean;
  category?: string;
  hashtag?: string;
  campusTag?: string;
  cityTag?: string;
  contentMode?: string;
  trending?: boolean;
  token?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.limit) {
    query.set("limit", `${params.limit}`);
  }
  if (params?.pollsOnly) {
    query.set("pollsOnly", "true");
  }
  if (params?.category) {
    query.set("category", params.category);
  }
  if (params?.hashtag) {
    query.set("hashtag", params.hashtag);
  }
  if (params?.campusTag) {
    query.set("campusTag", params.campusTag);
  }
  if (params?.cityTag) {
    query.set("cityTag", params.cityTag);
  }
  if (params?.contentMode) {
    query.set("contentMode", params.contentMode);
  }
  if (params?.trending) {
    query.set("trending", "true");
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await request<FeedResponse>(`/posts${suffix}`, {
    token: params?.token,
  });

  return {
    ...response,
    data: response.data.map(normalizeFeedPost),
  };
};

export const createPost = async (
  token: string,
  payload: {
    body: string;
    mediaUrl?: string | null;
    pollOptions?: string[];
    category?: string;
    contentMode?: string;
    expiresAt?: string | null;
    campusTag?: string | null;
    cityTag?: string | null;
    decentralized?: DecentralizedRecord;
  },
) =>
  request<{ data: FeedPost }>("/posts", {
    method: "POST",
    token,
    body: payload,
  }).then((response) => ({
    ...response,
    data: normalizeFeedPost(response.data),
  }));

export const flagPost = async (token: string, postId: number, reason: string) =>
  request<{ message: string }>(`/posts/${postId}/flag`, {
    method: "POST",
    token,
    body: { reason },
  });

export const voteOnPost = async (
  token: string,
  postId: number,
  direction: "up" | "down",
  decentralized?: DecentralizedRecord,
) =>
  request<{
    data: {
      postId: string;
      upVotes: number;
      downVotes: number;
      userVote?: "up" | "down" | null;
      decentralized?: DecentralizedRecord;
    };
  }>(`/votes/posts/${postId}`, {
    method: "POST",
    token,
    body: { direction, decentralized },
  });

export const removePostVote = async (token: string, postId: number) =>
  request<{
    data: {
      postId: string;
      upVotes: number;
      downVotes: number;
      userVote?: "up" | "down" | null;
    };
  }>(`/votes/posts/${postId}`, {
    method: "DELETE",
    token,
  });

export const voteOnPoll = async (
  token: string,
  pollId: number,
  optionId: number,
  decentralized?: DecentralizedRecord,
) =>
  request<{
    data: {
      pollId: string;
      totals: { option_id: number; votes: string }[];
      decentralized?: DecentralizedRecord;
    };
  }>(`/votes/polls/${pollId}`, {
    method: "POST",
    token,
    body: { optionId, decentralized },
  });

export const getCommentsByPost = async (postId: number) =>
  request<{ data: CommentItem[] }>(`/comments/${postId}`);

export const getRecentComments = async (limit = 20) =>
  request<{ data: CommentItem[] }>(`/comments/recent?limit=${limit}`);

export const createComment = async (
  token: string,
  postId: number,
  message: string,
  decentralized?: DecentralizedRecord,
) =>
  request<{ data: CommentItem }>(`/comments/${postId}`, {
    method: "POST",
    token,
    body: { message, decentralized },
  });

export const deletePost = async (
  token: string,
  postId: number,
  reason?: string,
) =>
  request<{ data: { id: number } }>(`/posts/${postId}`, {
    method: "DELETE",
    token,
    body: { reason },
  });

export const signupWithPassword = async (payload: {
  email: string;
  password: string;
  displayName?: string;
  bio?: string;
}) =>
  request<{ token: string; user: AuthUser }>("/auth/signup", {
    method: "POST",
    body: payload,
  });

export const loginWithPassword = async (payload: {
  email: string;
  password: string;
}) =>
  request<{ token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body: payload,
  });

export const getMe = async (token: string) =>
  request<{
    data: {
      profile: WalletProfile;
      settings: UserSettings;
      access: SessionAccess;
    };
  }>("/auth/me", {
    token,
  });

export const updateProfile = async (
  token: string,
  profile: {
    displayName?: string;
    bio?: string;
  },
) =>
  request<{ data: WalletProfile }>("/auth/profile", {
    method: "PATCH",
    token,
    body: profile,
  });

export const getSettings = async (token: string) =>
  request<{ data: UserSettings }>("/auth/settings", { token });

export const updateSettings = async (
  token: string,
  settings: Partial<UserSettings>,
) =>
  request<{ data: UserSettings }>("/auth/settings", {
    method: "PATCH",
    token,
    body: settings,
  });

export const getNotifications = async (token: string, limit = 30) =>
  request<{ data: NotificationItem[] }>(`/notifications?limit=${limit}`, {
    token,
  });

export const markNotificationRead = async (
  token: string,
  notificationId: number,
) =>
  request<{ data: NotificationItem }>(`/notifications/${notificationId}/read`, {
    method: "POST",
    token,
  });

export const markAllNotificationsRead = async (token: string) =>
  request<{ message: string }>("/notifications/read-all", {
    method: "POST",
    token,
  });

export const getAdminOverview = async (
  token: string,
  params?: {
    recentLimit?: number;
    reportLimit?: number;
    bannedLimit?: number;
    activityLimit?: number;
  },
) => {
  const query = new URLSearchParams();

  if (params?.recentLimit) {
    query.set("recentLimit", `${params.recentLimit}`);
  }
  if (params?.reportLimit) {
    query.set("reportLimit", `${params.reportLimit}`);
  }
  if (params?.bannedLimit) {
    query.set("bannedLimit", `${params.bannedLimit}`);
  }
  if (params?.activityLimit) {
    query.set("activityLimit", `${params.activityLimit}`);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<{ data: AdminOverview }>(`/admin/overview${suffix}`, {
    token,
  });
};

export const listAdminUsers = async (
  token: string,
  params?: { query?: string; limit?: number },
) => {
  const query = new URLSearchParams();

  if (params?.query?.trim()) {
    query.set("query", params.query.trim());
  }
  if (params?.limit) {
    query.set("limit", `${params.limit}`);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<{ data: AdminUser[] }>(`/admin/users${suffix}`, { token });
};

export const getAdminUser = async (token: string, userId: number) =>
  request<{ data: AdminUser }>(`/admin/users/${userId}`, { token });

export const banAdminUser = async (
  token: string,
  userId: number,
  reason?: string,
) =>
  request<{ data: AdminUser }>(`/admin/users/${userId}/ban`, {
    method: "PATCH",
    token,
    body: { reason },
  });

export const unbanAdminUser = async (token: string, userId: number) =>
  request<{ data: AdminUser }>(`/admin/users/${userId}/unban`, {
    method: "PATCH",
    token,
  });

export const resolveAdminReport = async (
  token: string,
  reportId: number,
  resolutionNote?: string,
) =>
  request<{
    data: {
      id: number;
      postId: number;
      status: string;
      resolutionNote: string;
      reviewedAt: string;
    };
  }>(`/admin/reports/${reportId}/resolve`, {
    method: "PATCH",
    token,
    body: { resolutionNote },
  });

export const deleteAdminPost = async (
  token: string,
  postId: number,
  reason?: string,
) =>
  request<{
    data: {
      id: number;
      body: string;
      userId: number | null;
      deleteReason: string;
      deletedAt: string;
    };
  }>(`/admin/posts/${postId}`, {
    method: "DELETE",
    token,
    body: { reason },
  });
