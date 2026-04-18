/**
 * CustomDashboard — componente reutilizable de dashboard personalizado con Drag & Drop.
 *
 * Props:
 *   storageKey    — clave única en localStorage para persistir selección y orden
 *   catalog       — array de { id, label, icon, cat, size:'sm'|'md'|'lg' }
 *   defaultWidgets — array de ids seleccionados por defecto
 *   renderWidget  — (id, data) => ReactNode
 *   data          — objeto de datos pasado a renderWidget
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

const BLUE = '#0072CE';
const RED  = '#ef4444';

const colSpan = (size) => size === 'lg' ? 'span 2' : 'span 1';

// ─── Sortable wrapper ─────────────────────────────────────────────────────────
const SortableWidget = ({ id, catalog, renderWidget, data, editMode, onRemove }) => {
  const { theme: t } = useTheme();
  const meta   = catalog.find(w => w.id === id);
  const isKpi  = meta?.size === 'sm';

  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id });

  const style = {
    gridColumn: isKpi ? 'span 1' : colSpan(meta?.size),
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
      {/* Drag handle */}
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        title="Arrastrar para mover"
        style={{
          position: 'absolute',
          top: isKpi ? '50%' : '8px',
          left: '6px',
          transform: isKpi ? 'translateY(-50%)' : 'none',
          zIndex: 5,
          cursor: 'grab',
          color: editMode ? BLUE : t.border,
          fontSize: '14px',
          padding: '2px',
          borderRadius: '3px',
          transition: 'color 0.15s, opacity 0.15s',
          userSelect: 'none',
          opacity: editMode ? 1 : 0.3,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = BLUE; e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => {
          e.currentTarget.style.color = editMode ? BLUE : t.border;
          e.currentTarget.style.opacity = editMode ? '1' : '0.3';
        }}
      >⠿</div>

      {/* Remove button */}
      {editMode && (
        <button
          onClick={() => onRemove(id)}
          title="Quitar widget"
          style={{
            position: 'absolute', top: '6px', right: '6px', zIndex: 5,
            width: '18px', height: '18px', borderRadius: '50%',
            backgroundColor: RED, border: 'none',
            color: 'white', fontSize: '10px', fontWeight: '900',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}
        >✕</button>
      )}

      {/* Widget content */}
      <div style={{ paddingLeft: isKpi ? '20px' : '0' }}>
        {renderWidget(id, data)}
      </div>
    </div>
  );
};

// ─── Ghost overlay ────────────────────────────────────────────────────────────
const DragGhost = ({ id, catalog }) => {
  const { theme: t } = useTheme();
  const meta = catalog.find(w => w.id === id);
  return (
    <div style={{
      backgroundColor: t.bgCard,
      border: `2px solid ${BLUE}`,
      borderRadius: '8px',
      padding: '12px 16px',
      boxShadow: `0 16px 40px ${BLUE}44`,
      opacity: 0.95,
      minWidth: '200px',
      transform: 'rotate(2deg)',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: BLUE, marginBottom: '4px' }}>
        {meta?.icon} {meta?.label}
      </div>
      <div style={{ fontSize: '10px', color: t.textMuted }}>Arrastrando…</div>
    </div>
  );
};

// ─── Main exported component ─────────────────────────────────────────────────
const CustomDashboard = ({ storageKey, catalog, defaultWidgets, renderWidget, data }) => {
  const { theme: t } = useTheme();

  const [selected, setSelected] = useState(() => {
    try {
      const s = localStorage.getItem(storageKey);
      return s ? JSON.parse(s) : defaultWidgets;
    } catch { return defaultWidgets; }
  });

  const [editMode, setEditMode]  = useState(false);
  const [activeId, setActiveId]  = useState(null);

  const save = (next) => {
    setSelected(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const toggle   = (id) => save(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const reset    = ()   => save(defaultWidgets);
  const clearAll = ()   => save([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = ({ active })      => setActiveId(active.id);
  const handleDragEnd   = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oi = selected.indexOf(active.id);
    const ni = selected.indexOf(over.id);
    if (oi === -1 || ni === -1) return;
    save(arrayMove(selected, oi, ni));
  };

  const cats = [...new Set(catalog.map(w => w.cat))];

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px', padding: '10px 16px',
        backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: t.text }}>
            ⚙️ Mi Dashboard personalizado
          </span>
          <span style={{ fontSize: '11px', color: t.textMuted }}>
            {selected.length} widget{selected.length !== 1 ? 's' : ''}
            {!editMode && selected.length > 0 &&
              <span style={{ marginLeft: '6px', color: t.border }}>· arrastra ⠿ para reordenar</span>
            }
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {editMode && <>
            <button onClick={reset} style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '5px', border: `1px solid ${t.border}`, backgroundColor: t.bgPanel, color: t.textMuted, cursor: 'pointer' }}>
              Restablecer
            </button>
            <button onClick={clearAll} style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '5px', border: `1px solid ${RED}44`, backgroundColor: RED + '12', color: RED, cursor: 'pointer' }}>
              Limpiar todo
            </button>
          </>}
          <button
            onClick={() => setEditMode(e => !e)}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer',
              border: editMode ? `2px solid ${BLUE}` : `1px solid ${t.border}`,
              backgroundColor: editMode ? BLUE + '18' : t.bgPanel,
              color: editMode ? BLUE : t.text,
            }}
          >{editMode ? '✓ Listo' : '✏️ Personalizar'}</button>
        </div>
      </div>

      {/* ── Picker (edit mode) ── */}
      {editMode && (
        <div style={{
          marginBottom: '20px', padding: '16px',
          backgroundColor: t.bgCard, border: `2px dashed ${BLUE}44`, borderRadius: '8px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: t.text, marginBottom: '12px' }}>
            Selecciona widgets — luego arrástralos para ordenarlos:
          </div>
          {cats.map(cat => (
            <div key={cat} style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{cat}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {catalog.filter(w => w.cat === cat).map(w => {
                  const active = selected.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => toggle(w.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '5px 12px', fontSize: '11px', fontWeight: active ? '700' : '400',
                        borderRadius: '20px', cursor: 'pointer',
                        border: active ? `2px solid ${BLUE}` : `1px solid ${t.border}`,
                        backgroundColor: active ? BLUE + '18' : t.bgPanel,
                        color: active ? BLUE : t.textMuted,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>{w.icon}</span>
                      <span>{w.label}</span>
                      {active && <span style={{ marginLeft: '2px', fontWeight: '900' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Grid con DnD ── */}
      {selected.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>Tu dashboard está vacío</div>
          <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '6px' }}>
            Haz clic en <strong>✏️ Personalizar</strong> y elige los widgets que quieres ver
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={selected} strategy={rectSortingStrategy}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '14px',
              alignItems: 'start',
            }}>
              {selected.map(id => (
                <SortableWidget
                  key={id}
                  id={id}
                  catalog={catalog}
                  renderWidget={renderWidget}
                  data={data}
                  editMode={editMode}
                  onRemove={toggle}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeId ? <DragGhost id={activeId} catalog={catalog} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};

export default CustomDashboard;
