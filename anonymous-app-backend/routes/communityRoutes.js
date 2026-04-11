// Community routes for creating, inviting, and joining communities
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const communityController = require("../controllers/communityController");

router.get("/", auth, communityController.getCommunities);
router.post("/", auth, communityController.createCommunity);

// Create a new community (admin/creator)
router.post("/create", auth, communityController.createCommunity);

// Create an invite link (admin only)
router.post("/invite", auth, communityController.createInvite);

// Join a community by invite link
router.post("/join", auth, communityController.joinByInvite);

module.exports = router;
