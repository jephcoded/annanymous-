exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: "FILE_REQUIRED",
          message: "An image file is required",
          status: 400,
        },
      });
    }

    res.status(201).json({
      data: { url: `/uploads/${req.file.filename}` },
    });
  } catch (error) {
    next(error);
  }
};
