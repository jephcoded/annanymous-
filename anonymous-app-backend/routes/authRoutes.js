const router = require("express").Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/signup", authLimiter, authController.signup);
router.post("/login", authLimiter, authController.login);
router.post("/challenge", authLimiter, authController.challenge);
router.post("/verify", authLimiter, authController.verify);
router.get("/me", authMiddleware, authController.me);
router.patch("/profile", authMiddleware, authController.updateProfile);
router.post(
  "/password",
  authMiddleware,
  authLimiter,
  authController.changePassword,
);
router.post("/password/forgot", authLimiter, authController.forgotPassword);
router.post("/password/reset", authLimiter, authController.resetPassword);
router.get("/settings", authMiddleware, authController.getSettings);
router.patch("/settings", authMiddleware, authController.updateSettings);
router.post(
  "/settings/push-token",
  authMiddleware,
  authController.registerPushToken,
);

module.exports = router;
