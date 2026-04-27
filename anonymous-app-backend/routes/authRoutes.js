const router = require("express").Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/challenge", authController.challenge);
router.post("/verify", authController.verify);
router.get("/me", authMiddleware, authController.me);
router.patch("/profile", authMiddleware, authController.updateProfile);
router.get("/settings", authMiddleware, authController.getSettings);
router.patch("/settings", authMiddleware, authController.updateSettings);

module.exports = router;
