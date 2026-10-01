import 'server-only';

import {
  createPublicClient,
  formatUnits,
  getAddress,
  http,
  isAddress,
  type Address,
} from 'viem';
import { polygon } from 'viem/chains';

import type {
  WalletOverviewBlockchainPortfolio,
  WalletOverviewBlockchainPosition,
} from '@/lib/wallet/domain';

const POLYGON_CHAIN_ID = 137 as const;
const POLYGON_NETWORK = 'polygon' as const;

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const CANONICAL_POLYGON_ERC20_ASSETS = [
  {
    symbol: 'USDC',
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    decimals: 6,
  },
  {
    symbol: 'USDT',
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
  },
  {
    symbol: 'WETH',
    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    decimals: 18,
  },
  {
    symbol: 'WBTC',
    address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    decimals: 8,
  },
] as const;

const CANONICAL_CTG_TOKEN_ADDRESS = '0xe4200d6beD0DB8E720Cbb840c572182676515132' as const;

function unavailable(
  accountAddress: string | null,
  reason: WalletOverviewBlockchainPortfolio['reason'],
): WalletOverviewBlockchainPortfolio {
  return {
    network: POLYGON_NETWORK,
    chainId: POLYGON_CHAIN_ID,
    accountAddress,
    status: accountAddress ? 'unavailable' : 'not_linked',
    reason,
    positions: [],
    asOf: new Date().toISOString(),
  };
}

function configuredRpcUrl(): string | null {
  const value = process.env.POLYGON_RPC_URL?.trim();
  return value ? value : null;
}

function configuredCtgTokenAddress(): { address: Address | null; invalid: boolean } {
  const configured = process.env.CTG_TOKEN_POLYGON_ADDRESS?.trim();
  if (!configured) return { address: getAddress(CANONICAL_CTG_TOKEN_ADDRESS), invalid: false };
  if (!isAddress(configured)) return { address: null, invalid: true };
  return { address: getAddress(configured), invalid: false };
}

function erc20Position(
  accountAddress: Address,
  assetAddress: Address,
  symbol: string,
  decimals: number,
  rawBalance: bigint,
): WalletOverviewBlockchainPosition {
  return {
    authority: 'blockchain',
    network: POLYGON_NETWORK,
    chainId: POLYGON_CHAIN_ID,
    accountAddress,
    assetKind: 'erc20',
    assetAddress,
    symbol,
    decimals,
    rawBalance: rawBalance.toString(),
    formattedBalance: formatUnits(rawBalance, decimals),
  };
}

/**
 * Reads the canonical display-only Polygon portfolio for a server-resolved,
 * verified CTG wallet. The registry mirrors the legacy CTG Wallet Polygon
 * surface (POL, CTG, USDC, USDT, WETH and WBTC) so identity convergence does
 * not silently collapse a funded historical portfolio to only POL + CTG.
 *
 * This reader never signs, sends, approves, swaps or derives wallet ownership
 * from a browser-supplied address. A provider failure is isolated from the CTG
 * ledger: native-balance failure makes blockchain data unavailable; individual
 * ERC-20 failures degrade the portfolio while preserving successful positions.
 */
export async function readPolygonPortfolio(
  accountAddress: string | null,
): Promise<WalletOverviewBlockchainPortfolio> {
  if (!accountAddress) return unavailable(null, 'NO_VERIFIED_EVM_ACCOUNT');
  if (!isAddress(accountAddress)) return unavailable(null, 'INVALID_VERIFIED_EVM_ACCOUNT');

  const address = getAddress(accountAddress);
  const rpcUrl = configuredRpcUrl();
  if (!rpcUrl) return unavailable(address, 'RPC_NOT_CONFIGURED');

  const client = createPublicClient({
    chain: polygon,
    transport: http(rpcUrl, { timeout: 8_000, retryCount: 1 }),
  });

  try {
    const chainId = await client.getChainId();
    if (chainId !== POLYGON_CHAIN_ID) return unavailable(address, 'RPC_CHAIN_MISMATCH');
  } catch {
    return unavailable(address, 'RPC_READ_FAILED');
  }

  const positions: WalletOverviewBlockchainPosition[] = [];

  try {
    const rawBalance = await client.getBalance({ address });
    positions.push({
      authority: 'blockchain',
      network: POLYGON_NETWORK,
      chainId: POLYGON_CHAIN_ID,
      accountAddress: address,
      assetKind: 'native',
      assetAddress: null,
      symbol: 'POL',
      decimals: 18,
      rawBalance: rawBalance.toString(),
      formattedBalance: formatUnits(rawBalance, 18),
    });
  } catch {
    return unavailable(address, 'RPC_READ_FAILED');
  }

  const ctg = configuredCtgTokenAddress();
  const assets: Array<{ symbol: string; address: Address; decimals: number }> = [];
  if (ctg.address) assets.push({ symbol: 'CTG', address: ctg.address, decimals: 18 });
  for (const asset of CANONICAL_POLYGON_ERC20_ASSETS) {
    assets.push({
      symbol: asset.symbol,
      address: getAddress(asset.address),
      decimals: asset.decimals,
    });
  }

  const reads = await Promise.allSettled(
    assets.map(async (asset) => {
      const rawBalance = await client.readContract({
        address: asset.address,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      return erc20Position(address, asset.address, asset.symbol, asset.decimals, rawBalance);
    }),
  );

  for (const result of reads) {
    if (result.status === 'fulfilled') positions.push(result.value);
  }

  const failedTokenReads = reads.filter((result) => result.status === 'rejected').length;
  let status: WalletOverviewBlockchainPortfolio['status'] = 'available';
  let reason: WalletOverviewBlockchainPortfolio['reason'] = null;

  if (ctg.invalid) {
    status = 'degraded';
    reason = 'CTG_TOKEN_CONFIG_INVALID';
  }
  if (failedTokenReads > 0) {
    status = 'degraded';
    reason = 'TOKEN_READ_PARTIAL_FAILURE';
  }

  return {
    network: POLYGON_NETWORK,
    chainId: POLYGON_CHAIN_ID,
    accountAddress: address,
    status,
    reason,
    positions,
    asOf: new Date().toISOString(),
  };
}
