import React, { useState, useEffect } from 'react';
import * as statService from '../../services/statisticalService';
import { useTheme } from '../../context/ThemeContext';

const STEPS = [
  { id: 1, title: 'Datos',     icon: '📂' },
  { id: 2, title: 'Columnas',  icon: '🗂️' },
  { id: 3, title: 'Opciones',  icon: '⚙️' },
  { id: 4, title: 'Resultados',icon: '📊' }
];

const GageRRTab = () => {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1
  const [datasets, setDatasets]           = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [datasetInfo, setDatasetInfo]     = useState(null);
  const [columns, setColumns]             = useState([]);
  const [previewRows, setPreviewRows]     = useState([]);

  // Step 2
  const [partColumn, setPartColumn]         = useState('');
  const [operatorColumn, setOperatorColumn] = useState('');
  const [measurementColumn, setMeasurementColumn] = useState('');

  // Step 3
  const [tolerance, setTolerance]   = useState('');
  const [multiplier, setMultiplier] = useState('6');

  // Step 4
  const [results, setResults]   = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState('');

  // ── Styles ──────────────────────────────────────────────
  const labelStyle = {
    display: 'block', fontSize: '14px', fontWeight: '600',
    marginBottom: '8px', color: theme.text
  };
  const selectStyle = {
    width: '100%', padding: '10px 12px',
    border: `1px solid ${theme.border}`, borderRadius: '6px',
    fontSize: '14px', backgroundColor: theme.bgCard, color: theme.text
  };
  const inputStyle = {
    width: '100%', padding: '10px 12px',
    border: `1px solid ${theme.border}`, borderRadius: '6px',
    fontSize: '14px', boxSizing: 'border-box',
    backgroundColor: theme.bgCard, color: theme.text
  };
  const thStyle = {
    padding: '10px 8px', textAlign: 'left',
    borderBottom: `2px solid ${theme.border}`,
    fontWeight: '600', color: theme.text, fontSize: '13px'
  };
  const tdStyle = {
    padding: '8px', borderBottom: `1px solid ${theme.border}`,
    fontSize: '13px', color: theme.text
  };
  const btnPrimary = {
    padding: '10px 20px', border: 'none', borderRadius: '6px',
    cursor: 'pointer', fontSize: '14px', fontWeight: '500',
    backgroundColor: theme.accent, color: 'white', transition: 'all 0.2s'
  };
  const btnSecondary = {
    padding: '10px 20px', border: `1px solid ${theme.border}`,
    borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
    fontWeight: '500', backgroundColor: theme.bgCard,
    color: theme.text, transition: 'all 0.2s'
  };
  const helpBox = {
    padding: '14px 16px', backgroundColor: '#eff6ff',
    borderRadius: '8px', marginBottom: '20px',
    border: '1px solid #bfdbfe', fontSize: '13px', lineHeight: '1.6'
  };

  // ── Data loading ────────────────────────────────────────
  useEffect(() => { loadDatasets(); }, []);

  useEffect(() => {
    if (selectedDataset) loadDatasetInfo(selectedDataset);
    else { setColumns([]); setDatasetInfo(null); setPreviewRows([]); }
  }, [selectedDataset]);

  const loadDatasets = async () => {
    const result = await statService.getDatasets();
    if (result.success) setDatasets(result.data);
  };

  const loadDatasetInfo = async (id) => {
    const result = await statService.getDataset(id);
    if (result.success) {
      const d = result.data;
      setColumns(d.columns || []);
      setDatasetInfo(d);
      setPreviewRows((d.preview || d.rows || []).slice(0, 5));
      setPartColumn('');
      setOperatorColumn('');
      setMeasurementColumn('');
    }
  };

  // ── Analysis ─────────────────────────────────────────────
  const runAnalysis = async () => {
    if (!selectedDataset || !partColumn || !operatorColumn || !measurementColumn) return;
    setIsLoading(true);
    setError('');
    try {
      const payload = {
        datasetId: parseInt(selectedDataset),
        partColumn,
        operatorColumn,
        measurementColumn,
        multiplier: parseFloat(multiplier) || 6,
        ...(tolerance ? { tolerance: parseFloat(tolerance) } : {})
      };
      const result = await statService.analyzeGageRR(payload);
      if (result.success) {
        setResults(result.data);
        setCurrentStep(4);
      } else {
        setError(result.error || 'Error al ejecutar el análisis');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const getGRRColor = (pct) => {
    if (pct < 10)  return '#22c55e';
    if (pct <= 30) return '#f59e0b';
    return '#ef4444';
  };

  const getGRRBg = (pct) => {
    if (pct < 10)  return '#dcfce7';
    if (pct <= 30) return '#fef3c7';
    return '#fee2e2';
  };

  const step1Valid = !!selectedDataset;
  const step2Valid = !!partColumn && !!operatorColumn && !!measurementColumn;

  // ── Step indicator ────────────────────────────────────────
  const renderStepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
      {STEPS.map((step, idx) => {
        const isActive    = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        return (
          <React.Fragment key={step.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isActive ? '18px' : '16px',
                backgroundColor: isCompleted ? theme.accent : isActive ? theme.accent : theme.bgPanel,
                border: `2px solid ${isActive || isCompleted ? theme.accent : theme.border}`,
                color: isActive || isCompleted ? 'white' : theme.textMuted,
                fontWeight: '600', transition: 'all 0.2s'
              }}>
                {isCompleted ? '✓' : step.icon}
              </div>
              <div style={{
                fontSize: '11px', marginTop: '5px', textAlign: 'center',
                color: isActive ? theme.accent : theme.textMuted,
                fontWeight: isActive ? '600' : '400'
              }}>
                {step.title}
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: '2px', marginBottom: '20px',
                backgroundColor: currentStep > step.id ? theme.accent : theme.border,
                transition: 'background-color 0.3s'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Step 1: Datos ─────────────────────────────────────────
  const renderStep1 = () => (
    <div>
      <div style={helpBox}>
        <strong>Formato requerido:</strong> El dataset debe tener columnas para <em>parte</em>, <em>operador</em> y <em>medición</em>.
        Cada combinación parte-operador debe tener al menos 2 réplicas.
        <br /><br />
        <strong>Ejemplo:</strong> Parte A medida por Op1 tres veces → tres filas con los mismos valores de parte y operador pero distinta medición.
      </div>

      <label style={labelStyle}>Dataset</label>
      <select value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)} style={selectStyle}>
        <option value="">Seleccionar dataset...</option>
        {datasets.map(ds => (
          <option key={ds.id} value={ds.id}>{ds.name}</option>
        ))}
      </select>

      {datasetInfo && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
            marginBottom: '20px'
          }}>
            {[
              { label: 'Filas', value: datasetInfo.rowCount ?? datasetInfo.rows?.length ?? '–' },
              { label: 'Columnas', value: columns.length },
              { label: 'Nombre', value: datasetInfo.name }
            ].map(({ label, value }) => (
              <div key={label} style={{
                padding: '12px', backgroundColor: theme.bgPanel,
                borderRadius: '8px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: theme.textMuted }}>{label}</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: theme.text, marginTop: '4px' }}>{value}</div>
              </div>
            ))}
          </div>

          {previewRows.length > 0 && (
            <>
              <div style={{ fontSize: '13px', fontWeight: '600', color: theme.textMuted, marginBottom: '8px' }}>
                Vista previa (primeras {previewRows.length} filas)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: theme.bgPanel }}>
                      {columns.map(col => (
                        <th key={col} style={thStyle}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {columns.map(col => (
                          <td key={col} style={tdStyle}>{row[col] ?? '–'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  // ── Step 2: Columnas ──────────────────────────────────────
  const renderStep2 = () => (
    <div>
      <div style={helpBox}>
        Selecciona qué columna representa cada rol en el estudio Gage R&R.
        Asegúrate de no asignar la misma columna a dos roles distintos.
      </div>

      {[
        {
          label: '📦 Columna de Parte',
          hint: 'Identifica la pieza o muestra medida (ej. "PartID", "Pieza")',
          value: partColumn,
          setter: setPartColumn,
          excludes: [operatorColumn, measurementColumn]
        },
        {
          label: '👤 Columna de Operador',
          hint: 'Identifica al operador que realizó la medición (ej. "Operator", "Inspector")',
          value: operatorColumn,
          setter: setOperatorColumn,
          excludes: [partColumn, measurementColumn]
        },
        {
          label: '📏 Columna de Medición',
          hint: 'Valor numérico medido (ej. "Measurement", "Value", "Lectura")',
          value: measurementColumn,
          setter: setMeasurementColumn,
          excludes: [partColumn, operatorColumn]
        }
      ].map(({ label, hint, value, setter, excludes }) => (
        <div key={label} style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>{label}</label>
          <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '8px' }}>{hint}</div>
          <select value={value} onChange={(e) => setter(e.target.value)} style={selectStyle}>
            <option value="">Seleccionar columna...</option>
            {columns
              .filter(col => !excludes.includes(col))
              .map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>
      ))}

      {partColumn && operatorColumn && measurementColumn && (
        <div style={{
          padding: '14px 16px', backgroundColor: '#dcfce7',
          borderRadius: '8px', border: '1px solid #86efac',
          fontSize: '13px', color: '#166534'
        }}>
          ✅ Configuración completa: <strong>{partColumn}</strong> / <strong>{operatorColumn}</strong> / <strong>{measurementColumn}</strong>
        </div>
      )}
    </div>
  );

  // ── Step 3: Opciones ──────────────────────────────────────
  const renderStep3 = () => (
    <div>
      <div style={helpBox}>
        <strong>Opciones avanzadas del estudio.</strong> Todos los campos son opcionales —
        el análisis ANOVA puede ejecutarse sin tolerancia.
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={labelStyle}>Tolerancia del proceso (USL − LSL)</label>
        <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '8px' }}>
          Si se especifica, se calculará adicionalmente el <em>%Tolerance</em>.
        </div>
        <input
          type="number"
          min="0"
          step="any"
          placeholder="Ej. 0.05"
          value={tolerance}
          onChange={(e) => setTolerance(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={labelStyle}>Multiplicador del estudio (k)</label>
        <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '8px' }}>
          <strong>6</strong> = 99.73% de la distribución (AIAG recomendado).{' '}
          <strong>5.15</strong> = 99% de la distribución (norma anterior).
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { val: '6',    label: 'k = 6  (recomendado)' },
            { val: '5.15', label: 'k = 5.15' }
          ].map(opt => (
            <label key={opt.val} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px',
              border: `2px solid ${multiplier === opt.val ? theme.accent : theme.border}`,
              borderRadius: '8px', cursor: 'pointer', flex: 1,
              backgroundColor: multiplier === opt.val ? '#eff6ff' : theme.bgCard,
              color: theme.text, fontSize: '14px'
            }}>
              <input
                type="radio" name="multiplier" value={opt.val}
                checked={multiplier === opt.val}
                onChange={() => setMultiplier(opt.val)}
                style={{ accentColor: theme.accent }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div style={{
        padding: '14px 16px', backgroundColor: '#fefce8',
        borderRadius: '8px', border: '1px solid #fef08a',
        fontSize: '13px', lineHeight: '1.6', color: '#854d0e'
      }}>
        <strong>Resumen de la configuración:</strong><br />
        Dataset: <strong>{datasets.find(d => String(d.id) === String(selectedDataset))?.name ?? '–'}</strong><br />
        Parte: <strong>{partColumn}</strong> · Operador: <strong>{operatorColumn}</strong> · Medición: <strong>{measurementColumn}</strong><br />
        k = <strong>{multiplier}</strong>{tolerance ? `  ·  Tolerancia = ${tolerance}` : ''}
      </div>

      {error && (
        <div style={{
          marginTop: '16px', padding: '12px 16px',
          backgroundColor: '#fee2e2', borderRadius: '8px',
          border: '1px solid #fca5a5', color: '#991b1b', fontSize: '13px'
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );

  // ── Step 4: Resultados ────────────────────────────────────
  const renderStep4 = () => {
    if (!results) return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: theme.textDim }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
        <div>Vuelve al paso 3 y ejecuta el análisis.</div>
      </div>
    );

    const grrPct  = results.studyVariation.grr.pct;
    const grrColor = getGRRColor(grrPct);
    const grrBg    = getGRRBg(grrPct);
    const k        = parseFloat(multiplier);
    const ndc      = results.ndc ?? Math.floor(1.41 * (results.studyVariation.part.pct / 100) / (results.studyVariation.grr.pct / 100));

    const varRows = [
      { label: 'Repetibilidad (EV)',     key: 'repeatability' },
      { label: 'Reproducibilidad (AV)',  key: 'reproducibility' },
      { label: 'Total Gage R&R',         key: 'grr',  bold: true },
      { label: 'Part-to-Part',           key: 'part' },
      { label: 'Variación Total',        key: 'total', totalRow: true }
    ];

    const anovaRows = [
      { label: 'Parte',          key: 'part' },
      { label: 'Operador',       key: 'operator' },
      { label: 'Parte × Oper.',  key: 'interaction' },
      { label: 'Repetibilidad',  key: 'error' }
    ];

    return (
      <div>
        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Partes',      value: results.parts },
            { label: 'Operadores',  value: results.operators },
            { label: 'Réplicas',    value: results.replications },
            { label: 'Mediciones',  value: results.parts * results.operators * results.replications }
          ].map(({ label, value }) => (
            <div key={label} style={{
              padding: '12px', backgroundColor: theme.bgPanel,
              borderRadius: '8px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: theme.textMuted }}>{label}</div>
              <div style={{ fontSize: '22px', fontWeight: '600', color: theme.text, marginTop: '4px' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Main result */}
        <div style={{
          padding: '24px', backgroundColor: grrBg,
          borderRadius: '10px', marginBottom: '20px',
          textAlign: 'center', border: `2px solid ${grrColor}`
        }}>
          <div style={{ fontSize: '13px', color: theme.text, marginBottom: '6px' }}>
            Total Gage R&R — % Variación del Estudio (k = {k})
          </div>
          <div style={{ fontSize: '44px', fontWeight: 'bold', color: grrColor, lineHeight: 1 }}>
            {grrPct.toFixed(2)}%
          </div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: grrColor, marginTop: '6px' }}>
            {results.interpretation}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '14px', fontSize: '13px' }}>
            <span style={{ color: '#166534' }}>✅ &lt;10% Aceptable</span>
            <span style={{ color: '#92400e' }}>⚠️ 10–30% Marginal</span>
            <span style={{ color: '#991b1b' }}>❌ &gt;30% Inaceptable</span>
          </div>
        </div>

        {/* NDC */}
        {!isNaN(ndc) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', backgroundColor: theme.bgPanel,
            borderRadius: '8px', marginBottom: '20px',
            border: `1px solid ${theme.border}`
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: ndc >= 5 ? '#22c55e' : '#f59e0b' }}>{ndc}</div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px', color: theme.text }}>Número de Categorías Distintas (NDC)</div>
              <div style={{ fontSize: '12px', color: theme.textMuted }}>
                {ndc >= 5 ? 'NDC ≥ 5 — Sistema apto para clasificar el proceso' : 'NDC < 5 — Sistema insuficiente para distinguir categorías'}
              </div>
            </div>
          </div>
        )}

        {/* Variance components */}
        <h4 style={{ marginBottom: '10px', color: theme.text }}>Componentes de Varianza</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: theme.bgPanel }}>
              <th style={thStyle}>Fuente</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Varianza</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>% Contrib.</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Var. Estudio ({k}σ)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>% Var. Est.</th>
              {results.tolerance && <th style={{ ...thStyle, textAlign: 'right' }}>% Tolerancia</th>}
            </tr>
          </thead>
          <tbody>
            {varRows.map(({ label, key, bold, totalRow }) => {
              const sv = results.studyVariation[key];
              if (!sv) return null;
              const rowStyle = {
                ...tdStyle,
                fontWeight: bold || totalRow ? '600' : '400',
                backgroundColor: bold ? '#f0f9ff' : totalRow ? theme.bgPanel : 'transparent',
                color: bold ? getGRRColor(sv.pct) : theme.text
              };
              return (
                <tr key={key}>
                  <td style={rowStyle}>{label}</td>
                  <td style={{ ...rowStyle, textAlign: 'right' }}>
                    {key === 'total' ? '—' : (results.variance[key]?.toFixed(6) ?? '—')}
                  </td>
                  <td style={{ ...rowStyle, textAlign: 'right' }}>
                    {key === 'total' ? '100.00%' : (results.contribution[key]?.toFixed(2) + '%' ?? '—')}
                  </td>
                  <td style={{ ...rowStyle, textAlign: 'right' }}>{key === 'total' ? '—' : sv.sv?.toFixed(4)}</td>
                  <td style={{ ...rowStyle, textAlign: 'right', color: bold ? getGRRColor(sv.pct) : theme.text }}>
                    {sv.pct?.toFixed(2)}%
                  </td>
                  {results.tolerance && (
                    <td style={{ ...rowStyle, textAlign: 'right' }}>
                      {sv.pctTol != null ? sv.pctTol.toFixed(2) + '%' : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ANOVA table */}
        <h4 style={{ marginBottom: '10px', color: theme.text }}>Tabla ANOVA</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: theme.bgPanel }}>
              <th style={thStyle}>Fuente</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>SS</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>GL</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>MS</th>
            </tr>
          </thead>
          <tbody>
            {anovaRows.map(({ label, key }) => (
              <tr key={key}>
                <td style={tdStyle}>{label}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{results.anova[key]?.ss?.toFixed(6) ?? '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{results.anova[key]?.df ?? '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{results.anova[key]?.ms?.toFixed(6) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Navigation ────────────────────────────────────────────
  const canNext = () => {
    if (currentStep === 1) return step1Valid;
    if (currentStep === 2) return step2Valid;
    if (currentStep === 3) return !isLoading;
    return false;
  };

  const handleNext = () => {
    if (currentStep === 3) { runAnalysis(); return; }
    setCurrentStep(s => Math.min(s + 1, 4));
  };

  const handlePrev = () => setCurrentStep(s => Math.max(s - 1, 1));

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <div style={{ maxWidth: '860px' }}>
      {renderStepIndicator()}

      <div style={{
        backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`,
        borderRadius: '10px', padding: '28px', minHeight: '380px'
      }}>
        {stepContent[currentStep - 1]()}
      </div>

      {/* Nav buttons */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginTop: '16px'
      }}>
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          style={{
            ...btnSecondary,
            opacity: currentStep === 1 ? 0.4 : 1,
            cursor: currentStep === 1 ? 'default' : 'pointer'
          }}
        >
          ← Anterior
        </button>

        <span style={{ fontSize: '12px', color: theme.textMuted }}>
          Paso {currentStep} de {STEPS.length}
        </span>

        {currentStep < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canNext()}
            style={{
              ...btnPrimary,
              opacity: canNext() ? 1 : 0.4,
              cursor: canNext() ? 'pointer' : 'default'
            }}
          >
            {currentStep === 3
              ? (isLoading ? 'Analizando...' : '▶ Ejecutar Análisis')
              : 'Siguiente →'}
          </button>
        ) : (
          <button
            onClick={() => { setCurrentStep(1); setResults(null); setSelectedDataset(''); }}
            style={btnSecondary}
          >
            🔄 Nuevo Análisis
          </button>
        )}
      </div>
    </div>
  );
};

export default GageRRTab;
