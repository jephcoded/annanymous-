const router = require("express").Router();
const commentController = require("../controllers/commentController");
const authMiddleware = require("../middleware/authMiddleware");
const { commentLimiter } = require("../middleware/rateLimiter");

router.get("/recent", commentController.listRecent);
router.get("/:postId", commentController.listByPost);
router.post(
  "/:postId",
  authMiddleware,
  commentLimiter,
  commentController.create,
);

module.exports = router;
