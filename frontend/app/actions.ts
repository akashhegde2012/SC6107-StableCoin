'use server';

import { formatEther, parseEther, type Address, ContractFunctionExecutionError } from 'viem';

// Human-readable messages for each custom error name
const ERROR_MESSAGES: Record<string, (args?: readonly unknown[]) => string> = {
  StableCoinEngine__BreaksHealthFactor: (args) =>
    `Health factor too low${args?.[0] ? ` (would be ${(Number(args[0]) / 1e18).toFixed(4)})` : ''} — reduce mint amount or add more collateral`,
  StableCoinEngine__BurnAmountExceedsMinted: (args) =>
    `Burn amount exceeds your debt${args?.[0] && args?.[1] ? ` (burning ${(Number(args[0]) / 1e18).toFixed(4)}, minted ${(Number(args[1]) / 1e18).toFixed(4)})` : ''}`,
  StableCoinEngine__InsufficientCollateral: () =>
    'Insufficient collateral deposited',
  StableCoinEngine__HealthFactorOk: () =>
    'Position is healthy — cannot be liquidated',
  StableCoinEngine__HealthFactorNotImproved: () =>
    'Liquidation did not improve the health factor',
  StableCoinEngine__AmountMustBeMoreThanZero: () =>
    'Amount must be greater than zero',
  StableCoinEngine__TransferFailed: () =>
    'Token transfer failed — check your balance and allowance',
  StableCoinEngine__MintFailed: () =>
    'Stablecoin mint failed',
  StableCoinEngine__TokenNotAllowed: (args) =>
    `Token not accepted as collateral: ${args?.[0] ?? ''}`,
  StableCoinEngine__DebtReservedForAuction: () =>
    'Debt is reserved for an active liquidation auction',
};

function parseContractError(error: unknown): string {
  if (error instanceof ContractFunctionExecutionError) {
    // Try to get the decoded custom error
    const cause = error.cause as { data?: { errorName?: string; args?: readonly unknown[] } };
    const errorName = cause?.data?.errorName;
    if (errorName && ERROR_MESSAGES[errorName]) {
      return ERROR_MESSAGES[errorName](cause.data?.args);
    }
    if (errorName) {
      return `Contract error: ${errorName.replace('StableCoinEngine__', '').replace(/([A-Z])/g, ' $1').trim()}`;
    }
    // Fall back to shortMessage which is much cleaner than the full message
    return error.shortMessage ?? error.message;
  }
  return (error as Error).message;
}
import {
  publicClient,
  CONTRACTS,
  TOKENS,
  ERC20_ABI,
  STABLE_COIN_ENGINE_ABI,
  PRICE_FEED_ABI,
  defaultAccount,
} from '@/lib/contracts';
import { walletClient } from '@/lib/wallet';

// Types
export interface UserPosition {
  totalDebt: string;
  collateralValueUsd: string;
  healthFactor: string;
  collateralBalances: {
    token: string;
    symbol: string;
    balance: string;
    valueUsd: string;
  }[];
}

export interface ProtocolStats {
  totalSupply: string;
  liquidationThreshold: string;
  liquidationBonus: string;
  stabilityFee: string;
  protocolReserve: string;
  protocolBadDebt: string;
}

export interface TokenPrice {
  symbol: string;
  price: string;
  address: string;
}

export interface WalletBalances {
  eth: string;
  weth: string;
  wbtc: string;
  sc: string;
}

// Helper to format big numbers
function formatBigInt(value: bigint, decimals: number = 18): string {
  const str = value.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, -decimals) || '0';
  const decPart = str.slice(-decimals);
  return `${intPart}.${decPart.slice(0, 4)}`;
}

// Get user's position
export async function getUserPosition(userAddress?: string): Promise<UserPosition> {
  const address = (userAddress || defaultAccount) as Address;

  try {
    // Get account information
    const [totalDebt, collateralValueUsd] = await publicClient.readContract({
      address: CONTRACTS.STABLE_COIN_ENGINE,
      abi: STABLE_COIN_ENGINE_ABI,
      functionName: 'getAccountInformation',
      args: [address],
    });

    // Get health factor
    const healthFactor = await publicClient.readContract({
      address: CONTRACTS.STABLE_COIN_ENGINE,
      abi: STABLE_COIN_ENGINE_ABI,
      functionName: 'getHealthFactor',
      args: [address],
    });

    // Get collateral balances for each token
    const collateralBalances = await Promise.all(
      Object.values(TOKENS).map(async (token) => {
        const balance = await publicClient.readContract({
          address: CONTRACTS.STABLE_COIN_ENGINE,
          abi: STABLE_COIN_ENGINE_ABI,
          functionName: 'getCollateralBalanceOfUser',
          args: [address, token.address as Address],
        });

        let valueUsd = BigInt(0);
        if (balance > BigInt(0)) {
          valueUsd = await publicClient.readContract({
            address: CONTRACTS.STABLE_COIN_ENGINE,
            abi: STABLE_COIN_ENGINE_ABI,
            functionName: 'getUsdValue',
            args: [token.address as Address, balance],
          });
        }

        return {
          token: token.address,
          symbol: token.symbol,
          balance: formatEther(balance),
          valueUsd: formatEther(valueUsd),
        };
      })
    );

    // Format health factor (max uint256 means no debt)
    const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    const formattedHealthFactor = healthFactor === maxUint256
      ? '∞'
      : formatEther(healthFactor);

    return {
      totalDebt: formatEther(totalDebt),
      collateralValueUsd: formatEther(collateralValueUsd),
      healthFactor: formattedHealthFactor,
      collateralBalances,
    };
  } catch (error) {
    console.error('Error getting user position:', error);
    return {
      totalDebt: '0',
      collateralValueUsd: '0',
      healthFactor: '∞',
      collateralBalances: Object.values(TOKENS).map((token) => ({
        token: token.address,
        symbol: token.symbol,
        balance: '0',
        valueUsd: '0',
      })),
    };
  }
}

