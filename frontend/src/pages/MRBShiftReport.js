import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Printer, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = 'http://localhost:5000';

const DISP_COLORS = {
  REWORK:          { bg: '#fef3c7', color: '#92400e' },
  SCRAP:           { bg: '#fee2e2', color: '#991b1b' },
  HOLD:            { bg: '#f3f4f6', color: '#374151' },
  RETURN_SUPPLIER: { bg: '#ede9fe', color: '#5b21b6' },
  USE_AS_IS:       { bg: '#d1fae5', color: '#065f46' },
};

const DowntimeSection = ({ downtimeLog, campaignId, onRefresh, fmtTime }) => {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const [editingId, setEditingId] = useState(null);

  // Traducciones locales
  const L = {
    en: { hour: 'Hour', serial: 'Serial', type: 'Type', minutes: 'Minutes', comment: 'Comment', inspector: 'Inspector', noDowntime: 'No downtime records.' },
    es: { hour: 'Hora', serial: 'Serial', type: 'Tipo', minutes: 'Minutos', comment: 'Comentario', inspector: 'Inspector', noDowntime: 'Sin registros de downtime.' }
  }[language] || {};
  const [editMin, setEditMin]     = useState('');
  const [editNote, setEditNote]   = useState('');
  const [saving, setSaving]       = useState(false);

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditMin(String(row.downtimeMinutes));
    setEditNote(row.notes || '');
  };

  const cancelEdit = () => { setEditingId(null); setEditMin(''); setEditNote(''); };

  const saveEdit = async (row) => {
    if (parseInt(editMin) < 0 || editMin === '') return;
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/mrb/${campaignId}/downtime/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ downtimeMinutes: parseInt(editMin), notes: editNote || null })
      });
      if (!res.ok) throw new Error();
      cancelEdit();
      onRefresh();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const deleteEntry = async (row) => {
    if (!window.confirm(`¿Eliminar ${row.downtimeMinutes} min de downtime (${row.lotNumber || 'sin serial'})?`)) return;
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/mrb/${campaignId}/downtime/${row.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch { /* silent */ }
  };

  const total = downtimeLog.reduce((s, r) => s + r.downtimeMinutes, 0);

  return (
    <Section title={`Registro de Downtime${downtimeLog.length > 0 ? ` (${downtimeLog.length}) — ${total} min total` : ''}`}>
      {downtimeLog.length === 0 ? <p style={{ color: t.textMuted, fontSize: '13px' }}>{L.noDowntime}</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${t.border}` }}>
              {[L.hour, L.serial, L.type, L.minutes, L.comment, L.inspector, ''].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: h === L.minutes ? 'center' : 'left', color: t.textMuted, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {downtimeLog.map((row, i) => {
              const isEditing = editingId === row.id;
              return (
                <tr key={row.id} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: i % 2 === 0 ? 'transparent' : t.bgPanel }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: t.textMuted, whiteSpace: 'nowrap' }}>{fmtTime(row.createdAt)}</td>
                  <td style={{ padding: '8px 10px', color: t.text }}>{row.lotNumber || '—'}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: row.sourceType === 'NOK' ? '#fee2e2' : '#d1fae5', color: row.sourceType === 'NOK' ? '#991b1b' : '#065f46' }}>
                      {row.sourceType}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    {isEditing
                      ? <input type="number" value={editMin} onChange={e => setEditMin(e.target.value)} min="0" style={{ width: '70px', padding: '4px 6px', border: `1px solid ${t.border}`, borderRadius: '4px', backgroundColor: t.bgInput, color: t.text, fontSize: '13px', textAlign: 'center' }} />
                      : <span style={{ fontWeight: '700', color: '#f59e0b' }}>{row.downtimeMinutes}</span>}
                  </td>
                  <td style={{ padding: '8px 10px', color: t.text, maxWidth: '220px' }}>
                    {isEditing
                      ? <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Comentario" style={{ width: '100%', padding: '4px 6px', border: `1px solid ${t.border}`, borderRadius: '4px', backgroundColor: t.bgInput, color: t.text, fontSize: '13px' }} />
                      : (row.notes || '—')}
                  </td>
                  <td style={{ padding: '8px 10px', color: t.textMuted, whiteSpace: 'nowrap' }}>{row.inspector || '—'}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => saveEdit(row)} disabled={saving} style={{ padding: '3px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>✓</button>
                        <button onClick={cancelEdit} style={{ padding: '3px 10px', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => startEdit(row)} style={{ padding: '3px 10px', backgroundColor: t.bgPanel, color: t.text, border: `1px solid ${t.border}`, borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>✏</button>
                        <button onClick={() => deleteEntry(row)} style={{ padding: '3px 10px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${t.border}` }}>
              <td colSpan={3} style={{ padding: '8px 10px', fontWeight: '700', color: t.text, fontSize: '12px' }}>Total</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700', color: '#f59e0b' }}>{total} min</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      )}
    </Section>
  );
};

