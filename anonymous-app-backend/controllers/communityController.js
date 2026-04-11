// Community controller for handling community creation, invites, and membership
const Community = require("../models/Community");
const { nanoid } = require("nanoid");

exports.getCommunities = async (req, res, next) => {
  try {
    const communities = await Community.listForUser(req.user.id);
    res.status(200).json({ data: communities });
  } catch (error) {
    next(error);
  }
};

exports.createCommunity = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const createdBy = req.user.id;
    const inviteCode = nanoid(12);
    const community = await Community.createCommunity({
      name,
      description,
      createdBy,
      inviteCode,
    });
    // Add creator as admin member
    await Community.addMember({
      communityId: community.id,
      userId: createdBy,
      isAdmin: true,
      status: "active",
    });
    res.status(201).json({ data: community });
  } catch (error) {
    next(error);
  }
};

exports.createInvite = async (req, res, next) => {
  try {
    const { communityId, expiresAt } = req.body;
    const createdBy = req.user.id;
    // Only admin can create invite
    const isAdmin = await Community.isAdmin(communityId, createdBy);
    if (!isAdmin)
      return res
        .status(403)
        .json({ error: { message: "Only admin can create invites" } });
    const inviteCode = nanoid(12);
    const invite = await Community.createInvite({
      communityId,
      createdBy,
      inviteCode,
      expiresAt,
    });
    res.status(201).json({ data: invite });
  } catch (error) {
    next(error);
  }
};

exports.joinByInvite = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id;
    const community = await Community.getCommunityByInvite(inviteCode);
    if (!community)
      return res
        .status(404)
        .json({ error: { message: "Invalid invite code" } });
    const existingMember = await Community.findMembership(community.id, userId);
    if (existingMember) {
      return res.status(200).json({ data: existingMember });
    }

    // Add as pending member, admin must approve
    const member = await Community.addMember({
      communityId: community.id,
      userId,
      isAdmin: false,
      status: "pending",
    });
    res.status(200).json({ data: member });
  } catch (error) {
    next(error);
  }
};
