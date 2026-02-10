import { type ProtocolStats } from '@/app/actions';

interface ProtocolStatsGridProps {
  stats: ProtocolStats;
}

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: string;
  accentColor?: string;
  description?: string;
}

function StatCard({ label, value, subValue, icon, accentColor = '#f59e0b', description }: StatCardProps) {
  return (
    <div
      className="card"
      style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: `${accentColor}10`,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </div>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: `${accentColor}15`,
            border: `1px solid ${accentColor}25`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
          }}
        >
          {icon}
        </div>
      </div>

      <div style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', lineHeight: 1 }}>
        {value}
      </div>

      {subValue && (
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
          {subValue}
        </div>
      )}

      {description && (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid #1e1e2e',
            fontSize: '11px',
            color: '#4b5563',
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

export default function ProtocolStatsGrid({ stats }: ProtocolStatsGridProps) {
  const totalSupplyNum = parseFloat(stats.totalSupply);
  const reserveNum = parseFloat(stats.protocolReserve);
  const badDebtNum = parseFloat(stats.protocolBadDebt);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
          Protocol Overview
        </h2>
        <div style={{ flex: 1, height: '1px', background: '#1e1e2e' }} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <StatCard
          label="Total SC Supply"
          value={
            totalSupplyNum > 1000000
              ? `${(totalSupplyNum / 1000000).toFixed(2)}M`
              : totalSupplyNum > 1000
              ? `${(totalSupplyNum / 1000).toFixed(2)}K`
              : totalSupplyNum.toFixed(2)
          }
          subValue="SC tokens minted"
          icon="🪙"
          accentColor="#f59e0b"
          description="Total stablecoin in circulation"
        />

        <StatCard
          label="Stability Fee"
          value={`${stats.stabilityFee}%`}
          subValue="Current APR"
          icon="📈"
          accentColor="#6366f1"
          description={`Dynamic: adjusts based on SC peg deviation`}
        />

        <StatCard
          label="Liquidation Threshold"
          value={`${stats.liquidationThreshold}%`}
          subValue={`Bonus: ${stats.liquidationBonus}%`}
          icon="⚖️"
          accentColor="#f97316"
          description="Min collateral ratio before liquidation"
        />

        <StatCard
          label="Protocol Reserve"
          value={reserveNum.toFixed(4)}
          subValue="SC accrued fees"
          icon="🏦"
          accentColor="#10b981"
          description="Accumulated from stability fees"
        />

        <StatCard
          label="Protocol Bad Debt"
          value={badDebtNum.toFixed(4)}
          subValue="Socialized debt"
          icon={badDebtNum > 0 ? '⚠️' : '✅'}
          accentColor={badDebtNum > 0 ? '#ef4444' : '#10b981'}
          description={badDebtNum > 0 ? 'Under-collateralized positions' : 'No bad debt — protocol healthy'}
        />

        <StatCard
          label="Min Bid Increment"
          value="5%"
          subValue="Auction system"
          icon="🔨"
          accentColor="#8b5cf6"
          description="English auction for liquidations"
        />
      </div>
    </div>
  );
}