const Section = ({ title, children, defaultOpen = true, sectionId }) => {
  const [open, setOpen] = useState(defaultOpen);
  const { theme: t } = useTheme();
  return (
    <div style={{ marginBottom: '16px', border: `1px solid ${t.border}`, borderRadius: '10px', overflow: 'hidden' }} className="report-section" {...(sectionId ? { 'data-pdf-entry-section': '1' } : {})}>
      <div data-pdf-section-header="1" onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: t.bgPanel, cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontWeight: '700', fontSize: '13px', color: t.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        {open ? <ChevronUp size={16} color={t.textMuted} /> : <ChevronDown size={16} color={t.textMuted} />}
      </div>
      {open && <div style={{ padding: '14px 16px', backgroundColor: t.bgCard }}>{children}</div>}
    </div>
  );
};

const MRBShiftReport = ({ campaignId, shiftId, date, shiftLabel, onClose }) => {
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  // Traducciones locales
  const L = {
    en: {
      shift: 'Shift', date: 'Date', campaign: 'Campaign', client: 'Client', part: 'Part', lot: 'Lot', generated: 'Generated',
      scrap: 'Scrap', downtime: 'Downtime', inspected: 'Inspected', remaining: 'Remaining',
      defect: 'Defect', qty: 'Qty', nokPct: '% NOK', accumPct: '% Accum', bar: 'Bar',
      inspector: 'Inspector', ok: 'OK', nok: 'NOK', insp: 'INSP', yieldPct: 'Yield %', detectionPct: 'Detection %',
      unclassified: 'Unclassified', hour: 'Hour', serial: 'Serial', disposition: 'Disposition', notes: 'Notes', noNotes: 'No notes',
      type: 'Type', minutes: 'Minutes', comment: 'Comment',
    },
    es: {
      shift: 'Turno', date: 'Fecha', campaign: 'Campaña', client: 'Cliente', part: 'Parte', lot: 'Lote', generated: 'Generado',
      scrap: 'Scrap', downtime: 'Downtime', inspected: 'Inspeccionado', remaining: 'Restante',
      defect: 'Defecto', qty: 'Qty', nokPct: '% NOK', accumPct: '% Acum', bar: 'Barra',
      inspector: 'Inspector', ok: 'OK', nok: 'NOK', insp: 'INSP', yieldPct: 'Yield %', detectionPct: 'Detection %',
      unclassified: 'Sin clasificar', hour: 'Hora', serial: 'Serial', disposition: 'Disposición', notes: 'Notas', noNotes: 'Sin notas',
      type: 'Tipo', minutes: 'Minutos', comment: 'Comentario',
    }
  }[language] || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const refreshTimer = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [uploadingTally, setUploadingTally] = useState(false);
  const isToday = date === new Date().toISOString().split('T')[0];

  const fetchReport = useCallback(async () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ date });
    if (shiftId) params.set('shiftId', shiftId);
    try {
      const res = await fetch(`${API_URL}/mrb/${campaignId}/shift-report?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.success) { setData(d); setLastRefresh(new Date()); }
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  }, [campaignId, shiftId, date]);

  useEffect(() => {
    fetchReport();
    if (isToday) {
      refreshTimer.current = setInterval(fetchReport, 30000);
    }
    return () => clearInterval(refreshTimer.current);
  }, [fetchReport, isToday]);

  const handlePrint = async () => {
    setExporting(true);
    const el    = document.getElementById('mrb-shift-report-inner');
    const root  = document.getElementById('mrb-shift-report-root');
    const scrollArea = el?.querySelector('[data-pdf-scroll]');
    if (!el) { setExporting(false); return; }

    // 1. Ocultar botones de acción
    const noprint = el.querySelectorAll('.report-no-print');
    noprint.forEach(n => { n.dataset.prevDisplay = n.style.display; n.style.display = 'none'; });

    // 2. Expandir modal completamente
    const prevElMaxH    = el.style.maxHeight;
    const prevElH       = el.style.height;
    const prevRootAlign = root?.style.alignItems;
    el.style.maxHeight  = 'none';
    el.style.height     = 'auto';
    if (scrollArea) {
      scrollArea.dataset.prevOverflow = scrollArea.style.overflow;
      scrollArea.dataset.prevMaxH     = scrollArea.style.maxHeight;
      scrollArea.style.overflow  = 'visible';
      scrollArea.style.maxHeight = 'none';
    }
    if (root) root.style.alignItems = 'flex-start';

    await new Promise(r => setTimeout(r, 100));

    try {
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW   = pdf.internal.pageSize.getWidth();
      const pageH   = pdf.internal.pageSize.getHeight();
      const margin  = 8;
      const contentW = pageW - margin * 2;
      let cursorY   = margin;
      const gap     = 3; // mm entre bloques

      // Capturar el header del reporte (primera sección fija)
      const headerEl = el.querySelector('[data-pdf-header]');
      const blocks   = [
        ...(headerEl ? [headerEl] : []),
        ...Array.from(el.querySelectorAll('.report-section')),
      ];

      // Para "Registro Individual", capturar cada card por separado
      const entryCards = el.querySelectorAll('[data-pdf-entry]');

      const captureBlock = async (node) => {
        const c = await html2canvas(node, { scale: 2, useCORS: true, allowTaint: false, logging: false, scrollY: 0 });
        return { canvas: c, imgData: c.toDataURL('image/jpeg', 0.92), imgH: (c.height * contentW) / c.width };
      };

      for (const block of blocks) {
        const isEntrySection = block.dataset?.pdfEntrySection === '1';

        if (isEntrySection && entryCards.length > 0) {
          // Capturar cabecera de la sección (título colapsable) + cards individuales
          const sectionHeader = block.querySelector('[data-pdf-section-header]');
          if (sectionHeader) {
            const { imgData, imgH } = await captureBlock(sectionHeader);
            if (cursorY + imgH > pageH - margin) { pdf.addPage(); cursorY = margin; }
            pdf.addImage(imgData, 'JPEG', margin, cursorY, contentW, imgH);
            cursorY += imgH + gap;
          }
          for (const card of entryCards) {
            const { imgData, imgH } = await captureBlock(card);
            if (cursorY + imgH > pageH - margin) { pdf.addPage(); cursorY = margin; }
            pdf.addImage(imgData, 'JPEG', margin, cursorY, contentW, imgH);
            cursorY += imgH + gap;
          }
        } else {
          const { imgData, imgH } = await captureBlock(block);
          // Si no cabe en la página actual, saltar a nueva
          if (cursorY + imgH > pageH - margin && cursorY > margin + 5) {
            pdf.addPage();
            cursorY = margin;
          }
          pdf.addImage(imgData, 'JPEG', margin, cursorY, contentW, imgH);
          cursorY += imgH + gap;
        }
      }

      pdf.save(`Reporte_Turno_${h?.campaignNumber || campaignId}_${date}.pdf`);
    } catch (e) {
      console.error('PDF error:', e);
    } finally {
      noprint.forEach(n => { n.style.display = n.dataset.prevDisplay || ''; });
      el.style.maxHeight  = prevElMaxH;
      el.style.height     = prevElH;
      if (scrollArea) {
        scrollArea.style.overflow  = scrollArea.dataset.prevOverflow || '';
        scrollArea.style.maxHeight = scrollArea.dataset.prevMaxH     || '';
      }
      if (root) root.style.alignItems = prevRootAlign || '';
      setExporting(false);
    }
  };

  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
  const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
      <div style={{ color: 'white', fontSize: '16px' }}>Cargando reporte...</div>
    </div>
  );

  const h = data?.header || {};
  const kpis = data?.kpis || {};
  const avance = data?.avance || {};
  const pareto = data?.pareto || [];
  const disposition = data?.disposition || [];
  const inspectors = data?.inspectors || [];
  const tallies = data?.tallies || [];
  const entries = data?.defectEntries || [];
  const okEntries = data?.okEntries || [];
  const downtimeLog = data?.downtimeLog || [];
  const okSerials = data?.okSerials || [];

  const avancePct = avance.qtyEnPlanta > 0 ? Math.min(100, (avance.qtyInspected / avance.qtyEnPlanta) * 100) : 0;
  const paretoMax = pareto[0]?.qty || 1;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #mrb-shift-report-inner, #mrb-shift-report-inner * { visibility: visible; }
          #mrb-shift-report-inner {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .report-no-print { display: none !important; }
          .report-section { break-inside: avoid; }
        }
      `}</style>

      <div id="mrb-shift-report-root" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div id="mrb-shift-report-inner" style={{ backgroundColor: t.bg, borderRadius: '14px', width: '100%', maxWidth: '900px', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)' }}>

          {/* ── TOP BAR ── */}
          <div className="report-no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${t.border}`, flexShrink: 0, backgroundColor: t.bg, borderRadius: '14px 14px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: '700', fontSize: '15px', color: t.text }}>Reporte de Turno</span>
              <span style={{ padding: '3px 10px', backgroundColor: `${t.accent}20`, color: t.accent, borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>{shiftLabel}</span>
              {isToday && <span style={{ padding: '3px 8px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>● EN CURSO</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {lastRefresh && <span style={{ fontSize: '11px', color: t.textMuted }}>Actualizado {lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
              <button onClick={fetchReport} style={{ padding: '6px 10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: t.text }}>
                <RefreshCw size={13} /> Actualizar
              </button>
              <button onClick={handlePrint} disabled={exporting} style={{ padding: '6px 12px', backgroundColor: exporting ? '#6b7280' : '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', cursor: exporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}>
                <Printer size={13} /> {exporting ? 'Generando...' : 'Exportar PDF'}
              </button>
              <button onClick={onClose} style={{ padding: '6px 8px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '6px', cursor: 'pointer', color: t.text }}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div data-pdf-scroll="1" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

            {/* ── 1. HEADER ── */}
            <div data-pdf-header="1" style={{ backgroundColor: `${t.accent}10`, border: `1px solid ${t.accent}30`, borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                {[
                  { label: L.campaign, value: h.campaignNumber },
                  { label: L.client, value: h.clientName },
                  { label: L.part, value: h.partNumber ? `${h.partNumber}${h.partName ? ' — ' + h.partName : ''}` : '—' },
                  { label: L.lot, value: h.lotNumber || '—' },
                  { label: L.shift, value: h.shiftCode ? `${h.shiftCode} — ${h.shiftName}` : shiftLabel },
                  { label: L.date, value: fmtDate(date) },
                  { label: L.generated, value: data?.generatedAt ? fmtTime(data.generatedAt) : '—' },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: '10px', color: t.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>{f.label}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>{f.value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 2. KPIs ── */}
            <Section title="KPIs del Turno">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                {[
                  { label: 'INSP', value: kpis.qtyInspected, color: t.accent },
                  { label: 'OK', value: kpis.qtyOk, color: '#16a34a' },
                  { label: 'NOK', value: kpis.qtyNok, color: '#B00020' },
                  { label: 'Yield %', value: kpis.yieldPct != null ? `${kpis.yieldPct}%` : '—', color: parseFloat(kpis.yieldPct) >= 95 ? '#16a34a' : '#f59e0b' },
                  { label: L.scrap, value: kpis.qtyScrap, color: '#ef4444' },
                  { label: L.downtime, value: kpis.downtimeMin > 0 ? `${kpis.downtimeMin} min` : '—', color: kpis.downtimeMin > 0 ? '#f59e0b' : t.textMuted },
                ].map(k => (
                  <div key={k.label} style={{ textAlign: 'center', minWidth: '70px' }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: k.color }}>{k.value ?? '—'}</div>
                    <div style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase', fontWeight: '600' }}>{k.label}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── 3. AVANCE ── */}
            <Section title="Avance de Cuarentena">
              {avance.qtyEnPlanta > 0 ? (
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {[
                    { label: 'En Planta', value: avance.qtyEnPlanta, color: '#f59e0b' },
                    { label: L.inspected, value: avance.qtyInspected, color: '#7c3aed' },
                    { label: L.remaining, value: Math.max(0, avance.qtyEnPlanta - avance.qtyInspected), color: avance.qtyEnPlanta - avance.qtyInspected > 0 ? '#B00020' : '#16a34a' },
                  ].map(a => (
                    <div key={a.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: a.color }}>{a.value}</div>
                      <div style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase', fontWeight: '600' }}>{a.label}</div>
                    </div>
                  ))}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                      <span style={{ color: t.textMuted }}>% Avance campaña</span>
                      <span style={{ color: avancePct >= 100 ? '#16a34a' : t.accent }}>{avancePct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '10px', backgroundColor: t.border, borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${avancePct}%`, height: '100%', backgroundColor: avancePct >= 100 ? '#16a34a' : '#f59e0b', borderRadius: '6px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: t.textMuted, fontSize: '13px' }}>Sin cantidad en cuarentena definida.</p>
              )}
            </Section>

            {/* ── 4. PARETO ── */}
            <Section title="Pareto de Defectos">
              {pareto.length === 0 ? <p style={{ color: t.textMuted, fontSize: '13px' }}>Sin defectos registrados.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                      {[L.defect, L.qty, L.nokPct, L.accumPct, L.bar].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: h === L.qty || h === L.nokPct || h === L.accumPct ? 'center' : 'left', color: t.textMuted, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pareto.map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={{ padding: '8px 10px', fontWeight: i === 0 ? '700' : '400', color: t.text }}>{row.defectName}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700', color: '#B00020' }}>{row.qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: t.text }}>{row.pctNok}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: t.textMuted }}>{row.pctCumulative}%</td>
                        <td style={{ padding: '8px 10px', width: '120px' }}>
                          <div style={{ height: '8px', backgroundColor: t.border, borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${(row.qty / paretoMax) * 100}%`, height: '100%', backgroundColor: i === 0 ? '#B00020' : '#f59e0b', borderRadius: '4px' }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* ── 4b. REGISTRO DE DOWNTIME ── */}
            <DowntimeSection
              downtimeLog={downtimeLog}
              campaignId={campaignId}
              onRefresh={fetchReport}
              fmtTime={fmtTime}
            />

            {/* ── 5. DISPOSICIÓN ── */}
            <Section title="Breakdown por Disposición">
              {disposition.length === 0 ? <p style={{ color: t.textMuted, fontSize: '13px' }}>Sin disposiciones registradas.</p> : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {disposition.map(d => {
                    const style = DISP_COLORS[d.code] || { bg: t.bgPanel, color: t.text };
                    return (
                      <div key={d.code} style={{ padding: '10px 16px', backgroundColor: style.bg, borderRadius: '8px', textAlign: 'center', minWidth: '90px' }}>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: style.color }}>{d.qty}</div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: style.color, textTransform: 'uppercase' }}>{d.name || d.code}</div>
                        <div style={{ fontSize: '11px', color: style.color, opacity: 0.8 }}>{d.pct}%</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* ── 5b. POR INSPECTOR ── */}
            <Section title="Desempeño por Inspector">
              {inspectors.length === 0 ? <p style={{ color: t.textMuted, fontSize: '13px' }}>Sin datos de inspectores.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                      {[L.inspector, L.ok, L.nok, L.insp, L.yieldPct, L.detectionPct].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: h === L.inspector ? 'left' : 'center', color: t.textMuted, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inspectors.map((ins, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={{ padding: '8px 10px', fontWeight: '600', color: t.text }}>{ins.name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>{ins.qtyOk}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#B00020', fontWeight: '600' }}>{ins.qtyNok}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: t.accent, fontWeight: '600' }}>{ins.qtyInspected}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: parseFloat(ins.yieldPct) >= 95 ? '#16a34a' : '#f59e0b' }}>{ins.yieldPct != null ? `${ins.yieldPct}%` : '—'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: t.text }}>{ins.detectionRate != null ? `${ins.detectionRate}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* ── 5c. RESUMEN REGISTRO MASIVO ── */}
            {(() => {
              // Build cross-tab: defectName × dispositionCode → qty
              if (entries.length === 0 && kpis.qtyOk === 0) return null;
              const dispCodes = [];
              const dispNames = {};
              const defectMap = {}; // defectName → { dispCode → qty, total }
              entries.forEach(e => {
                const dc = e.dispositionCode || 'SIN_DISP';
                if (!dispCodes.includes(dc)) { dispCodes.push(dc); dispNames[dc] = e.dispositionName || dc; }
                const dn = e.defectName || L.unclassified;
                if (!defectMap[dn]) defectMap[dn] = { total: 0 };
                defectMap[dn][dc] = (defectMap[dn][dc] || 0) + (e.quantity || 1);
                defectMap[dn].total += (e.quantity || 1);
              });
              const defectRows = Object.entries(defectMap).filter(([, v]) => v.total > 0).sort((a, b) => b[1].total - a[1].total);
              const totalNok = defectRows.reduce((s, [, v]) => s + v.total, 0);
              return (
                <Section title="Resumen de Captura por Defecto">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', color: t.textMuted, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>Defecto</th>
                        {dispCodes.map(dc => (
                          <th key={dc} style={{ padding: '6px 8px', textAlign: 'center', color: (DISP_COLORS[dc] || {}).color || t.textMuted, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>
                            {dispNames[dc]}
                          </th>
                        ))}
                        <th style={{ padding: '6px 8px', textAlign: 'center', color: '#B00020', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* OK row */}
                      <tr style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: '#d1fae520' }}>
                        <td style={{ padding: '7px 10px', fontWeight: '700', color: '#16a34a' }}>✓ OK</td>
                        {dispCodes.map(dc => <td key={dc} style={{ padding: '7px 8px', textAlign: 'center', color: t.textMuted }}>—</td>)}
                        <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: '700', color: '#16a34a' }}>{kpis.qtyOk}</td>
                      </tr>
                      {defectRows.map(([defectName, vals], i) => (
                        <tr key={defectName} style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: i % 2 === 0 ? t.bgCard : t.bgPanel }}>
                          <td style={{ padding: '7px 10px', color: t.text, fontWeight: '500' }}>{defectName}</td>
                          {dispCodes.map(dc => {
                            const qty = vals[dc];
                            const dStyle = DISP_COLORS[dc] || {};
                            return (
                              <td key={dc} style={{ padding: '7px 8px', textAlign: 'center' }}>
                                {qty > 0
                                  ? <span style={{ padding: '2px 8px', backgroundColor: dStyle.bg || t.bgPanel, color: dStyle.color || t.text, borderRadius: '10px', fontWeight: '700', fontSize: '12px' }}>{qty}</span>
                                  : <span style={{ color: t.border }}>—</span>
                                }
                              </td>
                            );
                          })}
                          <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: '700', color: '#B00020' }}>{vals.total}</td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr style={{ borderTop: `2px solid ${t.border}`, backgroundColor: t.bgPanel }}>
                        <td style={{ padding: '7px 10px', fontWeight: '700', color: t.text, textTransform: 'uppercase', fontSize: '11px' }}>Total NOK</td>
                        {dispCodes.map(dc => {
                          const colTotal = defectRows.reduce((s, [, v]) => s + (v[dc] || 0), 0);
                          const dStyle = DISP_COLORS[dc] || {};
                          return (
                            <td key={dc} style={{ padding: '7px 8px', textAlign: 'center', fontWeight: '700', color: dStyle.color || t.text }}>{colTotal || '—'}</td>
                          );
                        })}
                        <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: '700', color: '#B00020' }}>{totalNok}</td>
                      </tr>
                    </tbody>
                  </table>
                </Section>
              );
            })()}

            {/* ── 6. TALLY SHEETS ── */}
            <Section title={`Tally Sheets (${tallies.length})`} defaultOpen={tallies.length > 0}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {tallies.length === 0 && (
                  <p style={{ color: t.textMuted, fontSize: '13px', margin: 0 }}>Sin tally sheets subidos.</p>
                )}
                {tallies.map(ts => (
                  <a key={ts.id} href={`${API_URL}${ts.filePath}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', color: '#92400e', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
                    📄 {ts.filename}
                  </a>
                ))}
                {/* Subir tally sheet retroactivo */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: t.bgInput, border: `1px dashed ${t.border}`, borderRadius: '6px', color: uploadingTally ? t.textMuted : t.accent, fontSize: '12px', fontWeight: '600', cursor: uploadingTally ? 'not-allowed' : 'pointer' }}>
                  {uploadingTally ? '⏳ Subiendo...' : '+ Agregar Tally Sheet'}
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    style={{ display: 'none' }}
                    disabled={uploadingTally}
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingTally(true);
                      const token = localStorage.getItem('token');
                      const fd = new FormData();
                      fd.append('file', file);
                      fd.append('attachmentType', 'tally_sheet');
                      fd.append('inspectionDate', date);
                      if (shiftId) fd.append('shiftId', shiftId);
                      try {
                        const res = await fetch(`${API_URL}/mrb/${campaignId}/attachments`, {
                          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
                        });
                        const d = await res.json();
                        if (d.success) fetchReport();
                      } catch (_) {}
                      finally { setUploadingTally(false); e.target.value = ''; }
                    }}
                  />
                </label>
              </div>
            </Section>

            {/* ── 7. DEFECTOS INDIVIDUALES CON TIMESTAMPS Y FOTOS ── */}
            <Section title={`Registro Individual (${entries.length} entradas)`} defaultOpen={entries.length > 0} sectionId="entries">
              {entries.length === 0 ? <p style={{ color: t.textMuted, fontSize: '13px' }}>Sin entradas individuales.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {entries.map((e, i) => {
                    const dispStyle = DISP_COLORS[e.dispositionCode] || { bg: t.bgPanel, color: t.text };
                    const fields = [
                      { label: L.hour,        value: <span style={{ fontFamily: 'monospace', color: t.accent, fontWeight: '700' }}>{fmtTime(e.createdAt)}</span> },
                      { label: L.serial,      value: <span style={{ fontWeight: '700', color: t.text }}>{e.lotNumber || '—'}</span> },
                      { label: L.part,       value: e.partNumber || '—' },
                      { label: L.defect,     value: <span style={{ fontWeight: '700', color: '#B00020' }}>{e.defectName || '—'}</span> },
                      { label: L.disposition, value: e.dispositionCode
                          ? <span style={{ padding: '2px 10px', backgroundColor: dispStyle.bg, color: dispStyle.color, borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>{e.dispositionName || e.dispositionCode}</span>
                          : '—'
                      },
                      { label: L.inspector,   value: e.inspector || '—' },
                      { label: L.notes,       value: e.notes || <span style={{ color: t.textMuted, fontStyle: 'italic' }}>{L.noNotes}</span> },
                    ];
                    return (
                      <div key={e.id} data-pdf-entry="1" style={{
                        display: 'flex', gap: '0', borderRadius: '8px', overflow: 'hidden',
                        border: `1px solid ${t.border}`,
                        backgroundColor: i % 2 === 0 ? t.bgCard : t.bgPanel,
                      }}>
                        {/* LEFT — campos */}
                        <div style={{ flex: '1 1 0', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                          {fields.map(f => (
                            <div key={f.label} style={{ display: 'flex', gap: '8px', alignItems: 'baseline', fontSize: '12px' }}>
                              <span style={{ width: '84px', flexShrink: 0, fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: t.textMuted }}>{f.label}</span>
                              <span style={{ color: t.text }}>{f.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* RIGHT — fotos */}
                        <div style={{
                          width: e.evidence?.length > 0 ? '300px' : '80px', flexShrink: 0,
                          borderLeft: `1px solid ${t.border}`,
                          backgroundColor: t.bgInput,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: '6px', padding: e.evidence?.length > 0 ? '10px' : '0',
                        }}>
                          {e.evidence?.length > 0 ? (
                            e.evidence.map(ev => (
                              <a key={ev.id} href={`${API_URL}${ev.filePath}`} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%' }}>
                                <img
                                  src={`${API_URL}${ev.filePath}`}
                                  alt=""
                                  crossOrigin="anonymous"
                                  style={{ width: '100%', height: e.evidence.length === 1 ? '260px' : '150px', objectFit: 'cover', borderRadius: '6px', border: `1px solid ${t.border}`, display: 'block' }}
                                />
                              </a>
                            ))
                          ) : (
                            <span style={{ fontSize: '11px', color: t.textMuted, opacity: 0.5 }}>Sin foto</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* ── 8. SERIALES OK (de lista afectados) ── */}
            {okSerials.length > 0 && (
              <Section title={`Seriales Liberados OK (${okSerials.length})`} defaultOpen={true} sectionId="ok-serials">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {okSerials.map((e, i) => (
                    <div key={e.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 12px', backgroundColor: i % 2 === 0 ? t.bgCard : t.bgPanel, borderRadius: '6px', fontSize: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', color: t.textMuted, minWidth: '60px' }}>{fmtTime(e.inspectedAt)}</span>
                      <span style={{ fontWeight: '700', color: '#2E7D32', minWidth: '140px' }}>{e.serialNumber}</span>
                      {e.partNumber && <span style={{ color: t.textDim }}>{e.partNumber}</span>}
                      <span style={{ marginLeft: 'auto', color: t.textMuted }}>{e.inspector}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── 9. PIEZAS OK — LOTES (legacy) ── */}
            {okEntries.length > 0 && (
              <Section title={`Piezas OK por Lote (${okEntries.length})`} defaultOpen={false} sectionId="ok-entries">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {okEntries.map((e, i) => (
                    <div key={e.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 12px', backgroundColor: i % 2 === 0 ? t.bgCard : t.bgPanel, borderRadius: '6px', fontSize: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', color: t.textMuted, minWidth: '60px' }}>{fmtTime(e.createdAt)}</span>
                      <span style={{ fontWeight: '700', color: '#2E7D32', minWidth: '120px' }}>{e.lotNumber || <span style={{ color: t.textMuted, fontStyle: 'italic' }}>Sin serial</span>}</span>
                      <span style={{ color: t.text }}>Qty: {e.quantity}</span>
                      {e.partNumber && <span style={{ color: t.textDim }}>{e.partNumber}</span>}
                      <span style={{ marginLeft: 'auto', color: t.textMuted }}>{e.inspector}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default MRBShiftReport;
