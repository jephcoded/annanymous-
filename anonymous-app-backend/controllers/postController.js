const Post = require("../models/Post");
const pushService = require("../services/pushService");
const trendingService = require("../services/trendingService");

const formatCursor = (rows) => (rows.length ? rows[rows.length - 1].id : null);

exports.listFeed = async (req, res, next) => {
  try {
    const {
      cursor,
      limit,
      pollsOnly,
      category,
      hashtag,
      campusTag,
      cityTag,
      contentMode,
      trending,
    } = req.query;
    const posts = await Post.list({
      cursor,
      limit: Number(limit) || 20,
      pollsOnly: pollsOnly === "true",
      category,
      hashtag,
      campusTag,
      cityTag,
      contentMode,
      trending: trending === "true",
      userId: req.user?.id || null,
    });
    res.json({
      data: posts,
      paging: {
        cursor: formatCursor(posts),
        hasMore: posts.length >= (Number(limit) || 20),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createPost = async (req, res, next) => {
  try {
    const payload = {
      body: req.body.body,
      mediaUrl: req.body.mediaUrl,
      pollOptions: req.body.pollOptions,
      category: req.body.category,
      contentMode: req.body.contentMode,
      expiresAt: req.body.expiresAt,
      campusTag: req.body.campusTag,
      cityTag: req.body.cityTag,
      decentralized: req.body.decentralized,
      userId: req.user?.id,
    };
    const post = await Post.create(payload);
    trendingService.enqueue(post.id);

    void pushService
      .notifyNewPost({
        post,
        actorUserId: req.user?.id || null,
      })
      .catch((notificationError) => {
        console.error("Push fanout failed for new post", notificationError);
      });

    res.status(201).json({ data: post });
  } catch (error) {
    next(error);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId, req.user?.id || null);
    if (!post) {
      return res.status(404).json({
        error: {
          code: "POST_NOT_FOUND",
          message: "Post does not exist",
          status: 404,
        },
      });
    }
    res.json({ data: post });
  } catch (error) {
    next(error);
  }
};

exports.flagPost = async (req, res, next) => {
  try {
    if (!req.body.reason?.trim()) {
      return res.status(400).json({
        error: {
          code: "FLAG_REASON_REQUIRED",
          message: "reason is required",
          status: 400,
        },
      });
    }

    await Post.flag(req.params.postId, req.body.reason, req.user?.id || null);
    res.json({ message: "Post queued for review" });
  } catch (error) {
    next(error);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const deleted = await Post.delete({
      postId: req.params.postId,
      userId: req.user?.id,
      reason: req.body?.reason,
    });

    res.json({ data: deleted });
  } catch (error) {
    next(error);
  }
};
