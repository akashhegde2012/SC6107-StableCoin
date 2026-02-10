'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { mintStableCoin, burnStableCoin } from '@/app/actions';

interface StablecoinCardProps {
  scBalance: string;
  totalDebt: string;
  maxMintable: string;
  stabilityFee: string;
}

type ActionTab = 'mint' | 'burn';

interface TxResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export default function StablecoinCard({
  scBalance,
  totalDebt,
  maxMintable,
  stabilityFee,
}: StablecoinCardProps) {
  const [actionTab, setActionTab] = useState<ActionTab>('mint');
  const [amount, setAmount] = useState('');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TxResult | null>(null);
  const router = useRouter();

  const availableBalance = actionTab === 'mint' ? maxMintable : scBalance;
  const balanceLabel = actionTab === 'mint' ? 'Max Mintable' : 'SC Balance';

  const handleAction = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setResult(null);

    startTransition(async () => {
      let res: TxResult;
      if (actionTab === 'mint') {
        res = await mintStableCoin(amount);
      } else {
        res = await burnStableCoin(amount);
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

  const debtAfterAction = () => {
    if (!amount || parseFloat(amount) <= 0) return null;
    const current = parseFloat(totalDebt);
    const change = parseFloat(amount);
    if (actionTab === 'mint') {
      return (current + change).toFixed(4);
    } else {
      return Math.max(0, current - change).toFixed(4);
    }
  };

  const newDebt = debtAfterAction();

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>
          StableCoin (SC)
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '20px',
            fontSize: '11px',
            color: '#34d399',
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '700',
            }}
          >
            $
          </div>
          $1.00 USD
        </div>
      </div>

      {/* Current stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            padding: '12px',
            background: '#0d0d14',
            borderRadius: '8px',
            border: '1px solid #1a1a24',
          }}
        >
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Your Debt</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', fontFamily: 'var(--font-geist-mono)' }}>
            {parseFloat(totalDebt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </div>
          <div style={{ fontSize: '10px', color: '#4b5563' }}>SC minted</div>
        </div>
        <div
          style={{
            padding: '12px',
            background: '#0d0d14',
            borderRadius: '8px',
            border: '1px solid #1a1a24',
          }}
        >
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Wallet Balance</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', fontFamily: 'var(--font-geist-mono)' }}>
            {parseFloat(scBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </div>
          <div style={{ fontSize: '10px', color: '#4b5563' }}>SC available</div>
        </div>
      </div>

      {/* Stability fee notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          borderRadius: '6px',
          marginBottom: '16px',
        }}
      >
        <span style={{ fontSize: '13px' }}>📈</span>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          Current stability fee:{' '}
          <span style={{ color: '#818cf8', fontWeight: '600' }}>{stabilityFee}% APR</span>
          {' '}— debt grows over time
        </div>
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
        {(['mint', 'burn'] as ActionTab[]).map((tab) => (
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
              color: actionTab === tab ? (tab === 'mint' ? '#f59e0b' : '#ef4444') : '#6b7280',
            }}
          >
            {tab === 'mint' ? '+ Mint SC' : '- Burn SC'}
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
            color: actionTab === 'mint' ? '#f59e0b' : '#ef4444',
            background:
              actionTab === 'mint'
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            border: 'none',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          MAX: {parseFloat(availableBalance).toFixed(4)} SC
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
          style={{ paddingRight: '48px' }}
        />
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '13px',
            fontWeight: '600',
            color: '#10b981',
          }}
        >
          SC
        </div>
      </div>

      {/* Preview */}
      {newDebt !== null && (
        <div
          style={{
            padding: '8px 12px',
            background: '#0d0d14',
            borderRadius: '6px',
            border: '1px solid #1a1a24',
            marginBottom: '12px',
            fontSize: '12px',
          }}
        >
          <span style={{ color: '#6b7280' }}>New debt after action: </span>
          <span
            style={{
              color: actionTab === 'mint' ? '#f59e0b' : '#10b981',
              fontWeight: '600',
              fontFamily: 'var(--font-geist-mono)',
            }}
          >
            {newDebt} SC
          </span>
        </div>
      )}

      {/* Action button */}
      <button
        className={actionTab === 'burn' ? 'btn-danger' : 'btn-primary'}
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
            {actionTab === 'mint' ? 'Minting...' : 'Burning...'}
          </>
        ) : (
          <>{actionTab === 'mint' ? '+ Mint SC' : '- Burn SC'}</>
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
        <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: '1.6' }}>
          {actionTab === 'mint' ? (
            <>
              Minting reduces your health factor.
              <br />
              Max mintable = <span style={{ color: '#f59e0b' }}>collateral × 50%</span> — current debt
              <br />
              Keep health factor above <span style={{ color: '#ef4444' }}>1.0</span> to avoid liquidation
            </>
          ) : (
            <>
              Burning SC repays your debt and improves your health factor.
              <br />
              The engine will approve and burn tokens from your wallet.
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
