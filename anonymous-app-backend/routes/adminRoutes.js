const router = require("express").Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.post("/session/login", adminController.loginWithCredentials);

router.use(authMiddleware, adminMiddleware);

router.get("/session/me", adminController.getSession);
router.get("/members", adminController.listMembers);
router.post("/members", adminController.createMember);
router.patch("/members/:memberId/activate", adminController.activateMember);
router.patch("/members/:memberId/deactivate", adminController.deactivateMember);
router.patch("/members/:memberId/password", adminController.resetMemberPassword);
router.get("/overview", adminController.getOverview);
router.get("/trends", adminController.getTrends);
router.get("/users", adminController.listUsers);
router.get("/users/:userId", adminController.getUser);
router.patch("/users/:userId/ban", adminController.banUser);
router.patch("/users/:userId/unban", adminController.unbanUser);
router.patch("/reports/:reportId/resolve", adminController.resolveReport);
router.delete("/posts", adminController.deleteAllPosts);
router.delete("/posts/:postId", adminController.deletePost);

module.exports = router;