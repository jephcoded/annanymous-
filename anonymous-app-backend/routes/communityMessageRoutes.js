// Community message routes for chat
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const communityMessageController = require("../controllers/communityMessageController");

// Send a message to a community
router.post("/send", auth, communityMessageController.sendMessage);

// Get messages for a community
router.get(
  "/:communityId/messages",
  auth,
  communityMessageController.getMessages,
);

module.exports = router;
