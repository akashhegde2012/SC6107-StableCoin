'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CONTRACTS } from '@/lib/contracts';
import { depositCollateral, withdrawCollateral } from '@/app/actions';

interface CollateralCardProps {
  wethBalance: string;
  wbtcBalance: string;
  wethDeposited: string;
  wbtcDeposited: string;
}

type TokenKey = 'WETH' | 'WBTC';
type ActionTab = 'deposit' | 'withdraw';

const TOKENS = {
  WETH: {
    address: CONTRACTS.WETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    icon: 'Ξ',
    color: '#627EEA',
    bgColor: 'rgba(98, 126, 234, 0.1)',
    borderColor: 'rgba(98, 126, 234, 0.25)',
  },
  WBTC: {
    address: CONTRACTS.WBTC,
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    icon: '₿',
    color: '#F7931A',
    bgColor: 'rgba(247, 147, 26, 0.1)',
    borderColor: 'rgba(247, 147, 26, 0.25)',
  },
} as const;

interface TxResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export default function CollateralCard({
  wethBalance,
  wbtcBalance,
  wethDeposited,
  wbtcDeposited,
}: CollateralCardProps) {
  const [selectedToken, setSelectedToken] = useState<TokenKey>('WETH');
  const [actionTab, setActionTab] = useState<ActionTab>('deposit');
  const [amount, setAmount] = useState('');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TxResult | null>(null);
  const router = useRouter();

  const token = TOKENS[selectedToken];
  const walletBalance = selectedToken === 'WETH' ? wethBalance : wbtcBalance;
  const depositedBalance = selectedToken === 'WETH' ? wethDeposited : wbtcDeposited;

  const availableBalance = actionTab === 'deposit' ? walletBalance : depositedBalance;
  const balanceLabel = actionTab === 'deposit' ? 'Wallet Balance' : 'Deposited';

  const handleAction = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setResult(null);

    startTransition(async () => {
      let res: TxResult;
      if (actionTab === 'deposit') {
        res = await depositCollateral(token.address, amount);
      } else {
        res = await withdrawCollateral(token.address, amount);
      }
      setResult(res);
      if (res.success) {
        setAmount('');
        router.refresh();
      }
    });
  };

  const setMaxAmount = () => {
    setAmount(parseFloat(availableBalance).toFixed(6));
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 20px 0' }}>
        Manage Collateral
      </h3>

      {/* Token Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(Object.keys(TOKENS) as TokenKey[]).map((key) => {
          const t = TOKENS[key];
          const isSelected = selectedToken === key;
          return (
            <button
              key={key}
              onClick={() => {
                setSelectedToken(key);
                setAmount('');
                setResult(null);
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: `1px solid ${isSelected ? t.borderColor : '#1e1e2e'}`,
                background: isSelected ? t.bgColor : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: t.bgColor,
                  border: `1px solid ${t.borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: t.color,
                  fontWeight: '700',
                }}
              >
                {t.icon}
              </div>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isSelected ? t.color : '#94a3b8',
                }}
              >
                {t.symbol}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action Tabs */}
      <div
        style={{
          display: 'flex',
          background: '#0d0d14',
          borderRadius: '8px',
          padding: '3px',
          marginBottom: '16px',
          border: '1px solid #1e1e2e',
        }}
      >
        {(['deposit', 'withdraw'] as ActionTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActionTab(tab);
              setAmount('');
              setResult(null);
            }}
            style={{
              flex: 1,
              padding: '7px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s',
              background: actionTab === tab ? '#1e1e2e' : 'transparent',
              color: actionTab === tab ? '#f1f5f9' : '#6b7280',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'deposit' ? '↓ Deposit' : '↑ Withdraw'}
          </button>
        ))}
      </div>

      {/* Balance info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '12px', color: '#6b7280' }}>{balanceLabel}</span>
        <button
          onClick={setMaxAmount}
          style={{
            fontSize: '11px',
            color: token.color,
            background: token.bgColor,
            border: 'none',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          MAX: {parseFloat(availableBalance).toFixed(4)} {token.symbol}
        </button>
      </div>

      {/* Amount input */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <input
          type="number"
          className="input-field"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.0001"
          style={{ paddingRight: '70px' }}
        />
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '13px',
            fontWeight: '600',
            color: token.color,
          }}
        >
          {token.symbol}
        </div>
      </div>

      {/* USD estimate */}
      {amount && parseFloat(amount) > 0 && (
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', textAlign: 'right' }}>
          ≈ ${(parseFloat(amount) * (selectedToken === 'WETH' ? 2000 : 30000)).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
        </div>
      )}

      {/* Action button */}
      <button
        className={actionTab === 'withdraw' ? 'btn-danger' : 'btn-primary'}
        onClick={handleAction}
        disabled={isPending || !amount || parseFloat(amount) <= 0}
        style={{ width: '100%' }}
      >
        {isPending ? (
          <>
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                border: '2px solid currentColor',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            {actionTab === 'deposit' ? 'Depositing...' : 'Withdrawing...'}
          </>
        ) : (
          <>
            {actionTab === 'deposit' ? '↓ Deposit' : '↑ Withdraw'} {token.symbol}
          </>
        )}
      </button>

      {/* Result feedback */}
      {result && (
        <div
          className={result.success ? 'toast-success' : 'toast-error'}
          style={{ marginTop: '12px' }}
        >
          {result.success ? (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                ✓ Transaction confirmed
              </div>
              {result.hash && (
                <div
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-geist-mono)',
                    opacity: 0.8,
                    wordBreak: 'break-all',
                  }}
                >
                  {result.hash.slice(0, 20)}...
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '2px' }}>✗ Transaction failed</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>
                {result.error?.slice(0, 100)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info footer */}
      <div
        style={{
          marginTop: '16px',
          padding: '10px',
          background: '#0d0d14',
          borderRadius: '6px',
          border: '1px solid #1a1a24',
        }}
      >
        <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: '1.5' }}>
          {actionTab === 'deposit' ? (
            <>
              Depositing collateral increases your borrowing capacity.
              <br />
              Liquidation threshold: <span style={{ color: '#f59e0b' }}>50%</span> — maintain health factor above 1.0
            </>
          ) : (
            <>
              Withdrawing reduces your health factor.
              <br />
              Ensure your position stays above the minimum health factor of{' '}
              <span style={{ color: '#ef4444' }}>1.0</span>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
