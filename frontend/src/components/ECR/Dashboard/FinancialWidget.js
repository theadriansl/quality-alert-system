import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';

/**
 * Financial Impact Widget
 * Shows aggregated financial impact from ECRs
 *
 * Balance logic:
 * - Negative netImpact = more savings than costs = GOOD (green)
 * - Positive netImpact = more costs than savings = BAD (red)
 */
const FinancialWidget = ({ data = {} }) => {
  const { theme: t } = useTheme();
  const { language } = useLanguage();

  const tr = {
    en: {
      noFinancialData: 'No financial impact data',
      addCostsSavings: 'Add costs/savings in ECR-4 (Closure)',
      totalBalance: 'Total Balance',
      netSavings: 'Net savings',
      netCost: 'Net cost',
      inECRs: 'in',
      breakdownByType: 'Breakdown by Type',
      scrap: 'Scrap',
      investment: 'Investment',
      overtime: 'Overtime',
      other: 'Other',
      savings: 'Savings',
      totalCosts: 'Total Costs',
      totalSavings: 'Total Savings',
      costs: 'Costs',
      savingsLabel: 'Savings'
    },
    es: {
      noFinancialData: 'No hay datos de impacto financiero',
      addCostsSavings: 'Agrega costos/ahorros en ECR-4 (Cierre)',
      totalBalance: 'Balance Total',
      netSavings: 'Ahorro neto',
      netCost: 'Costo neto',
      inECRs: 'en',
      breakdownByType: 'Desglose por Tipo',
      scrap: 'Scrap',
      investment: 'Inversión',
      overtime: 'Tiempo Extra',
      other: 'Otros',
      savings: 'Ahorros',
      totalCosts: 'Total Costos',
      totalSavings: 'Total Ahorros',
      costs: 'Costos',
      savingsLabel: 'Ahorros'
    }
  }[language] || {};
  const {
    totalCost = 0,
    totalSavings = 0,
    netImpact = 0,
    withData = 0,
    byType = {}
  } = data;

  const formatCurrency = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      return `$${(absValue / 1000000).toFixed(1)}M`;
    }
    if (absValue >= 1000) {
      return `$${(absValue / 1000).toFixed(1)}K`;
    }
    return `$${absValue.toFixed(0)}`;
  };

  // Tipos de impacto con sus configuraciones
  const impactTypes = [
    { key: 'scrap', label: tr.scrap, icon: '', isExpense: true },
    { key: 'investment', label: tr.investment, icon: '', isExpense: true },
    { key: 'overtime', label: tr.overtime, icon: '', isExpense: true },
    { key: 'other', label: tr.other, icon: '', isExpense: true },
    { key: 'savings', label: tr.savings, icon: '', isExpense: false }
  ];

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      height: '100%'
    },
    mainValue: {
      textAlign: 'center',
      padding: '12px 0',
      borderBottom: `1px solid ${t.border}`
    },
    balanceLabel: {
      fontSize: '11px',
      color: t.textMuted,
      marginBottom: '4px',
      textTransform: 'uppercase',
      fontWeight: '600',
      letterSpacing: '0.5px'
    },
    balanceValue: {
      fontSize: '28px',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    balanceSubtext: {
      fontSize: '11px',
      color: t.textMuted,
      marginTop: '4px'
    },
    breakdownSection: {
      flex: 1
    },
    breakdownTitle: {
      fontSize: '10px',
      color: t.textMuted,
      textTransform: 'uppercase',
      fontWeight: '600',
      marginBottom: '8px',
      letterSpacing: '0.5px'
    },
    breakdownList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    breakdownItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 8px',
      backgroundColor: t.bgPanel,
      borderRadius: '6px',
      fontSize: '12px'
    },
    breakdownLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    breakdownIcon: {
      fontSize: '12px'
    },
    breakdownLabel: {
      color: t.text,
      fontWeight: '500'
    },
    breakdownValue: {
      fontWeight: '600'
    },
    footer: {
      borderTop: `1px solid ${t.border}`,
      paddingTop: '8px',
      textAlign: 'center',
      fontSize: '11px',
      color: t.textMuted
    },
    emptyState: {
      textAlign: 'center',
      padding: '20px',
      color: t.textMuted,
      fontSize: '13px'
    }
  };

  if (withData === 0) {
    return (
      <div style={styles.emptyState}>
        <DollarSign size={32} color="#d1d5db" style={{ marginBottom: '8px' }} />
        <div>{tr.noFinancialData}</div>
        <div style={{ fontSize: '11px', marginTop: '4px' }}>
          {tr.addCostsSavings}
        </div>
      </div>
    );
  }

  // Negative netImpact = savings > costs = GOOD (green)
  // Positive netImpact = costs > savings = BAD (red)
  const isPositiveBalance = netImpact <= 0;
  const balanceColor = isPositiveBalance ? '#2E7D32' : '#ef4444';

  return (
    <div style={styles.container}>
      {/* Balance Total */}
      <div style={styles.mainValue}>
        <div style={styles.balanceLabel}>{tr.totalBalance}</div>
        <div style={{ ...styles.balanceValue, color: balanceColor }}>
          {isPositiveBalance ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          {netImpact < 0 ? '-' : ''}{formatCurrency(netImpact)}
        </div>
        <div style={styles.balanceSubtext}>
          {isPositiveBalance ? tr.netSavings : tr.netCost} {tr.inECRs} {withData} ECRs
        </div>
      </div>

      {/* Desglose por tipo */}
      <div style={styles.breakdownSection}>
        <div style={styles.breakdownTitle}>{tr.breakdownByType}</div>
        <div style={styles.breakdownList}>
          {impactTypes.map(type => {
            const value = byType[type.key] || 0;
            if (value === 0) return null;

            return (
              <div key={type.key} style={styles.breakdownItem}>
                <div style={styles.breakdownLeft}>
                  <span style={styles.breakdownIcon}>{type.icon}</span>
                  <span style={styles.breakdownLabel}>{type.label}</span>
                </div>
                <span style={{
                  ...styles.breakdownValue,
                  color: type.isExpense ? '#ef4444' : '#2E7D32'
                }}>
                  {type.isExpense ? '' : '-'}{formatCurrency(value)}
                </span>
              </div>
            );
          })}

          {/* Si no hay items con valor, mostrar totales */}
          {Object.values(byType).every(v => v === 0) && (
            <>
              {totalCost > 0 && (
                <div style={styles.breakdownItem}>
                  <div style={styles.breakdownLeft}>
                    <span style={styles.breakdownIcon}></span>
                    <span style={styles.breakdownLabel}>{tr.totalCosts}</span>
                  </div>
                  <span style={{ ...styles.breakdownValue, color: '#ef4444' }}>
                    {formatCurrency(totalCost)}
                  </span>
                </div>
              )}
              {totalSavings > 0 && (
                <div style={styles.breakdownItem}>
                  <div style={styles.breakdownLeft}>
                    <span style={styles.breakdownIcon}></span>
                    <span style={styles.breakdownLabel}>{tr.totalSavings}</span>
                  </div>
                  <span style={{ ...styles.breakdownValue, color: '#2E7D32' }}>
                    -{formatCurrency(totalSavings)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        {tr.costs}: {formatCurrency(totalCost)} | {tr.savingsLabel}: {formatCurrency(totalSavings)}
      </div>
    </div>
  );
};

export default FinancialWidget;