// Get protocol stats
export async function getProtocolStats(): Promise<ProtocolStats> {
  try {
    const [
      totalSupply,
      liquidationThreshold,
      liquidationBonus,
      stabilityFee,
      protocolReserve,
      protocolBadDebt,
    ] = await Promise.all([
      publicClient.readContract({
        address: CONTRACTS.STABLE_COIN,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      }),
      publicClient.readContract({
        address: CONTRACTS.STABLE_COIN_ENGINE,
        abi: STABLE_COIN_ENGINE_ABI,
        functionName: 'getLiquidationThreshold',
      }),
      publicClient.readContract({
        address: CONTRACTS.STABLE_COIN_ENGINE,
        abi: STABLE_COIN_ENGINE_ABI,
        functionName: 'getLiquidationBonus',
      }),
      publicClient.readContract({
        address: CONTRACTS.STABLE_COIN_ENGINE,
        abi: STABLE_COIN_ENGINE_ABI,
        functionName: 'getCurrentStabilityFeeBps',
      }),
      publicClient.readContract({
        address: CONTRACTS.STABLE_COIN_ENGINE,
        abi: STABLE_COIN_ENGINE_ABI,
        functionName: 'getProtocolReserve',
      }),
      publicClient.readContract({
        address: CONTRACTS.STABLE_COIN_ENGINE,
        abi: STABLE_COIN_ENGINE_ABI,
        functionName: 'getProtocolBadDebt',
      }),
    ]);

    return {
      totalSupply: formatEther(totalSupply),
      liquidationThreshold: liquidationThreshold.toString(),
      liquidationBonus: liquidationBonus.toString(),
      stabilityFee: (Number(stabilityFee) / 100).toFixed(2),
      protocolReserve: formatEther(protocolReserve),
      protocolBadDebt: formatEther(protocolBadDebt),
    };
  } catch (error) {
    console.error('Error getting protocol stats:', error);
    return {
      totalSupply: '0',
      liquidationThreshold: '50',
      liquidationBonus: '10',
      stabilityFee: '2.00',
      protocolReserve: '0',
      protocolBadDebt: '0',
    };
  }
}

// Get token prices
export async function getTokenPrices(): Promise<TokenPrice[]> {
  try {
    const prices = await Promise.all([
      // ETH price
      publicClient.readContract({
        address: CONTRACTS.WETH_PRICE_FEED,
        abi: PRICE_FEED_ABI,
        functionName: 'latestRoundData',
      }),
      // BTC price
      publicClient.readContract({
        address: CONTRACTS.WBTC_PRICE_FEED,
        abi: PRICE_FEED_ABI,
        functionName: 'latestRoundData',
      }),
      // SC price
      publicClient.readContract({
        address: CONTRACTS.SC_PRICE_FEED,
        abi: PRICE_FEED_ABI,
        functionName: 'latestRoundData',
      }),
    ]);

    return [
      {
        symbol: 'ETH',
        price: (Number(prices[0][1]) / 1e8).toFixed(2),
        address: CONTRACTS.WETH,
      },
      {
        symbol: 'BTC',
        price: (Number(prices[1][1]) / 1e8).toFixed(2),
        address: CONTRACTS.WBTC,
      },
      {
        symbol: 'SC',
        price: (Number(prices[2][1]) / 1e8).toFixed(4),
        address: CONTRACTS.STABLE_COIN,
      },
    ];
  } catch (error) {
    console.error('Error getting prices:', error);
    return [
      { symbol: 'ETH', price: '2000.00', address: CONTRACTS.WETH },
      { symbol: 'BTC', price: '30000.00', address: CONTRACTS.WBTC },
      { symbol: 'SC', price: '1.0000', address: CONTRACTS.STABLE_COIN },
    ];
  }
}

