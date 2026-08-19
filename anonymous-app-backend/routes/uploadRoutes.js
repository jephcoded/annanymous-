const router = require("express").Router();
const uploadController = require("../controllers/uploadController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/", authMiddleware, upload.single("image"), uploadController.uploadImage);

module.exports = router;
