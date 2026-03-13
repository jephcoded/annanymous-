# Decentralized v1 plan

This workspace now targets a practical hybrid architecture:

- Network: Base Sepolia
- Wallet: MetaMask
- Storage: backend + IPFS-ready metadata
- On-chain records: post hashes, comment hashes, post votes, poll votes

## What is implemented in code

### Frontend
- Shared web3 config in [src/config/web3.ts](../src/config/web3.ts)
- Decentralized metadata builders in [src/services/decentralized.ts](../src/services/decentralized.ts)
- Posting, commenting, and voting requests can now send decentralized metadata to the backend

### Backend
- Schema supports decentralized metadata for posts, comments, votes, and poll votes
- Controllers/models accept and return decentralized metadata
- Existing REST API remains compatible with current UI

### Contracts
- Solidity contract in [contracts/AnonymousSocial.sol](../contracts/AnonymousSocial.sol)
- Contract anchors content hashes and emits vote events

## Required environment values

### Frontend
- `EXPO_PUBLIC_CHAIN_ID=84532`
- `EXPO_PUBLIC_CHAIN_NAME=Base Sepolia`
- `EXPO_PUBLIC_SOCIAL_CONTRACT_ADDRESS=`
- `EXPO_PUBLIC_STORAGE_MODE=hybrid-ipfs`

### Backend
Add the deployed contract address to post/comment anchor workers later if desired.

## Remaining production steps
1. Deploy `AnonymousSocial.sol` to Base Sepolia
2. Set `EXPO_PUBLIC_SOCIAL_CONTRACT_ADDRESS`
3. Add an IPFS uploader for content/media
4. Add a worker that anchors backend-created post/comment hashes on-chain
5. Persist returned transaction hashes back into the API records
6. Test the full mobile MetaMask transaction flow in a dev build

## Honest status
This is now decentralized-ready hybrid architecture, not fully on-chain social storage.
