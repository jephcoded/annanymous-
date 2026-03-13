// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AnonymousSocial {
    address public owner;

    struct PostRecord {
        bytes32 contentHash;
        string contentCid;
        address author;
        uint256 createdAt;
    }

    struct CommentRecord {
        uint256 postId;
        bytes32 contentHash;
        string contentCid;
        address author;
        uint256 createdAt;
    }

    mapping(uint256 => PostRecord) public posts;
    mapping(uint256 => CommentRecord) public comments;
    mapping(uint256 => mapping(address => int8)) public postVotes;
    mapping(uint256 => mapping(address => uint256)) public pollVotes;

    event PostAnchored(
        uint256 indexed postId,
        address indexed author,
        bytes32 contentHash,
        string contentCid
    );

    event CommentAnchored(
        uint256 indexed commentId,
        uint256 indexed postId,
        address indexed author,
        bytes32 contentHash,
        string contentCid
    );

    event PostVoted(
        uint256 indexed postId,
        address indexed voter,
        int8 direction
    );

    event PollVoted(
        uint256 indexed pollId,
        uint256 indexed optionId,
        address indexed voter
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function anchorPost(
        uint256 postId,
        bytes32 contentHash,
        string calldata contentCid,
        address author
    ) external onlyOwner {
        posts[postId] = PostRecord({
            contentHash: contentHash,
            contentCid: contentCid,
            author: author,
            createdAt: block.timestamp
        });

        emit PostAnchored(postId, author, contentHash, contentCid);
    }

    function anchorComment(
        uint256 commentId,
        uint256 postId,
        bytes32 contentHash,
        string calldata contentCid,
        address author
    ) external onlyOwner {
        comments[commentId] = CommentRecord({
            postId: postId,
            contentHash: contentHash,
            contentCid: contentCid,
            author: author,
            createdAt: block.timestamp
        });

        emit CommentAnchored(commentId, postId, author, contentHash, contentCid);
    }

    function votePost(uint256 postId, int8 direction) external {
        require(direction == 1 || direction == -1, "INVALID_DIRECTION");
        postVotes[postId][msg.sender] = direction;
        emit PostVoted(postId, msg.sender, direction);
    }

    function votePoll(uint256 pollId, uint256 optionId) external {
        pollVotes[pollId][msg.sender] = optionId;
        emit PollVoted(pollId, optionId, msg.sender);
    }
}
