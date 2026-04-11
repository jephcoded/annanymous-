import { API_BASE_URL } from "../config/api";

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
  status?: string;
  isAdmin?: boolean;
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
  category: string;
  hashtags: string[];
  contentMode: "standard" | "confession" | "qna" | "story";
  expiresAt: string | null;
  campusTag: string | null;
  cityTag: string | null;
  upVotes: number;
  downVotes: number;
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
  message: string;
  createdAt: string;
  postPreview?: string;
  decentralized?: DecentralizedRecord | null;
};

export type WalletProfile = {
  id: number;
  walletAddress: string;
  displayName: string | null;
  createdAt: string;
  postCount: number;
  commentCount: number;
  voteCount: number;
  unreadCount: number;
};

export type UserSettings = {
  userId: number;
  pushEnabled: boolean;
  emailEnabled: boolean;
  marketingEnabled: boolean;
  showWalletSummary: boolean;
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

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  token?: string | null;
  body?: unknown;
};

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
    throw new Error(payload?.error?.message || "Request failed");
  }

  return payload as T;
};

export const getFeed = async (params?: {
  limit?: number;
  pollsOnly?: boolean;
  category?: string;
  hashtag?: string;
  campusTag?: string;
  cityTag?: string;
  contentMode?: string;
  trending?: boolean;
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
  return request<FeedResponse>(`/posts${suffix}`);
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
  });

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
      decentralized?: DecentralizedRecord;
    };
  }>(`/votes/posts/${postId}`, {
    method: "POST",
    token,
    body: { direction, decentralized },
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

export const getMe = async (token: string) =>
  request<{ data: { profile: WalletProfile; settings: UserSettings } }>(
    "/auth/me",
    {
      token,
    },
  );

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
