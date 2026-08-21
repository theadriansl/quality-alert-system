import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeSelector } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import usePermissions from '../hooks/usePermissions';
import { isUserAdmin } from '../utils/permissions';

// Squarified Treemap Algorithm
function worstRatio(areas, sum, side) {
  if (areas.length === 0) return Infinity;
  const maxA = Math.max(...areas);
  const minA = Math.min(...areas);
  return Math.max((side * side * maxA) / (sum * sum), (sum * sum) / (side * side * minA));
}

function squarify(items, x, y, w, h) {
  const result = [];
  let remaining = items.slice();

  while (remaining.length) {
    const shortSide = Math.min(w, h);
    let row = [remaining[0]];
    let rowSum = remaining[0].area;
    let i = 1;

    while (i < remaining.length) {
      const testRow = [...row, remaining[i]];
      const testSum = rowSum + remaining[i].area;
      const curWorst = worstRatio(row.map(r => r.area), rowSum, shortSide);
      const testWorst = worstRatio(testRow.map(r => r.area), testSum, shortSide);
      if (testWorst <= curWorst) {
        row = testRow;
        rowSum = testSum;
        i++;
      } else break;
    }

    if (w >= h) {
      const rowWidth = rowSum / h;
      let cy = y;
      for (const it of row) {
        const rh = it.area / rowWidth;
        result.push({ item: it, x, y: cy, w: rowWidth, h: rh });
        cy += rh;
      }
      x += rowWidth;
      w -= rowWidth;
    } else {
      const rowHeight = rowSum / w;
      let cx = x;
      for (const it of row) {
        const rw = it.area / rowHeight;
        result.push({ item: it, x: cx, y, w: rw, h: rowHeight });
        cx += rw;
      }
      y += rowHeight;
      h -= rowHeight;
    }
    remaining = remaining.slice(row.length);
  }
  return result;
}

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme: t } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const { hasAccess, loading: permissionsLoading, getAccessibleModules } = usePermissions();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredTile, setHoveredTile] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = isUserAdmin(user);

  // Module definitions with usage values (will connect to real analytics later)
  const allApps = [
    { id: 'inspeccion', moduleId: 'quality_alert', code: 'INS', name: 'Inspección de Defectos', desc: 'Captura directa de defectos en línea', path: '/defect-capture', value: 95 },
    { id: 'quality_alert', moduleId: 'quality_alert', code: 'QAR', name: 'Alerta de Calidad', desc: 'Captura de defectos y generación de alertas', path: '/defect-dashboard', value: 88 },
    { id: 'repair_station', moduleId: 'quality_alert', code: 'EST', name: 'Estación de Reparación', desc: 'Vista simplificada para reparadores', path: '/repair-station', value: 82 },
    { id: '8d', moduleId: '8d', code: '8D', name: '8D Problem Solving', desc: 'Gestión de reportes 8D multinivel', path: '/dashboard', value: 75 },
    { id: 'defect_hospital', moduleId: 'quality_alert', code: 'REP', name: 'Hospital de Defectos', desc: 'Reparación y liberación de defectos', path: '/hospital-dashboard', value: 70 },
    { id: 'mrb', moduleId: 'mrb', code: 'MRB', name: 'Material Review Board', desc: 'Campañas de calidad y material NC', path: '/mrb-dashboard', value: 65 },
    { id: 'work_instructions', moduleId: 'work_instructions', code: 'WI', name: 'Work Instructions', desc: 'Instrucciones de trabajo versionadas', path: '/work-instructions', value: 60 },
    { id: 'audits', moduleId: 'audits', code: 'AUD', name: 'Auditorías Internas', desc: 'Programa de auditorías con checklists', path: '/audit-dashboard', value: 55 },
    { id: 'skills', moduleId: 'skills', code: 'SKL', name: 'Skills & Training', desc: 'Gestión de habilidades del equipo', path: '/skills/dashboard', value: 50 },
    { id: 'iluo', moduleId: 'work_instructions', code: 'ILUO', name: 'Certificaciones ILUO', desc: 'Certificaciones con matriz de cobertura', path: '/work-instructions-dashboard', value: 45 },
    { id: 'workload', moduleId: 'workload', code: 'WKL', name: 'Gestor de Cargas', desc: 'Asignación y tracking del equipo', path: '/workload', value: 40 },
    { id: 'clients', moduleId: 'clients', code: 'CLT', name: 'Gestión de Clientes', desc: 'Clientes, proyectos y BOM global', path: '/clients', value: 38 },
    { id: 'ecr', moduleId: 'ecr', code: 'ECR', name: 'Cambios de Ingeniería', desc: 'ECR con análisis de impacto', path: '/ecr-dashboard', value: 35 },
    { id: 'calibration', moduleId: 'quality_alert', code: 'CAL', name: 'Equipos de Calibración', desc: 'Control de equipos y alertas', path: '/calibration', value: 32 },
    { id: 'release_ok', moduleId: 'quality_alert', code: 'REL', name: 'Release OK', desc: 'Estación final de liberación', path: '/release-ok', value: 30 },
    { id: 'management_review', moduleId: 'management_review', code: 'MGT', name: 'Revisión Directiva', desc: 'Revisión por la dirección', path: '/management-review', value: 25 },
    { id: 'reports', moduleId: 'reports', code: 'RPT', name: 'Centro de Reportes', desc: 'Generación masiva de reportes Excel', path: '/report-center', value: 22 },
    { id: 'configuration', moduleId: 'admin', code: 'CFG', name: 'Configuración', desc: 'Usuarios, roles y sistema', path: '/configuration', value: 20, adminOnly: true },
    { id: 'user_manual', moduleId: 'help', code: '?', name: 'Manual de Usuario', desc: 'Guía completa del sistema', path: '/manual', value: 15 }
  ];

  const getVisibleApps = () => {
    if (isAdmin) return allApps;
    const accessibleModules = getAccessibleModules();
    return allApps.filter(app => {
      if (app.adminOnly) return false;
      return accessibleModules.includes(app.moduleId) || hasAccess(app.moduleId, 'view');
    });
  };

  const visibleApps = getVisibleApps();

  // Calculate treemap layout
  const treemapData = useMemo(() => {
    if (visibleApps.length === 0) return { tiles: [], placed: [] };

    const W = 1200, H = 500;
    const totalValue = visibleApps.reduce((s, app) => s + app.value, 0);
    const items = visibleApps.map(app => ({
      ...app,
      area: (app.value / totalValue) * (W * H)
    })).sort((a, b) => b.area - a.area);

    const placed = squarify(items, 0, 0, W, H);

    const minVal = Math.min(...visibleApps.map(a => a.value));
    const maxVal = Math.max(...visibleApps.map(a => a.value));

    // Detect if dark mode from theme
    const isDark = t.bg?.includes('0.1') || t.bg?.includes('0.15') || t.bg?.includes('rgb(') && parseInt(t.bg.match(/\d+/)?.[0] || 255) < 100;

    const heatColor = (v) => {
      const ratio = (v - minVal) / (maxVal - minVal);
      if (isDark) {
        // Dark mode: from dark muted to bright saturated
        const lightness = 0.25 + ratio * 0.35;
        const chroma = 0.02 + ratio * 0.08;
        return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} 235)`;
      } else {
        // Light mode: from light to dark saturated
        const lightness = 0.88 - ratio * 0.55;
        const chroma = 0.006 + ratio * 0.06;
        return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} 235)`;
      }
    };

    const tiles = placed.map(p => {
      const { item } = p;
      const leftPct = (p.x / W) * 100;
      const topPct = (p.y / H) * 100;
      const wPct = (p.w / W) * 100;
      const hPct = (p.h / H) * 100;
      const ratio = (item.value - minVal) / (maxVal - minVal);
      const dark = isDark ? ratio > 0.3 : ratio > 0.42;
      const pxW = p.w;
      const pxH = p.h;

      return {
        ...item,
        left: leftPct,
        top: topPct,
        width: wPct,
        height: hPct,
        bgColor: heatColor(item.value),
        textColor: dark ? 'oklch(0.97 0.004 240)' : 'oklch(0.3 0.015 240)',
        mutedColor: dark ? 'oklch(0.85 0.008 240)' : 'oklch(0.45 0.012 240)',
        showTitle: pxW > 80 && pxH > 35,
        showDesc: pxW > 140 && pxH > 75,
        showPct: pxW > 80 && pxH > 50
      };
    });

    // Legend stops
    const legendStops = [];
    for (let i = 0; i < 6; i++) {
      const v = minVal + (i / 5) * (maxVal - minVal);
      legendStops.push(heatColor(v));
    }

    return { tiles, legendStops };
  }, [visibleApps]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatClock = () => {
    return currentTime.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  if (permissionsLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${t.border}`, borderTopColor: t.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: t.bg, fontFamily: "'Public Sans', 'Inter', sans-serif", color: t.text }}>

      {/* Header */}
      <div style={{ height: 64, background: t.bgCard, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: 6, background: t.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>QMS</span>
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: t.text, letterSpacing: -0.1 }}>Quality Management System</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>{formatClock()}</div>
          <div style={{ width: 1, height: 22, background: t.border }} />

          <button onClick={() => changeLanguage(language === 'es' ? 'en' : 'es')} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, color: t.text, background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: 4, cursor: 'pointer' }}>
            {language === 'es' ? 'EN' : 'ES'}
          </button>

          <ThemeSelector />

          <div style={{ width: 1, height: 22, background: t.border }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, minWidth: 30, borderRadius: '50%', background: t.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11.5 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div style={{ lineHeight: 1.25, whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{user?.firstName} {user?.lastName}</div>
              <div style={{ fontSize: 10.5, color: t.textMuted }}>{user?.position || user?.role}</div>
            </div>
          </div>

          <button onClick={handleLogout} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, color: t.textMuted, background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: 4, cursor: 'pointer' }}>
            {language === 'es' ? 'Salir' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px 48px' }}>

        {/* Title + Legend */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 20 }}>
          <div>
            <div style={{ fontSize: 21, fontWeight: 800, color: t.text, letterSpacing: -0.3 }}>
              {language === 'es' ? 'Módulos por importancia' : 'Modules by importance'}
            </div>
            <div style={{ fontSize: 13, color: t.textMuted, marginTop: 3 }}>
              {language === 'es' ? 'Tamaño y color según frecuencia de uso en los últimos 30 días' : 'Size and color based on usage frequency in last 30 days'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>{language === 'es' ? 'Menor uso' : 'Less used'}</span>
            <div style={{ display: 'flex', height: 10, width: 140, borderRadius: 5, overflow: 'hidden' }}>
              {treemapData.legendStops.map((color, i) => (
                <div key={i} style={{ flex: 1, background: color }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: t.textMuted }}>{language === 'es' ? 'Mayor uso' : 'More used'}</span>
          </div>
        </div>

        {/* Treemap */}
        {visibleApps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 32px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: t.textMuted, marginBottom: 8 }}>
              {language === 'es' ? 'Sin acceso a módulos' : 'No module access'}
            </div>
            <div style={{ fontSize: 14, color: t.textDim }}>
              {language === 'es' ? 'Contacte a su administrador' : 'Contact your administrator'}
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: 500, borderRadius: 8, overflow: 'hidden', border: `1px solid ${t.border}` }}>
            {treemapData.tiles.map((tile) => (
              <div
                key={tile.id}
                onClick={() => navigate(tile.path)}
                onMouseEnter={() => setHoveredTile(tile.id)}
                onMouseLeave={() => setHoveredTile(null)}
                style={{
                  position: 'absolute',
                  left: `${tile.left}%`,
                  top: `${tile.top}%`,
                  width: `${tile.width}%`,
                  height: `${tile.height}%`,
                  background: tile.bgColor,
                  border: `1px solid ${t.border}40`,
                  padding: '10px 12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  transition: 'filter 0.12s ease',
                  filter: hoveredTile === tile.id ? 'brightness(1.08)' : 'none',
                  wordBreak: 'break-word'
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, color: tile.textColor, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {tile.code}
                </div>
                {tile.showTitle && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: tile.textColor, marginTop: 4, lineHeight: 1.3 }}>
                    {tile.name}
                  </div>
                )}
                {tile.showDesc && (
                  <div style={{ fontSize: 11.5, color: tile.mutedColor, marginTop: 5, lineHeight: 1.4 }}>
                    {tile.desc}
                  </div>
                )}
                {tile.showPct && (
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: tile.mutedColor, marginTop: 6 }}>
                    {tile.value}% uso
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
