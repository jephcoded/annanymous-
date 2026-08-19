const path = require("path");
const multer = require("multer");
const { nanoid } = require("nanoid");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const EXTENSION_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const extension = EXTENSION_BY_MIME[file.mimetype] || ".jpg";
    cb(null, `${nanoid()}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error("Unsupported image type"));
    return;
  }

  cb(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});
