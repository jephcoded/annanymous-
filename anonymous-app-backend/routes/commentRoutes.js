const router = require("express").Router();
const commentController = require("../controllers/commentController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const { commentLimiter } = require("../middleware/rateLimiter");

router.get("/recent", optionalAuthMiddleware, commentController.listRecent);
router.get("/:postId", optionalAuthMiddleware, commentController.listByPost);
router.post(
  "/:postId",
  authMiddleware,
  commentLimiter,
  commentController.create,
);

module.exports = router;
