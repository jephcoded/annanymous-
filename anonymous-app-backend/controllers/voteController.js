const Vote = require("../models/Vote");
const notificationService = require("../services/notificationService");
const Post = require("../models/Post");

exports.voteOnPost = async (req, res, next) => {
  try {
    const result = await Vote.applyToPost({
      postId: req.params.postId,
      direction: req.body.direction,
      decentralized: req.body.decentralized,
      userId: req.user?.id,
    });
    notificationService.emitVote(result);

    const post = await Post.findById(req.params.postId);
    if (post?.userId && post.userId !== req.user?.id) {
      await notificationService.notifyUser({
        userId: post.userId,
        type: "vote",
        title: "Your post got new activity",
        body: `A user left a ${req.body.direction || "new"} vote on your post.`,
        meta: { postId: req.params.postId, direction: req.body.direction },
      });
    }

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

exports.voteOnPoll = async (req, res, next) => {
  try {
    const result = await Vote.applyToPoll({
      pollId: req.params.pollId,
      optionId: req.body.optionId,
      decentralized: req.body.decentralized,
      userId: req.user?.id,
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};
