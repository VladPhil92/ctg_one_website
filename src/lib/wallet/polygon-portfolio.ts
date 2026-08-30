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
  {
    type: 'function',
    stateMutability: 'view',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

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

function configuredCtgTokenAddress(): Address | null {
  const value = process.env.CTG_TOKEN_POLYGON_ADDRESS?.trim();
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

/**
 * Reads display-only Polygon balances for a server-resolved, verified CTG wallet
 * account. It never signs, sends, approves, swaps or derives wallet ownership
 * from a browser-supplied address.
 *
 * A Polygon/RPC failure is deliberately isolated from the COP wallet read path:
 * blockchain balances are a separate authority and must not make the canonical
 * CTG ledger unavailable.
 */
export async function readPolygonPortfolio(
  accountAddress: string | null,
): Promise<WalletOverviewBlockchainPortfolio> {
  if (!accountAddress) return unavailable(null, 'NO_VERIFIED_EVM_ACCOUNT');
  if (!isAddress(accountAddress)) return unavailable(null, 'INVALID_VERIFIED_EVM_ACCOUNT');

  const address = getAddress(accountAddress);
  const rpcUrl = configuredRpcUrl();
  if (!rpcUrl) return unavailable(address, 'RPC_NOT_CONFIGURED');

  const client = createPublicClient({ chain: polygon, transport: http(rpcUrl) });
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

  const ctgTokenAddress = configuredCtgTokenAddress();
  let status: WalletOverviewBlockchainPortfolio['status'] = 'available';
  let reason: WalletOverviewBlockchainPortfolio['reason'] = null;

  if (process.env.CTG_TOKEN_POLYGON_ADDRESS?.trim() && !ctgTokenAddress) {
    status = 'degraded';
    reason = 'CTG_TOKEN_CONFIG_INVALID';
  } else if (ctgTokenAddress) {
    try {
      const [rawBalance, decimals, symbol] = await Promise.all([
        client.readContract({
          address: ctgTokenAddress,
          abi: ERC20_BALANCE_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        client.readContract({
          address: ctgTokenAddress,
          abi: ERC20_BALANCE_ABI,
          functionName: 'decimals',
        }),
        client.readContract({
          address: ctgTokenAddress,
          abi: ERC20_BALANCE_ABI,
          functionName: 'symbol',
        }),
      ]);

      positions.push({
        authority: 'blockchain',
        network: POLYGON_NETWORK,
        chainId: POLYGON_CHAIN_ID,
        accountAddress: address,
        assetKind: 'erc20',
        assetAddress: ctgTokenAddress,
        symbol,
        decimals,
        rawBalance: rawBalance.toString(),
        formattedBalance: formatUnits(rawBalance, decimals),
      });
    } catch {
      status = 'degraded';
      reason = 'CTG_TOKEN_READ_FAILED';
    }
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
