// Web3 Types for CTG One Token Integration

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  contractAddress: string;
  network: string;
  chainId: number;
}

export interface UserBalance {
  ctgoBalance: string;
  usdValue: string;
  lastUpdated: Date;
}

export interface Transaction {
  id: string;
  hash: string;
  type: 'buy' | 'sell' | 'stake' | 'unstake' | 'transfer';
  amount: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  from: string;
  to: string;
}

export interface StakingPool {
  id: string;
  name: string;
  apy: number;
  minStake: string;
  lockPeriod: number; // days
  totalStaked: string;
  userStaked?: string;
  rewards?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  walletAddress?: string;
  createdAt: Date;
  kycVerified: boolean;
  tier: 'basic' | 'silver' | 'gold' | 'platinum';
}

export interface TradeOrder {
  type: 'buy' | 'sell';
  amount: string;
  price: string;
  total: string;
  currency: 'USD' | 'USDC' | 'USDT';
}

// Contract ABIs (placeholder - to be replaced with actual ABI)
export const CTG_ONE_TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
] as const;

// Network Configuration
export const SUPPORTED_NETWORKS = {
  // Ethereum Mainnet
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
  },
  // Polygon
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
  },
  // BSC
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    blockExplorer: 'https://bscscan.com',
  },
} as const;

// Token Configuration (placeholder - to be updated with actual contract)
export const CTG_ONE_TOKEN: TokenInfo = {
  name: 'CTG One Token',
  symbol: 'CTGO',
  decimals: 18,
  totalSupply: '1000000000', // 1 billion
  contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
  network: 'polygon',
  chainId: 137,
};
