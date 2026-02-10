import { type UserPosition } from '@/app/actions';

interface PositionCardProps {
  position: UserPosition;
  maxMintable: string;
}

function HealthFactorGauge({ value }: { value: string }) {
  const isInfinite = value === '∞';
  const numValue = isInfinite ? 999 : parseFloat(value);
  const displayValue = isInfinite ? '∞' : numValue.toFixed(2);

  // Determine color and label
  let color = '#10b981'; // green
  let label = 'SAFE';
  let barWidth = '100%';

  if (!isInfinite) {
    if (numValue < 1.0) {
      color = '#ef4444';
      label = 'LIQUIDATABLE';
      barWidth = `${Math.max(5, (numValue / 3) * 100)}%`;
    } else if (numValue < 1.5) {
      color = '#ef4444';
      label = 'CRITICAL';
      barWidth = `${(numValue / 3) * 100}%`;
    } else if (numValue < 2.0) {
      color = '#f97316';
      label = 'AT RISK';
      barWidth = `${(numValue / 3) * 100}%`;
    } else if (numValue < 3.0) {
      color = '#f59e0b';
      label = 'MODERATE';
      barWidth = `${(numValue / 3) * 100}%`;
    } else {
      color = '#10b981';
      label = 'SAFE';
      barWidth = '100%';
    }
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Health Factor
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: '600',
            padding: '2px 8px',
            borderRadius: '10px',
            background: `${color}15`,
            border: `1px solid ${color}30`,
            color,
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          fontSize: '40px',
          fontWeight: '800',
          color,
          lineHeight: 1,
          marginBottom: '10px',
          fontFamily: 'var(--font-geist-mono)',
        }}
      >
        {displayValue}
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '4px',
          background: '#1e1e2e',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: barWidth,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            borderRadius: '2px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {!isInfinite && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#374151' }}>
          <span>0 (Liquidatable)</span>
          <span>3+ (Safe)</span>
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid #1a1a24',
      }}
    >
      <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
      <span
        style={{
          fontSize: '13px',
          fontWeight: '600',
          color: highlight ? '#f59e0b' : '#f1f5f9',
          fontFamily: 'var(--font-geist-mono)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function PositionCard({ position, maxMintable }: PositionCardProps) {
  const hasDebt = parseFloat(position.totalDebt) > 0;
  const collateralValue = parseFloat(position.collateralValueUsd);
  const debtValue = parseFloat(position.totalDebt);
  const collateralRatio = hasDebt && debtValue > 0 ? ((collateralValue / debtValue) * 100).toFixed(1) : '∞';

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>
          Your Position
        </h3>
        {!hasDebt && (
          <span
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#34d399',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            No Debt
          </span>
        )}
      </div>

      <HealthFactorGauge value={position.healthFactor} />

      <div style={{ marginBottom: '4px' }}>
        <MetricRow
          label="Collateral Value (USD)"
          value={`$${parseFloat(position.collateralValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <MetricRow
          label="Total Debt (SC)"
          value={`${parseFloat(position.totalDebt).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} SC`}
          highlight={hasDebt}
        />
        <MetricRow
          label="Collateral Ratio"
          value={collateralRatio === '∞' ? '∞' : `${collateralRatio}%`}
        />
        <MetricRow
          label="Max Mintable"
          value={`${parseFloat(maxMintable).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SC`}
        />
      </div>

      {/* Collateral Breakdown */}
      {position.collateralBalances.some((b) => parseFloat(b.balance) > 0) && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Collateral Breakdown
          </div>
          {position.collateralBalances.map((col) => {
            const bal = parseFloat(col.balance);
            const val = parseFloat(col.valueUsd);
            if (bal === 0 && val === 0) return null;
            const sharePercent = collateralValue > 0 ? (val / collateralValue) * 100 : 0;

            return (
              <div
                key={col.symbol}
                style={{
                  padding: '10px 12px',
                  background: '#0d0d14',
                  borderRadius: '8px',
                  marginBottom: '6px',
                  border: '1px solid #1a1a24',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: col.symbol === 'WETH' ? 'rgba(98, 126, 234, 0.2)' : 'rgba(247, 147, 26, 0.2)',
                        border: `1px solid ${col.symbol === 'WETH' ? 'rgba(98, 126, 234, 0.4)' : 'rgba(247, 147, 26, 0.4)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        color: col.symbol === 'WETH' ? '#627EEA' : '#F7931A',
                        fontWeight: '700',
                      }}
                    >
                      {col.symbol === 'WETH' ? 'Ξ' : '₿'}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9' }}>{col.symbol}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9', fontFamily: 'var(--font-geist-mono)' }}>
                      {bal.toFixed(4)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                {/* Share bar */}
                <div style={{ height: '2px', background: '#1e1e2e', borderRadius: '1px' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${sharePercent}%`,
                      background: col.symbol === 'WETH' ? '#627EEA' : '#F7931A',
                      borderRadius: '1px',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No collateral message */}
      {!position.collateralBalances.some((b) => parseFloat(b.balance) > 0) && (
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            background: '#0d0d14',
            borderRadius: '8px',
            border: '1px dashed #1e1e2e',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏦</div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>No collateral deposited yet</div>
          <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px' }}>
            Deposit WETH or WBTC to start minting SC
          </div>
        </div>
      )}
    </div>
  );
}
