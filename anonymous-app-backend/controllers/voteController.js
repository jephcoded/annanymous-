const Vote = require("../models/Vote");
const notificationService = require("../services/notificationService");
const pushService = require("../services/pushService");
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
      const title = "Your post got new activity";
      const body = `A user left a ${req.body.direction || "new"} vote on your post.`;

      await notificationService.notifyUser({
        userId: post.userId,
        type: "vote",
        title,
        body,
        meta: { postId: req.params.postId, direction: req.body.direction },
      });

      void pushService
        .pushToUsers({
          recipientUserIds: [post.userId],
          title,
          body,
          meta: { type: "vote", postId: req.params.postId },
        })
        .catch((error) => {
          console.error("Failed to push-notify post vote", error);
        });
    }

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

exports.removePostVote = async (req, res, next) => {
  try {
    const result = await Vote.removeFromPost({
      postId: req.params.postId,
      userId: req.user?.id,
    });
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

    const poll = await Post.findById(req.params.pollId);
    if (poll?.userId && poll.userId !== req.user?.id) {
      const title = "Your poll got a new vote";
      const body = "Someone just voted on your poll.";

      void notificationService
        .notifyUser({
          userId: poll.userId,
          type: "vote",
          title,
          body,
          meta: { postId: req.params.pollId },
        })
        .catch((error) => {
          console.error("Failed to notify poll vote", error);
        });

      void pushService
        .pushToUsers({
          recipientUserIds: [poll.userId],
          title,
          body,
          meta: { type: "vote", postId: req.params.pollId },
        })
        .catch((error) => {
          console.error("Failed to push-notify poll vote", error);
        });
    }

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};
