const router = require("express").Router();
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.get("/", notificationController.listMine);
router.post("/read-all", notificationController.markAllRead);
router.post("/:notificationId/read", notificationController.markRead);

module.exports = router;
