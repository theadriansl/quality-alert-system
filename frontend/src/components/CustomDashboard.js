/**
 * CustomDashboard — dashboard personalizado reutilizable con Drag & Drop.
 * Props:
 *   storageKey     — clave única en localStorage
 *   catalog        — array de { id, label, icon, cat, size:'sm'|'md'|'lg' }
 *   defaultWidgets — array de ids seleccionados por defecto
 *   renderWidget   — (id, data) => ReactNode
 *   data           — objeto de datos pasado a renderWidget
 */
import React, { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, useSortable,
  rectSortingStrategy, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const BLUE = '#0072CE';
const RED  = '#ef4444';

// sm=1col, md=2col, lg=2col (backward compat), xl=4col
const SIZE_COLS = { sm: 1, md: 2, lg: 2, xl: 4 };
const WIDGET_SIZES = [
  { key: 'sm', label: 'Pequeño',      cols: 1, desc: '1/4 pantalla' },
  { key: 'md', label: 'Mediano',      cols: 2, desc: '2/4 pantalla' },
  { key: 'lg', label: 'Medio grande', cols: 2, desc: '2/4 pantalla' },
  { key: 'xl', label: 'Grande',       cols: 4, desc: 'Pantalla completa' },
];

const migrate = (raw, catalog) => {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const catalogIds = new Set(catalog.map(c => c.id));
  if (typeof raw[0] === 'string') {
    return raw.filter(id => catalogIds.has(id)).map(id => ({ id, size: catalog.find(c => c.id === id)?.size || 'sm' }));
  }
  // Filter out widgets that no longer exist in catalog
  return raw.filter(item => catalogIds.has(item.id));
};

// ─── Sortable wrapper ─────────────────────────────────────────────────────────
const SortableWidget = ({ item, catalog, renderWidget, data, editMode, onRemove }) => {
  const { theme: t } = useTheme();
  const meta  = catalog.find(w => w.id === item.id);
  const isKpi = item.size === 'sm';
  const cols  = SIZE_COLS[item.size] || 1;

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    gridColumn: `span ${cols}`,
    backgroundColor: t.bgCard,
    border: `1px solid ${isDragging ? BLUE : t.border}`,
    borderRadius: '8px',
    padding: isKpi ? '0' : '14px',
    position: 'relative',
    minHeight: isKpi ? 'auto' : '120px',
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    boxShadow: isDragging ? `0 8px 24px ${BLUE}33` : 'none',
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div ref={setActivatorNodeRef} {...listeners} {...attributes}
        title="Arrastrar para mover"
        style={{ position: 'absolute', top: isKpi ? '50%' : '8px', left: '6px', transform: isKpi ? 'translateY(-50%)' : 'none', zIndex: 5, cursor: 'grab', color: editMode ? BLUE : t.border, fontSize: '14px', padding: '2px', borderRadius: '3px', userSelect: 'none', opacity: editMode ? 1 : 0.3, transition: 'color 0.15s, opacity 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.color = BLUE; e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.color = editMode ? BLUE : t.border; e.currentTarget.style.opacity = editMode ? '1' : '0.3'; }}
      >⠿</div>
      {editMode && (
        <button onClick={() => onRemove(item.id)}
          style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 5, width: '18px', height: '18px', borderRadius: '50%', backgroundColor: RED, border: 'none', color: 'white', fontSize: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>
      )}
      <div style={{ paddingLeft: isKpi ? '20px' : '0' }}>
        {renderWidget(item.id, data)}
      </div>
    </div>
  );
};

// ─── Ghost overlay ────────────────────────────────────────────────────────────
const DragGhost = ({ id, catalog }) => {
  const { theme: t } = useTheme();
  const meta = catalog.find(w => w.id === id);
  return (
    <div style={{ backgroundColor: t.bgCard, border: `2px solid ${BLUE}`, borderRadius: '8px', padding: '12px 16px', boxShadow: `0 16px 40px ${BLUE}44`, opacity: 0.95, minWidth: '200px', transform: 'rotate(2deg)' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: BLUE, marginBottom: '4px' }}>{meta?.icon} {meta?.label}</div>
      <div style={{ fontSize: '10px', color: t.textMuted }}>Arrastrando…</div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const CustomDashboard = ({ storageKey, catalog, defaultWidgets, renderWidget, data }) => {
  const { theme: t } = useTheme();
  const { t: tr, language, changeLanguage } = useLanguage();

  const [selected, setSelected] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? migrate(JSON.parse(raw), catalog) : defaultWidgets.map(id => ({ id, size: catalog.find(c => c.id === id)?.size || 'sm' }));
    } catch { return defaultWidgets.map(id => ({ id, size: catalog.find(c => c.id === id)?.size || 'sm' })); }
  });

  const [editMode,      setEditMode]      = useState(false);
  const [activeId,      setActiveId]      = useState(null);
  const [showModal,     setShowModal]     = useState(false);
  const [pendingWidget, setPendingWidget] = useState(null);

  const save = (next) => { setSelected(next); localStorage.setItem(storageKey, JSON.stringify(next)); };
  const reset    = () => save(defaultWidgets.map(id => ({ id, size: catalog.find(c => c.id === id)?.size || 'sm' })));
  const clearAll = () => save([]);
  const remove   = (id) => { save(selected.filter(s => s.id !== id)); };

  const toggleWidget = (catalogItem) => {
    if (selected.some(s => s.id === catalogItem.id)) {
      save(selected.filter(s => s.id !== catalogItem.id));
    } else {
      setPendingWidget(catalogItem);
    }
  };

  const addWithSize = (size) => {
    if (!pendingWidget) return;
    save([...selected, { id: pendingWidget.id, size }]);
    setPendingWidget(null);
  };

  const closeModal = () => { setShowModal(false); setPendingWidget(null); };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragStart = ({ active }) => setActiveId(active.id);
  const handleDragEnd   = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oi = selected.findIndex(s => s.id === active.id);
    const ni = selected.findIndex(s => s.id === over.id);
    if (oi === -1 || ni === -1) return;
    save(arrayMove(selected, oi, ni));
  };

  const cats = [...new Set(catalog.map(w => w.cat))];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '10px 16px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: t.text }}>⚙️ Mi Dashboard personalizado</span>
          <span style={{ fontSize: '11px', color: t.textMuted }}>
            {selected.length} widget{selected.length !== 1 ? 's' : ''}
            {!editMode && selected.length > 0 && <span style={{ marginLeft: '6px', color: t.border }}>· arrastra ⠿ para reordenar</span>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {editMode && <>
            <button onClick={() => setShowModal(true)} style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '5px', border: `1px solid ${BLUE}`, backgroundColor: BLUE + '12', color: BLUE, cursor: 'pointer', fontWeight: '600' }}>＋ Widgets</button>
            <button onClick={reset}    style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '5px', border: `1px solid ${t.border}`, backgroundColor: t.bgPanel, color: t.textMuted, cursor: 'pointer' }}>Restablecer</button>
            <button onClick={clearAll} style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '5px', border: `1px solid ${RED}44`, backgroundColor: RED + '12', color: RED, cursor: 'pointer' }}>Limpiar</button>
          </>}
          <button onClick={() => setEditMode(e => !e)}
            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer', border: editMode ? `2px solid ${BLUE}` : `1px solid ${t.border}`, backgroundColor: editMode ? BLUE + '18' : t.bgPanel, color: editMode ? BLUE : t.text }}
          >{editMode ? '✓ Listo' : '✏️ Personalizar'}</button>
        </div>
      </div>

      {/* Grid */}
      {selected.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>Tu dashboard está vacío</div>
          <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '6px' }}>Haz clic en <strong>✏️ Personalizar</strong> para agregar widgets</div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={selected.map(s => s.id)} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', alignItems: 'start' }}>
              {selected.map(item => (
                <SortableWidget key={item.id} item={item} catalog={catalog} renderWidget={renderWidget} data={data} editMode={editMode} onRemove={remove} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeId ? <DragGhost id={activeId} catalog={catalog} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeModal}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '600px', width: '92%', maxHeight: '82vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: t.text }}>
                  {pendingWidget ? `Tamaño — ${pendingWidget.label}` : 'Widgets del Dashboard'}
                </h2>
                {pendingWidget && (
                  <button onClick={() => setPendingWidget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: BLUE, fontSize: '12px', padding: 0, marginTop: '4px' }}>← Volver al catálogo</button>
                )}
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: '20px', lineHeight: 1 }}>✕</button>
            </div>

            {/* Paso 1: catálogo multi-select */}
            {!pendingWidget && (
              <>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: t.textMuted }}>
                  {selected.length} activo{selected.length !== 1 ? 's' : ''} — click en activo para quitar, en inactivo para agregar con tamaño
                </p>
                {cats.map(cat => (
                  <div key={cat} style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', paddingBottom: '4px', borderBottom: `1px solid ${t.border}` }}>{cat}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {catalog.filter(w => w.cat === cat).map(item => {
                        const active = selected.some(s => s.id === item.id);
                        return (
                          <button key={item.id} onClick={() => toggleWidget(item)}
                            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', borderRadius: '8px', border: `2px solid ${active ? BLUE : t.border}`, backgroundColor: active ? BLUE + '18' : t.bgPanel, color: active ? BLUE : t.text, cursor: 'pointer', fontSize: '12px', fontWeight: active ? '700' : '500', transition: 'all 0.15s' }}>
                            <span style={{ fontSize: '14px' }}>{item.icon}</span>
                            <span>{item.label}</span>
                            {active && <span style={{ fontSize: '11px', fontWeight: '900' }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Paso 2: selector de tamaño */}
            {pendingWidget && (
              <div>
                <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '20px' }}>Selecciona qué espacio ocupará en el grid (4 columnas total):</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {WIDGET_SIZES.map(sz => {
                    const isRecommended = sz.key === (pendingWidget.size || 'sm');
                    return (
                      <button key={sz.key} onClick={() => addWithSize(sz.key)}
                        style={{ padding: '18px 16px', borderRadius: '10px', border: `2px solid ${isRecommended ? BLUE : t.border}`, backgroundColor: isRecommended ? BLUE + '15' : t.bgPanel, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.backgroundColor = BLUE + '15'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = isRecommended ? BLUE : t.border; e.currentTarget.style.backgroundColor = isRecommended ? BLUE + '15' : t.bgPanel; }}>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ height: '10px', flex: 1, borderRadius: '3px', backgroundColor: i <= sz.cols ? BLUE : t.border }} />
                          ))}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: t.text }}>{sz.label}</div>
                        <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>{sz.desc}</div>
                        {isRecommended && <div style={{ fontSize: '10px', color: BLUE, fontWeight: '600', marginTop: '4px' }}>Recomendado</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDashboard;