// Get wallet balances
export async function getWalletBalances(userAddress?: string): Promise<WalletBalances> {
  const address = (userAddress || defaultAccount) as Address;

  try {
    const [ethBalance, wethBalance, wbtcBalance, scBalance] = await Promise.all([
      publicClient.getBalance({ address }),
      publicClient.readContract({
        address: CONTRACTS.WETH,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      }),
      publicClient.readContract({
        address: CONTRACTS.WBTC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      }),
      publicClient.readContract({
        address: CONTRACTS.STABLE_COIN,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      }),
    ]);

    return {
      eth: formatEther(ethBalance),
      weth: formatEther(wethBalance),
      wbtc: formatEther(wbtcBalance),
      sc: formatEther(scBalance),
    };
  } catch (error) {
    console.error('Error getting balances:', error);
    return {
      eth: '0',
      weth: '0',
      wbtc: '0',
      sc: '0',
    };
  }
}

// Deposit collateral
export async function depositCollateral(
  tokenAddress: string,
  amount: string
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const amountWei = parseEther(amount);

    // First approve the StableCoinEngine to spend tokens
    const approveHash = await walletClient.writeContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.STABLE_COIN_ENGINE, amountWei],
    });

    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Then deposit
    const depositHash = await walletClient.writeContract({
      address: CONTRACTS.STABLE_COIN_ENGINE,
      abi: STABLE_COIN_ENGINE_ABI,
      functionName: 'depositCollateral',
      args: [tokenAddress as Address, amountWei],
    });

    await publicClient.waitForTransactionReceipt({ hash: depositHash });

    return { success: true, hash: depositHash };
  } catch (error) {
    console.error('Error depositing collateral:', error);
    return { success: false, error: parseContractError(error) };
  }
}

// Withdraw collateral
export async function withdrawCollateral(
  tokenAddress: string,
  amount: string
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const amountWei = parseEther(amount);

    const hash = await walletClient.writeContract({
      address: CONTRACTS.STABLE_COIN_ENGINE,
      abi: STABLE_COIN_ENGINE_ABI,
      functionName: 'redeemCollateral',
      args: [tokenAddress as Address, amountWei],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return { success: true, hash };
  } catch (error) {
    console.error('Error withdrawing collateral:', error);
    return { success: false, error: parseContractError(error) };
  }
}

// Mint stablecoin
export async function mintStableCoin(
  amount: string
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const amountWei = parseEther(amount);

    const hash = await walletClient.writeContract({
      address: CONTRACTS.STABLE_COIN_ENGINE,
      abi: STABLE_COIN_ENGINE_ABI,
      functionName: 'mintStableCoin',
      args: [amountWei],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return { success: true, hash };
  } catch (error) {
    console.error('Error minting stablecoin:', error);
    return { success: false, error: parseContractError(error) };
  }
}

// Burn stablecoin
export async function burnStableCoin(
  amount: string
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const amountWei = parseEther(amount);

    // First approve the StableCoinEngine to burn tokens
    const approveHash = await walletClient.writeContract({
      address: CONTRACTS.STABLE_COIN,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.STABLE_COIN_ENGINE, amountWei],
    });

    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    const hash = await walletClient.writeContract({
      address: CONTRACTS.STABLE_COIN_ENGINE,
      abi: STABLE_COIN_ENGINE_ABI,
      functionName: 'burnStableCoin',
      args: [amountWei],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return { success: true, hash };
  } catch (error) {
    console.error('Error burning stablecoin:', error);
    return { success: false, error: parseContractError(error) };
  }
}

// Get max mintable amount based on current collateral
export async function getMaxMintable(userAddress?: string): Promise<string> {
  const address = (userAddress || defaultAccount) as Address;

  try {
    const [, collateralValueUsd] = await publicClient.readContract({
      address: CONTRACTS.STABLE_COIN_ENGINE,
      abi: STABLE_COIN_ENGINE_ABI,
      functionName: 'getAccountInformation',
      args: [address],
    });

    const liquidationThreshold = await publicClient.readContract({
      address: CONTRACTS.STABLE_COIN_ENGINE,
      abi: STABLE_COIN_ENGINE_ABI,
      functionName: 'getLiquidationThreshold',
    });

    const currentDebt = await publicClient.readContract({
      address: CONTRACTS.STABLE_COIN_ENGINE,
      abi: STABLE_COIN_ENGINE_ABI,
      functionName: 'getStableCoinMinted',
      args: [address],
    });

    // Max mintable = (collateral * threshold / 100) - current debt
    const maxMintable = (collateralValueUsd * liquidationThreshold) / BigInt(100) - currentDebt;

    return maxMintable > BigInt(0) ? formatEther(maxMintable) : '0';
  } catch (error) {
    console.error('Error calculating max mintable:', error);
    return '0';
  }
}
