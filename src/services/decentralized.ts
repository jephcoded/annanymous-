import { utils } from "ethers";
import { WEB3_CONFIG } from "../config/web3";

export type DecentralizedPayload = {
  contentCid?: string | null;
  contentHash?: string | null;
  chainId?: number | null;
  contractAddress?: string | null;
  transactionHash?: string | null;
  syncStatus?: string | null;
};

const normalizeContractAddress = () =>
  WEB3_CONFIG.socialContractAddress?.trim() || null;

export const buildContentRecord = (
  content: string,
  overrides: Partial<DecentralizedPayload> = {},
): DecentralizedPayload => {
  const trimmed = content.trim();
  const baseHash = trimmed ? utils.keccak256(utils.toUtf8Bytes(trimmed)) : null;

  return {
    contentCid: null,
    contentHash: baseHash,
    chainId: WEB3_CONFIG.chainId,
    contractAddress: normalizeContractAddress(),
    transactionHash: null,
    syncStatus: normalizeContractAddress()
      ? "awaiting_anchor"
      : "offchain_only",
    ...overrides,
  };
};

export const buildActionRecord = (
  overrides: Partial<DecentralizedPayload> = {},
): DecentralizedPayload => ({
  chainId: WEB3_CONFIG.chainId,
  contractAddress: normalizeContractAddress(),
  transactionHash: null,
  syncStatus: normalizeContractAddress() ? "awaiting_anchor" : "offchain_only",
  ...overrides,
});

export const detectIpfsCid = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("ipfs://")) {
    return normalized.replace("ipfs://", "").split("/")[0] || null;
  }

  const marker = "/ipfs/";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  return normalized.slice(markerIndex + marker.length).split("/")[0] || null;
};
