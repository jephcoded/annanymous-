const router = require("express").Router();
const voteController = require("../controllers/voteController");
const authMiddleware = require("../middleware/authMiddleware");
const { voteLimiter } = require('../middleware/rateLimiter');

router.post("/posts/:postId", authMiddleware, voteLimiter, voteController.voteOnPost);
router.post("/polls/:pollId", authMiddleware, voteLimiter, voteController.voteOnPoll);

module.exports = router;
