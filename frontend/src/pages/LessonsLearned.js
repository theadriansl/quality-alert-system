import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

const LessonsLearned = () => {
  const { showError } = useToast();
  const { theme: t } = useTheme();
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const fetchLessonsLearned = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/lessons-learned', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        setLessons(result.lessons || []);
      } else {
        showError(' Error al cargar lecciones aprendidas');
      }
    } catch (error) {
      console.error('Error fetching lessons learned:', error);
      showError(' Error al cargar lecciones aprendidas');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchLessonsLearned();
  }, [fetchLessonsLearned]);

  // Filter lessons
  const filteredLessons = lessons.filter(lesson => {
    const matchesText = filterText === '' ||
      lesson.lessonText?.toLowerCase().includes(filterText.toLowerCase()) ||
      lesson.reportTitle?.toLowerCase().includes(filterText.toLowerCase()) ||
      lesson.reportId?.toLowerCase().includes(filterText.toLowerCase()) ||
      lesson.clientName?.toLowerCase().includes(filterText.toLowerCase());

    const matchesSeverity = filterSeverity === 'all' || lesson.severity === filterSeverity;

    return matchesText && matchesSeverity;
  });

  const getSeverityBadge = (severity) => {
    const colors = {
      High: { bg: '#fee2e2', text: '#B00020', border: '#fecaca' },
      Medium: { bg: '#fef3c7', text: '#C77700', border: '#fde68a' },
      Low: { bg: '#dbeafe', text: '#2563eb', border: '#bfdbfe' }
    };

    const color = colors[severity] || colors.Medium;

    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`
      }}>
        {severity}
      </span>
    );
  };

  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: t.bg,
      minHeight: '100vh'
    },
    header: {
      marginBottom: '32px',
      borderBottom: `3px solid ${t.accent}`,
      paddingBottom: '16px'
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: t.text,
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '16px',
      color: t.textMuted
    },
    statsBar: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    statCard: {
      backgroundColor: t.bgCard,
      padding: '20px',
      borderRadius: '12px',
      border: `2px solid ${t.border}`,
      textAlign: 'center'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '700',
      color: t.accent,
      marginBottom: '4px'
    },
    statLabel: {
      fontSize: '14px',
      color: t.textMuted,
      fontWeight: '500'
    },
    filters: {
      backgroundColor: t.bgPanel,
      padding: '20px',
      borderRadius: '12px',
      border: `1px solid ${t.border}`,
      marginBottom: '24px',
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    filterInput: {
      flex: 1,
      minWidth: '300px',
      padding: '12px 16px',
      fontSize: '14px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      boxSizing: 'border-box',
      backgroundColor: t.bgCard,
      color: t.text
    },
    filterSelect: {
      padding: '12px 16px',
      fontSize: '14px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      backgroundColor: t.bgCard,
      color: t.text,
      minWidth: '150px'
    },
    lessonCard: {
      backgroundColor: t.bgCard,
      padding: '24px',
      borderRadius: '12px',
      border: `1px solid ${t.border}`,
      marginBottom: '16px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      transition: 'box-shadow 0.2s',
      cursor: 'pointer'
    },
    lessonHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px',
      gap: '16px'
    },
    reportInfo: {
      flex: 1
    },
    reportId: {
      fontSize: '18px',
      fontWeight: '700',
      color: t.accent,
      marginBottom: '4px'
    },
    reportTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: t.text,
      marginBottom: '8px'
    },
    metaInfo: {
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      fontSize: '13px',
      color: t.textMuted,
      marginTop: '8px'
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    lessonText: {
      backgroundColor: t.bgPanel,
      padding: '16px',
      borderRadius: '8px',
      borderLeft: `4px solid ${t.accent}`,
      fontSize: '15px',
      lineHeight: '1.7',
      color: t.text,
      marginTop: '16px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '64px 32px',
      color: t.textMuted,
      fontSize: '16px'
    },
    loading: {
      textAlign: 'center',
      padding: '64px 32px',
      fontSize: '18px',
      color: t.accent
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}> Base de Datos de Lecciones Aprendidas</div>
        <div style={styles.subtitle}>
          Conocimiento acumulado de todos los reportes 8D del sistema
        </div>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{lessons.length}</div>
          <div style={styles.statLabel}>Total Lecciones</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {new Set(lessons.map(l => l.reportId)).size}
          </div>
          <div style={styles.statLabel}>Reportes 8D</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {lessons.filter(l => l.severity === 'High').length}
          </div>
          <div style={styles.statLabel}>Severidad Alta</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder=" Buscar por reporte, cliente, o lección aprendida..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={styles.filterInput}
        />
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">Todas las Severidades</option>
          <option value="High">Alta</option>
          <option value="Medium">Media</option>
          <option value="Low">Baja</option>
        </select>
      </div>

      {/* Lessons List */}
      {isLoading ? (
        <div style={styles.loading}>Cargando lecciones aprendidas...</div>
      ) : filteredLessons.length === 0 ? (
        <div style={styles.emptyState}>
          {filterText || filterSeverity !== 'all'
            ? 'No se encontraron lecciones aprendidas con los filtros aplicados'
            : 'No hay lecciones aprendidas registradas en el sistema'}
        </div>
      ) : (
        filteredLessons.map((lesson) => (
          <div
            key={lesson.id}
            style={styles.lessonCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
            }}
            onClick={() => {
              window.location.href = `/8d-workflow?reportId=${lesson.reportId}&mode=view`;
            }}
          >
            <div style={styles.lessonHeader}>
              <div style={styles.reportInfo}>
                <div style={styles.reportId}> {lesson.reportId}</div>
                <div style={styles.reportTitle}>{lesson.reportTitle}</div>

                <div style={styles.metaInfo}>
                  <div style={styles.metaItem}>
                    <span></span>
                    <span>{Math.floor(lesson.daysSinceIssue)} días</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span></span>
                    <span>{new Date(lesson.issueDate).toLocaleDateString('es-ES')}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span></span>
                    <span>{lesson.clientName || 'N/A'}</span>
                  </div>
                  {lesson.partNumber && (
                    <div style={styles.metaItem}>
                      <span></span>
                      <span>{lesson.partNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                {getSeverityBadge(lesson.severity)}
              </div>
            </div>

            {/* Lesson Text */}
            <div style={styles.lessonText}>
               <strong>Lección Aprendida:</strong><br />
              {lesson.lessonText}
            </div>

            {/* Footer */}
            <div style={{
              marginTop: '12px',
              fontSize: '12px',
              color: t.textMuted,
              borderTop: `1px solid ${t.border}`,
              paddingTop: '12px'
            }}>
              Agregada el {new Date(lesson.createdAt).toLocaleDateString('es-ES')}
              {lesson.createdByName && ` por ${lesson.createdByName}`}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default LessonsLearned;
