export const WEB3_CONFIG = {
  chainId: Number(process.env.EXPO_PUBLIC_CHAIN_ID || 84532),
  chainName: process.env.EXPO_PUBLIC_CHAIN_NAME || "Base Sepolia",
  socialContractAddress:
    process.env.EXPO_PUBLIC_SOCIAL_CONTRACT_ADDRESS || "",
  storageMode: process.env.EXPO_PUBLIC_STORAGE_MODE || "hybrid-ipfs",
};
