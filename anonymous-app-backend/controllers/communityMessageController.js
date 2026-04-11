// CommunityMessage controller for sending and fetching messages
const CommunityMessage = require("../models/CommunityMessage");
const Community = require("../models/Community");

exports.sendMessage = async (req, res, next) => {
  try {
    const { communityId, message } = req.body;
    const userId = req.user.id;
    // Only active members can send messages
    const isMember = await Community.isActiveMember(communityId, userId);
    if (!isMember)
      return res
        .status(403)
        .json({ error: { message: "Not a community member" } });
    const msg = await CommunityMessage.createMessage({
      communityId,
      userId,
      message,
    });
    res.status(201).json({ data: msg });
  } catch (error) {
    next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;
    // Only active members can view messages
    const isMember = await Community.isActiveMember(communityId, userId);
    if (!isMember)
      return res
        .status(403)
        .json({ error: { message: "Not a community member" } });
    const messages = await CommunityMessage.getMessages(communityId);
    res.status(200).json({ data: messages });
  } catch (error) {
    next(error);
  }
};
