import { createPublicClient, http, defineChain, type Address } from 'viem';

// Anvil local chain configuration
export const anvil = defineChain({
  id: 31337,
  name: 'Anvil',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? 'http://127.0.0.1:8545'],
    },
  },
});

// Contract Addresses (from deployment on Anvil chain 31337)
export const CONTRACTS = {
  WETH: (process.env.NEXT_PUBLIC_CONTRACT_WETH ?? '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512') as Address,
  WBTC: (process.env.NEXT_PUBLIC_CONTRACT_WBTC ?? '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9') as Address,
  WETH_PRICE_FEED: (process.env.NEXT_PUBLIC_CONTRACT_WETH_PRICE_FEED ?? '0x5FbDB2315678afecb367f032d93F642f64180aa3') as Address,
  WBTC_PRICE_FEED: (process.env.NEXT_PUBLIC_CONTRACT_WBTC_PRICE_FEED ?? '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0') as Address,
  SC_PRICE_FEED: (process.env.NEXT_PUBLIC_CONTRACT_SC_PRICE_FEED ?? '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9') as Address,
  STABLE_COIN: (process.env.NEXT_PUBLIC_CONTRACT_STABLE_COIN ?? '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707') as Address,
  STABLE_COIN_ENGINE: (process.env.NEXT_PUBLIC_CONTRACT_STABLE_COIN_ENGINE ?? '0x0165878A594ca255338adfa4d48449f69242Eb8F') as Address,
} as const;

// Default Anvil accounts
export const ANVIL_ACCOUNTS = {
  deployer: (process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS ?? '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266') as Address,
  user1: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
  user2: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
} as const;

// Token info
export const TOKENS = {
  WETH: {
    address: CONTRACTS.WETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    priceFeed: CONTRACTS.WETH_PRICE_FEED,
  },
  WBTC: {
    address: CONTRACTS.WBTC,
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 18,
    priceFeed: CONTRACTS.WBTC_PRICE_FEED,
  },
} as const;

// ERC20 ABI (minimal)
export const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// StableCoinEngine ABI (essential functions)
export const STABLE_COIN_ENGINE_ABI = [
  // Custom errors — required for viem to decode revert reasons
  { type: 'error', name: 'StableCoinEngine__BreaksHealthFactor', inputs: [{ name: 'healthFactor', type: 'uint256' }] },
  { type: 'error', name: 'StableCoinEngine__BurnAmountExceedsMinted', inputs: [{ name: 'burnAmount', type: 'uint256' }, { name: 'mintedAmount', type: 'uint256' }] },
  { type: 'error', name: 'StableCoinEngine__InsufficientCollateral', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__HealthFactorOk', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__HealthFactorNotImproved', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__AmountMustBeMoreThanZero', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__TransferFailed', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__MintFailed', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__TokenNotAllowed', inputs: [{ name: 'tokenCollateralAddress', type: 'address' }] },
  { type: 'error', name: 'StableCoinEngine__ZeroAddress', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__ArrayLengthMismatch', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__InvalidPrice', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__Unauthorized', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__LiquidationAuctionNotConfigured', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__LiquidationAuctionAlreadyConfigured', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__OnlyLiquidationAuction', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__ActiveLiquidationAuctionExists', inputs: [{ name: 'user', type: 'address' }, { name: 'tokenCollateralAddress', type: 'address' }] },
  { type: 'error', name: 'StableCoinEngine__DebtReservedForAuction', inputs: [{ name: 'reservedDebt', type: 'uint256' }, { name: 'burnAmount', type: 'uint256' }] },
  { type: 'error', name: 'StableCoinEngine__DebtNotAvailableForLiquidation', inputs: [{ name: 'availableDebt', type: 'uint256' }, { name: 'requestedDebt', type: 'uint256' }] },
  { type: 'error', name: 'StableCoinEngine__AuctionNotActive', inputs: [{ name: 'auctionId', type: 'uint256' }] },
  { type: 'error', name: 'StableCoinEngine__InvalidAuctionSettlement', inputs: [] },
  { type: 'error', name: 'StableCoinEngine__AuctionBurnExceedsDebt', inputs: [{ name: 'burnAmount', type: 'uint256' }, { name: 'mintedAmount', type: 'uint256' }] },
  // View functions
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getAccountInformation',
    outputs: [
      { name: 'totalStableCoinMinted', type: 'uint256' },
      { name: 'collateralValueInUsd', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getHealthFactor',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'tokenCollateralAddress', type: 'address' },
    ],
    name: 'getCollateralBalanceOfUser',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getStableCoinMinted',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCollateralTokens',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenCollateralAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'getUsdValue',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenCollateralAddress', type: 'address' },
      { name: 'usdAmountInWei', type: 'uint256' },
    ],
    name: 'getTokenAmountFromUsd',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getLiquidationThreshold',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getLiquidationBonus',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMinHealthFactor',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getRate',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentStabilityFeeBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getProtocolReserve',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getProtocolBadDebt',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getStableCoinAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getAccountCollateralValueInUsd',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { name: 'tokenCollateralAddress', type: 'address' },
      { name: 'amountCollateral', type: 'uint256' },
    ],
    name: 'depositCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenCollateralAddress', type: 'address' },
      { name: 'amountCollateral', type: 'uint256' },
    ],
    name: 'redeemCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amountStableCoinToMint', type: 'uint256' }],
    name: 'mintStableCoin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'burnStableCoin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenCollateralAddress', type: 'address' },
      { name: 'user', type: 'address' },
      { name: 'debtToCover', type: 'uint256' },
    ],
    name: 'liquidate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// MockV3Aggregator ABI for price feeds
export const PRICE_FEED_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Public client (safe to use in both server and client contexts)
export const publicClient = createPublicClient({
  chain: anvil,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? 'http://127.0.0.1:8545'),
});

export const defaultAccount = ANVIL_ACCOUNTS.deployer;
