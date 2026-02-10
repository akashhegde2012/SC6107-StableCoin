// Server-only — never import this from a client component
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { anvil } from '@/lib/contracts';

const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;

if (!privateKey) {
  throw new Error('DEPLOYER_PRIVATE_KEY is not set in environment variables');
}

export const account = privateKeyToAccount(privateKey);

export const walletClient = createWalletClient({
  account,
  chain: anvil,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? 'http://127.0.0.1:8545'),
});
