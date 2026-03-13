const Comment = require("../models/Comment");
const notificationService = require("../services/notificationService");
const Post = require("../models/Post");

exports.listRecent = async (req, res, next) => {
  try {
    const comments = await Comment.listRecent(Number(req.query.limit) || 20);
    res.json({ data: comments });
  } catch (error) {
    next(error);
  }
};

exports.listByPost = async (req, res, next) => {
  try {
    const comments = await Comment.listByPost(
      req.params.postId,
      req.query.cursor,
      Number(req.query.limit) || 30,
    );
    res.json({ data: comments });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const payload = {
      postId: req.params.postId,
      message: req.body.message,
      decentralized: req.body.decentralized,
      userId: req.user?.id,
    };
    const comment = await Comment.create(payload);
    notificationService.emitComment(comment);

    const post = await Post.findById(req.params.postId);
    if (post?.userId && post.userId !== req.user?.id) {
      await notificationService.notifyUser({
        userId: post.userId,
        type: "comment",
        title: "New anonymous reply",
        body: "Someone commented on one of your posts.",
        meta: { postId: req.params.postId, commentId: comment.id },
      });
    }

    res.status(201).json({ data: comment });
  } catch (error) {
    next(error);
  }
};
