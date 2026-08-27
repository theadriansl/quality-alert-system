/**
 * HomeNotifications.js
 * Widget de Open Items: 8D, QAR, ECR
 * Muestra items abiertos del usuario con checkbox para marcar como revisado.
 * Los items marcados se ocultan y persisten en localStorage.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const STORAGE_KEY = 'openItems_dismissed';

const TYPE_CONFIG = {
  qar: { label: 'QAR', color: '#EF4444' },
  '8d': { label: '8D', color: '#F59E0B' },
  ecr: { label: 'ECR', color: '#3B82F6' },
};

const HomeNotifications = () => {
  const navigate = useNavigate();
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const { subscribe } = useSocket();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({ qar: 0, eightD: 0, ecr: 0, total: 0 });
  const [dismissed, setDismissed] = useState({});
  const [showDismissed, setShowDismissed] = useState(false);

  // Cargar dismissed items de localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Limpiar items viejos (más de 7 días)
        const now = Date.now();
        const cleaned = {};
        Object.entries(parsed).forEach(([key, timestamp]) => {
          if (now - timestamp < 7 * 24 * 60 * 60 * 1000) {
            cleaned[key] = timestamp;
          }
        });
        setDismissed(cleaned);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      }
    } catch (err) {
      console.error('Error loading dismissed items:', err);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/notifications/my-pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setCounts(data.counts);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // WebSocket: Actualizar cuando hay cambios en QAR, 8D, ECR
  useEffect(() => {
    const events = ['qar:created', '8d:created', '8d:updated', 'ecr:created', 'ecr:approved'];
    const unsubscribes = events.map(event =>
      subscribe(event, () => load())
    );
    return () => unsubscribes.forEach(unsub => unsub());
  }, [subscribe, load]);

  const getItemKey = (item) => `${item.type}-${item.id}`;

  const toggleDismiss = (item) => {
    const key = getItemKey(item);
    setDismissed(prev => {
      const newDismissed = { ...prev };
      if (newDismissed[key]) {
        delete newDismissed[key];
      } else {
        newDismissed[key] = Date.now();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDismissed));
      return newDismissed;
    });
  };

  const labels = {
    title: language === 'es' ? 'ITEMS ABIERTOS' : 'OPEN ITEMS',
    empty: language === 'es' ? 'Sin items abiertos' : 'No open items',
    showHidden: language === 'es' ? 'Ver ocultos' : 'Show hidden',
    hideHidden: language === 'es' ? 'Ocultar' : 'Hide',
    qar: 'QAR',
    eightD: '8D',
    ecr: 'ECR',
  };

  if (loading) return null;

  // Filtrar items no dismissados (o todos si showDismissed está activo)
  const visibleItems = showDismissed
    ? notifications
    : notifications.filter(n => !dismissed[getItemKey(n)]);

  const dismissedCount = notifications.filter(n => dismissed[getItemKey(n)]).length;

  if (notifications.length === 0) {
    return (
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: '20px 16px', height: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text, letterSpacing: 0.3 }}>
            {labels.title}
          </span>
        </div>
        <div style={{ fontSize: 12, color: t.textMuted, textAlign: 'center', padding: '20px 0' }}>
          {labels.empty}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: '16px', height: 'fit-content' }}>
      {/* Header con contadores */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text, letterSpacing: 0.3 }}>{labels.title}</span>
            {visibleItems.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: t.primary, borderRadius: 10, padding: '2px 7px' }}>
                {visibleItems.length}
              </span>
            )}
          </div>
          {dismissedCount > 0 && (
            <span
              onClick={() => setShowDismissed(!showDismissed)}
              style={{ fontSize: 10, color: t.primary, cursor: 'pointer', fontWeight: 600 }}
            >
              {showDismissed ? labels.hideHidden : `${labels.showHidden} (${dismissedCount})`}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {counts.qar > 0 && (
            <span style={{ fontSize: 10, color: TYPE_CONFIG.qar.color, fontWeight: 600 }}>{counts.qar} {labels.qar}</span>
          )}
          {counts.eightD > 0 && (
            <span style={{ fontSize: 10, color: TYPE_CONFIG['8d'].color, fontWeight: 600 }}>{counts.eightD} {labels.eightD}</span>
          )}
          {counts.ecr > 0 && (
            <span style={{ fontSize: 10, color: TYPE_CONFIG.ecr.color, fontWeight: 600 }}>{counts.ecr} {labels.ecr}</span>
          )}
        </div>
      </div>

      {/* Lista de items con scroll */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
        {visibleItems.length === 0 ? (
          <div style={{ fontSize: 11, color: t.textMuted, textAlign: 'center', padding: '12px 0' }}>
            {language === 'es' ? 'Todos los items revisados' : 'All items reviewed'}
          </div>
        ) : (
          visibleItems.map((n) => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.qar;
            const isDismissed = !!dismissed[getItemKey(n)];
            return (
              <div
                key={`${n.type}-${n.id}`}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
                  background: t.bgPanel, borderRadius: 6,
                  border: `1px solid ${t.border}`,
                  opacity: isDismissed ? 0.5 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              >
                {/* Checkbox para marcar como revisado */}
                <div
                  onClick={(e) => { e.stopPropagation(); toggleDismiss(n); }}
                  title={isDismissed
                    ? (language === 'es' ? 'Mostrar de nuevo' : 'Show again')
                    : (language === 'es' ? 'Check enterado y Ocultar Item' : 'Acknowledge and Hide Item')
                  }
                  style={{
                    width: 16, height: 16, minWidth: 16, borderRadius: 4,
                    border: `2px solid ${isDismissed ? t.success : t.border}`,
                    background: isDismissed ? t.success : 'transparent',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 2
                  }}
                >
                  {isDismissed && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                {/* Contenido */}
                <div
                  onClick={() => navigate(n.path)}
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: '#fff',
                      background: config.color, padding: '1px 5px', borderRadius: 3
                    }}>
                      {config.label}
                    </span>
                    <span style={{ fontSize: 10, color: t.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {n.code}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 11.5, color: t.text, lineHeight: 1.35,
                    textDecoration: isDismissed ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 9.5, color: t.textMuted, marginTop: 2 }}>
                    {n.status}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HomeNotifications;
