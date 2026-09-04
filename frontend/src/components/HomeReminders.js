/**
 * HomeReminders.js
 * Widget compacto de actividades pendientes para Home.
 * Muestra resumen en header + listado sencillo con checkbox para completar.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Colores de prioridad - usa tokens del theme
const getPriorityColors = (t) => ({
  critical: { bg: t?.errorBg || '#FEE2E2', text: t?.errorFg || '#991B1B' },
  high: { bg: t?.errorBg || '#FEE2E2', text: t?.errorFg || '#991B1B' },
  medium: { bg: t?.warningBg || '#FEF3C7', text: t?.warningFg || '#92400E' },
  low: { bg: t?.bgPanel || '#F3F4F6', text: t?.textMuted || '#6B7280' },
});

const HomeReminders = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const { subscribe } = useSocket();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [counts, setCounts] = useState({ overdue: 0, today: 0, week: 0, future: 0, total: 0 });
  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/workload/my-day`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities);
        setCounts(data.counts);
      }
    } catch (err) {
      console.error('Error loading my-day:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // WebSocket: Actualizar cuando hay cambios en actividades
  useEffect(() => {
    const events = ['8d:created', '8d:updated', 'qar:created', 'ecr:created', 'ecr:approved'];
    const unsubscribes = events.map(event =>
      subscribe(event, () => load())
    );
    return () => unsubscribes.forEach(unsub => unsub());
  }, [subscribe, load]);

  const totalPending = counts.total || (counts.overdue + counts.today + counts.week + counts.noDate);

  // Si no hay actividades, mostrar estado vacío en columna
  if (loading) return null;

  if (activities.length === 0) {
    return (
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: '20px 16px', height: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.text, letterSpacing: 0.3 }}>
            {language === 'es' ? 'MI WORKLOAD' : 'MY WORKLOAD'}
          </span>
          <span
            onClick={() => navigate('/workload')}
            style={{ fontSize: 11, color: t.primary, cursor: 'pointer', fontWeight: 600 }}
          >
            {language === 'es' ? 'Ver todo →' : 'View all →'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: t.textMuted, textAlign: 'center', padding: '20px 0' }}>
          {language === 'es' ? 'Sin pendientes' : 'No pending tasks'}
        </div>
      </div>
    );
  }

  const labels = {
    title: language === 'es' ? 'MI WORKLOAD' : 'MY WORKLOAD',
    overdue: language === 'es' ? 'Atrasadas' : 'Overdue',
    today: language === 'es' ? 'Hoy' : 'Today',
    week: language === 'es' ? 'Semana' : 'Week',
    future: language === 'es' ? 'Futuras' : 'Future',
    viewAll: language === 'es' ? 'Ver en Workload' : 'View in Workload',
    dueToday: language === 'es' ? 'Vence hoy' : 'Due today',
    overdueDays: (d) => language === 'es' ? `${d}d atraso` : `${d}d overdue`,
  };

  const getDueLabel = (activity) => {
    if (!activity.due_date) return '-';
    if (activity.bucket === 'today') return labels.dueToday;
    if (activity.bucket === 'overdue') {
      const days = Math.max(1, Math.round((new Date() - new Date(activity.due_date)) / 86400000));
      return labels.overdueDays(days);
    }
    return new Date(activity.due_date).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: '16px', height: 'fit-content' }}>
      {/* Header con contadores */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text, letterSpacing: 0.3 }}>{labels.title}</span>
            {totalPending > 0 && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'white', background: t.primary, borderRadius: 10, padding: '2px 7px' }}>
                {totalPending}
              </span>
            )}
          </div>
          <span
            onClick={() => navigate('/workload')}
            style={{ fontSize: 11, color: t.primary, cursor: 'pointer', fontWeight: 600 }}
          >
            {labels.viewAll} →
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {counts.overdue > 0 && (
            <span style={{ fontSize: 10, color: t.error, fontWeight: 600 }}>{counts.overdue} {labels.overdue}</span>
          )}
          {counts.today > 0 && (
            <span style={{ fontSize: 10, color: t.warning, fontWeight: 600 }}>{counts.today} {labels.today}</span>
          )}
          {counts.week > 0 && (
            <span style={{ fontSize: 10, color: t.info, fontWeight: 600 }}>{counts.week} {labels.week}</span>
          )}
          {counts.future > 0 && (
            <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 600 }}>{counts.future} {labels.future}</span>
          )}
        </div>
      </div>

      {/* Lista de actividades con scroll */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
        {activities.map((a) => {
          const PRIORITY_COLORS = getPriorityColors(t);
          const pr = PRIORITY_COLORS[a.priority] || PRIORITY_COLORS.medium;
          const dotColor = a.bucket === 'overdue' ? t.error : a.bucket === 'today' ? t.warning : a.bucket === 'future' ? t.textMuted : t.info;
          return (
            <div
              key={a.id}
              onClick={() => navigate('/workload')}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
                background: t.bgPanel, borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${t.border}`,
              }}
            >
                            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: t.text, lineHeight: 1.35, marginBottom: 4 }}>
                  {a.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 9.5, color: dotColor }}>{getDueLabel(a)}</span>
                  <span style={{ fontSize: 8, fontWeight: 600, color: pr.text, background: pr.bg, padding: '1px 5px', borderRadius: 3 }}>
                    {a.priority?.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default HomeReminders;
