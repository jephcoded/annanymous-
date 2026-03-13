const Notification = require("../models/Notification");

let namespaces = {
  feedNamespace: null,
  commentNamespace: null,
  notificationNamespace: null,
};

exports.setNamespaces = (refs) => {
  namespaces = refs;
};

exports.emitPost = (post) => {
  namespaces.feedNamespace?.emit("feed:new-post", post);
};

exports.emitVote = (payload) => {
  namespaces.feedNamespace?.emit("feed:update-votes", payload);
};

exports.emitComment = (comment) => {
  namespaces.commentNamespace
    ?.to(`post:${comment.postId || comment.post_id}`)
    .emit("comment:new", comment);
};

exports.notifyUser = async ({ userId, type, title, body, meta = {} }) => {
  if (!userId) {
    return null;
  }

  const notification = await Notification.create({
    userId,
    type,
    title,
    body,
    meta,
  });

  namespaces.notificationNamespace
    ?.to(`user:${userId}`)
    .emit("notification:new", notification);

  return notification;
};
