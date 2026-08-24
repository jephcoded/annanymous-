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

exports.joinCommunity = async (req, res, next) => {
  try {
    const communityId = Number(req.params.communityId);
    const userId = req.user.id;
    const community = await Community.getById(communityId);

    if (!community) {
      return res
        .status(404)
        .json({ error: { message: "Community not found" } });
    }

    const existingMember = await Community.findMembership(communityId, userId);
    if (existingMember?.status === "active") {
      return res.status(200).json({ data: existingMember });
    }

    if (existingMember) {
      const member = await Community.updateMembership(existingMember.id, {
        status: "active",
      });
      return res.status(200).json({ data: member });
    }

    const member = await Community.addMember({
      communityId,
      userId,
      isAdmin: false,
      status: "active",
    });

    return res.status(201).json({ data: member });
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

exports.listMembers = async (req, res, next) => {
  try {
    const communityId = Number(req.params.communityId);
    const userId = req.user.id;

    const isMember = await Community.isActiveMember(communityId, userId);
    if (!isMember) {
      return res.status(403).json({
        error: { message: "Not a community member", status: 403 },
      });
    }

    const members = await Community.listMembersWithDetails(communityId);
    res.json({ data: members });
  } catch (error) {
    next(error);
  }
};

exports.updateMemberStatus = async (req, res, next) => {
  try {
    const communityId = Number(req.params.communityId);
    const targetUserId = Number(req.params.userId);
    const requesterId = req.user.id;
    const { status } = req.body;

    if (!["active", "removed"].includes(status)) {
      return res.status(400).json({
        error: {
          message: "status must be 'active' or 'removed'",
          status: 400,
        },
      });
    }

    const isAdmin = await Community.isAdmin(communityId, requesterId);
    if (!isAdmin) {
      return res.status(403).json({
        error: { message: "Only a room admin can do this", status: 403 },
      });
    }

    const membership = await Community.findMembership(
      communityId,
      targetUserId,
    );
    if (!membership) {
      return res.status(404).json({
        error: { message: "Member not found", status: 404 },
      });
    }

    const updated = await Community.updateMembership(membership.id, {
      status,
    });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};
