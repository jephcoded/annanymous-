const db = require("../config/db");

exports.applyToPost = async ({ postId, direction, userId, decentralized = {} }) => {
  await db.query(
    `INSERT INTO votes (post_id, user_id, direction, chain_id, contract_address, transaction_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (post_id, user_id)
     DO UPDATE SET
       direction = EXCLUDED.direction,
       chain_id = EXCLUDED.chain_id,
       contract_address = EXCLUDED.contract_address,
       transaction_hash = EXCLUDED.transaction_hash`,
    [
      postId,
      userId,
      direction,
      decentralized.chainId || null,
      decentralized.contractAddress || null,
      decentralized.transactionHash || null,
    ],
  );
  const aggregates = await db.query(
    `SELECT
       SUM(CASE WHEN direction = 'up' THEN 1 ELSE 0 END) AS upvotes,
       SUM(CASE WHEN direction = 'down' THEN 1 ELSE 0 END) AS downvotes
     FROM votes WHERE post_id = $1`,
    [postId],
  );
  return {
    postId,
    upVotes: Number(aggregates.rows[0].upvotes) || 0,
    downVotes: Number(aggregates.rows[0].downvotes) || 0,
    decentralized: {
      chainId: decentralized.chainId || null,
      contractAddress: decentralized.contractAddress || null,
      transactionHash: decentralized.transactionHash || null,
      syncStatus: decentralized.syncStatus || "pending",
    },
  };
};

exports.applyToPoll = async ({ pollId, optionId, userId, decentralized = {} }) => {
  await db.query(
    `INSERT INTO poll_votes (
       poll_id,
       option_id,
       user_id,
       chain_id,
       contract_address,
       transaction_hash
     ) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (poll_id, user_id)
     DO UPDATE SET
       option_id = EXCLUDED.option_id,
       chain_id = EXCLUDED.chain_id,
       contract_address = EXCLUDED.contract_address,
       transaction_hash = EXCLUDED.transaction_hash`,
    [
      pollId,
      optionId,
      userId,
      decentralized.chainId || null,
      decentralized.contractAddress || null,
      decentralized.transactionHash || null,
    ],
  );
  const totals = await db.query(
    "SELECT option_id, COUNT(*) AS votes FROM poll_votes WHERE poll_id = $1 GROUP BY option_id",
    [pollId],
  );
  return {
    pollId,
    totals: totals.rows,
    decentralized: {
      chainId: decentralized.chainId || null,
      contractAddress: decentralized.contractAddress || null,
      transactionHash: decentralized.transactionHash || null,
      syncStatus: decentralized.syncStatus || "pending",
    },
  };
};
