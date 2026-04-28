const db = require("../config/db");
const Notification = require("../models/Notification");
const User = require("../models/User");

const EXPO_PUSH_API_URL =
  process.env.EXPO_PUSH_API_URL || "https://exp.host/--/api/v2/push/send";
const MAX_BODY_LENGTH = 140;

const chunk = (items, size) => {
  const groups = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
};

const compactText = (value, fallback) => {
  const normalized = String(value || fallback || "").trim().replace(/\s+/g, " ");

  if (!normalized) {
    return fallback;
  }

  return normalized.length > MAX_BODY_LENGTH
    ? `${normalized.slice(0, MAX_BODY_LENGTH - 1).trim()}...`
    : normalized;
};

const listGlobalRecipients = async (excludeUserId) => {
  await User.ensurePushTokenSchema();

  const result = await db.query(
    `SELECT DISTINCT
       upt.user_id AS "userId",
       upt.expo_push_token AS "pushToken"
     FROM user_push_tokens upt
     INNER JOIN users u ON u.id = upt.user_id
     LEFT JOIN user_settings us ON us.user_id = upt.user_id
     WHERE upt.disabled_at IS NULL
       AND u.is_banned = FALSE
       AND ($1::bigint IS NULL OR upt.user_id <> $1)
       AND COALESCE(us.push_enabled, TRUE) = TRUE`,
    [excludeUserId],
  );

  return result.rows;
};

const listCommunityRecipients = async ({ communityId, excludeUserId }) => {
  await User.ensurePushTokenSchema();

  const result = await db.query(
    `SELECT DISTINCT
       upt.user_id AS "userId",
       upt.expo_push_token AS "pushToken"
     FROM community_members cm
     INNER JOIN user_push_tokens upt ON upt.user_id = cm.user_id
     INNER JOIN users u ON u.id = cm.user_id
     LEFT JOIN user_settings us ON us.user_id = cm.user_id
     WHERE cm.community_id = $1
       AND cm.status = 'active'
       AND upt.disabled_at IS NULL
       AND u.is_banned = FALSE
       AND cm.user_id <> $2
       AND COALESCE(us.push_enabled, TRUE) = TRUE`,
    [communityId, excludeUserId],
  );

  return result.rows;
};

const sendExpoMessages = async (messages) => {
  const validMessages = messages.filter((message) =>
    /^Expo(nent)?PushToken\[.+\]$/.test(message.to),
  );

  for (const batch of chunk(validMessages, 100)) {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new Error(
        `Expo push send failed with ${response.status}: ${responseText}`,
      );
    }
  }
};

const fanout = async ({ recipients, type, title, body, meta }) => {
  if (!recipients.length) {
    return;
  }

  await Promise.all(
    recipients.map((recipient) =>
      Notification.create({
        userId: recipient.userId,
        type,
        title,
        body,
        meta,
      }),
    ),
  );

  await sendExpoMessages(
    recipients.map((recipient) => ({
      to: recipient.pushToken,
      sound: "default",
      title,
      body,
      data: meta,
    })),
  );
};

exports.notifyNewPost = async ({ post, actorUserId }) => {
  const recipients = await listGlobalRecipients(actorUserId);

  await fanout({
    recipients,
    type: "post_created",
    title: "New anonymous post",
    body: compactText(post?.body, "A new post just landed in the feed."),
    meta: {
      postId: post?.id || null,
      category: post?.category || null,
    },
  });
};

exports.notifyCommunityMessage = async ({
  communityId,
  communityName,
  messageId,
  messagePreview,
  actorUserId,
}) => {
  const recipients = await listCommunityRecipients({
    communityId,
    excludeUserId: actorUserId,
  });

  await fanout({
    recipients,
    type: "community_message",
    title: `${communityName || "Community room"} has a new message`,
    body: compactText(messagePreview, "Open the room to read it."),
    meta: {
      communityId,
      messageId,
    },
  });
};