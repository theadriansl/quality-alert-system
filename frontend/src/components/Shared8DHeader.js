import React from 'react';
import { useTheme } from '../context/ThemeContext';

const Shared8DHeader = ({
  data = {},
  onDataChange,
  showLanguageSelector = true,
  language = 'es',
  onLanguageChange,
  title = "8D Report",
  readOnly = false
}) => {
  const { theme: t } = useTheme();

  const translations = {
    en: {
      supplierName: 'Supplier Name',
      supplierAccount: 'Supplier Account',
      partNumber: 'Part Number',
      partName: 'Part Name',
      reportId: 'Report ID',
      issueTitle: 'Issue Title',
      basicInfo: 'Basic Information'
    },
    es: {
      supplierName: 'Supplier Name',
      supplierAccount: 'Supplier Account',
      partNumber: 'Part Number',
      partName: 'Part Name',
      reportId: 'Report ID',
      issueTitle: 'Issue Title',
      basicInfo: 'Basic Information'
    }
  };

  const t = (key) => translations[language][key] || key;

  const handleInputChange = (field, value) => {
    if (onDataChange && !readOnly) {
      onDataChange(field, value);
    }
  };

  const styles = {
    container: {
      backgroundColor: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: '4px 4px 0 0'
    },
    header: {
      backgroundColor: t.bgCard,
      borderBottom: `1px solid ${t.border}`,
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    logo: {
      width: '36px',
      height: '36px',
      backgroundColor: t.primary,
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: '700',
      fontSize: '12px'
    },
    title: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      margin: 0
    },
    subtitle: {
      fontSize: '12px',
      color: t.textMuted,
      margin: '2px 0 0 0'
    },
    languageSelect: {
      padding: '6px 12px',
      fontSize: '12px',
      border: `1px solid ${t.border}`,
      borderRadius: '4px',
      backgroundColor: t.bgCard,
      color: t.text,
      cursor: 'pointer'
    },
    basicInfo: {
      padding: '20px 24px',
      backgroundColor: t.bgPanel,
      borderBottom: `1px solid ${t.border}`
    },
    sectionTitle: {
      fontSize: '11px',
      fontWeight: '600',
      color: t.text,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '16px',
      paddingBottom: '8px',
      borderBottom: `2px solid ${t.primary}`
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px'
    },
    field: {
      marginBottom: '0'
    },
    label: {
      display: 'block',
      fontSize: '11px',
      fontWeight: '500',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      marginBottom: '4px'
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: `1px solid ${t.border}`,
      borderRadius: '4px',
      fontSize: '13px',
      backgroundColor: readOnly ? t.bgPanel : t.bgCard,
      color: t.text,
      boxSizing: 'border-box'
    },
    readOnlyInput: {
      backgroundColor: t.bgPanel,
      color: t.textMuted,
      cursor: 'not-allowed'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>8D</div>
          <div>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.subtitle}>Problem Solving Report</p>
          </div>
        </div>
        {showLanguageSelector && (
          <select
            value={language}
            onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
            style={styles.languageSelect}
          >
            <option value="es">ES - Spanish</option>
            <option value="en">EN - English</option>
          </select>
        )}
      </div>

      {/* Basic Information */}
      <div style={styles.basicInfo}>
        <h3 style={styles.sectionTitle}>{t('basicInfo')}</h3>

        {/* First Row */}
        <div style={styles.grid}>
          <div style={styles.field}>
            <label style={styles.label}>{t('supplierName')} *</label>
            <input
              style={{
                ...styles.input,
                ...(readOnly ? styles.readOnlyInput : {})
              }}
              value={data.supplierName || ''}
              onChange={(e) => handleInputChange('supplierName', e.target.value)}
              placeholder={t('supplierName')}
              readOnly={readOnly}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t('supplierAccount')} *</label>
            <input
              style={{
                ...styles.input,
                ...(readOnly ? styles.readOnlyInput : {})
              }}
              value={data.supplierAccount || ''}
              onChange={(e) => handleInputChange('supplierAccount', e.target.value)}
              placeholder={t('supplierAccount')}
              readOnly={readOnly}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t('partNumber')} *</label>
            <input
              style={{
                ...styles.input,
                ...(readOnly ? styles.readOnlyInput : {})
              }}
              value={data.partNumber || ''}
              onChange={(e) => handleInputChange('partNumber', e.target.value)}
              placeholder={t('partNumber')}
              readOnly={readOnly}
            />
          </div>
        </div>

        {/* Second Row */}
        <div style={{ ...styles.grid, marginTop: '16px' }}>
          <div style={styles.field}>
            <label style={styles.label}>{t('partName')} *</label>
            <input
              style={{
                ...styles.input,
                ...(readOnly ? styles.readOnlyInput : {})
              }}
              value={data.partName || ''}
              onChange={(e) => handleInputChange('partName', e.target.value)}
              placeholder={t('partName')}
              readOnly={readOnly}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t('reportId')}</label>
            <input
              style={{
                ...styles.input,
                ...styles.readOnlyInput
              }}
              value={data.reportId || ''}
              readOnly={true}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>{t('issueTitle')} *</label>
            <input
              style={{
                ...styles.input,
                ...(readOnly ? styles.readOnlyInput : {})
              }}
              value={data.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder={t('issueTitle')}
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shared8DHeader;
