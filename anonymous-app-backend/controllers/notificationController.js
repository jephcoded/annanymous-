const Notification = require("../models/Notification");

exports.listMine = async (req, res, next) => {
  try {
    const notifications = await Notification.listByUser(
      req.user.id,
      Number(req.query.limit) || 30,
    );
    res.json({ data: notifications });
  } catch (error) {
    next(error);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const notification = await Notification.markRead(
      req.user.id,
      req.params.notificationId,
    );

    if (!notification) {
      return res.status(404).json({
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: "Notification not found",
          status: 404,
        },
      });
    }

    res.json({ data: notification });
  } catch (error) {
    next(error);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.markAllRead(req.user.id);
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};
