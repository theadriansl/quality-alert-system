import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * ProcessFlowBuilder V3 - Grid 2D con descripciones inline
 * Descripciones visibles siempre en las celdas
 * Permite agregar notas/comentarios en celdas vacías
 */
const ProcessFlowBuilder = ({ initialFlow = [], onChange }) => {
  const { theme: t } = useTheme();
  const INITIAL_ROWS = 4;
  const GRID_COLS = 8;
  const CELL_SIZE = 120; // Más grande para acomodar texto

  const [gridRows, setGridRows] = useState(() => {
    // Determinar número de filas necesarias basado en datos previos
    if (initialFlow && initialFlow.length > 0 && Array.isArray(initialFlow)) {
      const maxRow = Math.max(...initialFlow.map(cell => cell.row || 0));
      return Math.max(INITIAL_ROWS, maxRow + 1);
    }
    return INITIAL_ROWS;
  });

  const [grid, setGrid] = useState(() => {
    // Inicializar grid vacío
    const emptyGrid = [];
    for (let row = 0; row < gridRows; row++) {
      emptyGrid[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        emptyGrid[row][col] = null;
      }
    }

    // Si hay datos previos, reconstruir el grid desde el array plano
    if (initialFlow && initialFlow.length > 0 && Array.isArray(initialFlow)) {
      initialFlow.forEach(cell => {
        if (cell && typeof cell === 'object' && cell.row !== undefined && cell.col !== undefined) {
          if (cell.row < gridRows && cell.col < GRID_COLS) {
            emptyGrid[cell.row][cell.col] = cell;
          }
        }
      });
    }

    return emptyGrid;
  });

  const [draggedSymbol, setDraggedSymbol] = useState(null);
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectionStart, setConnectionStart] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  // Símbolos de flujo de proceso ANSI estándar industriales
  const processSymbols = [
    { id: 'operation', name: '○', label: 'Operación', color: '#4CAF50', shape: 'circle' },
    { id: 'transport', name: '⇨', label: 'Transporte', color: '#2196F3', shape: 'arrow' },
    { id: 'storage', name: '▽', label: 'Almacén', color: '#FF9800', shape: 'triangle' },
    { id: 'inspection', name: '□', label: 'Inspección', color: '#9C27B0', shape: 'square' },
    { id: 'decision', name: '◇', label: 'Decisión', color: '#F44336', shape: 'diamond' },
    { id: 'arrow_up', name: '↑', label: 'Flecha ↑', color: '#607D8B', shape: 'arrow' },
    { id: 'arrow_down', name: '↓', label: 'Flecha ↓', color: '#607D8B', shape: 'arrow' },
    { id: 'arrow_left', name: '←', label: 'Flecha ←', color: '#607D8B', shape: 'arrow' },
    { id: 'arrow_right', name: '→', label: 'Flecha →', color: '#607D8B', shape: 'arrow' }
  ];

  // Convertir grid 2D a array plano para serialización
  const serializeGrid = (gridData) => {
    const serialized = [];
    gridData.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        if (cell) {
          serialized.push(cell);
        }
      });
    });
    return serialized;
  };

  // Colocar símbolo en una celda
  const handleCellDrop = (row, col) => {
    if (!draggedSymbol) return;

    // No sobrescribir si ya hay algo
    if (grid[row][col]) return;

    const symbol = processSymbols.find(s => s.id === draggedSymbol);
    const newGrid = grid.map(r => [...r]);

    newGrid[row][col] = {
      id: Date.now(),
      type: 'symbol',
      symbolId: symbol.id,
      symbolName: symbol.name,
      color: symbol.color,
      shape: symbol.shape,
      description: '',
      isProblemPoint: false,
      connections: [],
      row,
      col
    };

    setGrid(newGrid);
    onChange?.(serializeGrid(newGrid));
    setDraggedSymbol(null);
  };

  // Actualizar descripción
  const updateDescription = (row, col, description) => {
    const newGrid = grid.map(r => [...r]);
    if (newGrid[row][col]) {
      newGrid[row][col].description = description;
    } else {
      // Crear nota de texto en celda vacía
      newGrid[row][col] = {
        id: Date.now(),
        type: 'note',
        description,
        row,
        col
      };
    }
    setGrid(newGrid);
    onChange?.(serializeGrid(newGrid));
  };

  // Eliminar celda
  const removeCell = (row, col, e) => {
    e.stopPropagation();
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = null;
    setGrid(newGrid);
    onChange?.(serializeGrid(newGrid));
  };

  // Marcar/desmarcar como punto de problema
  const toggleProblemPoint = (row, col, e) => {
    e.stopPropagation();
    const newGrid = grid.map(r => [...r]);
    if (newGrid[row][col] && newGrid[row][col].type === 'symbol') {
      newGrid[row][col].isProblemPoint = !newGrid[row][col].isProblemPoint;
    }
    setGrid(newGrid);
    onChange?.(serializeGrid(newGrid));
  };

  // Agregar conexión entre celdas
  const addConnection = (fromRow, fromCol, toRow, toCol, label = '') => {
    const newGrid = grid.map(r => [...r]);
    if (newGrid[fromRow][fromCol] && newGrid[fromRow][fromCol].type === 'symbol') {
      if (!newGrid[fromRow][fromCol].connections) {
        newGrid[fromRow][fromCol].connections = [];
      }
      newGrid[fromRow][fromCol].connections.push({
        targetRow: toRow,
        targetCol: toCol,
        label
      });
    }
    setGrid(newGrid);
    onChange?.(serializeGrid(newGrid));
  };

  // Iniciar modo de conexión
  const startConnection = (row, col, e) => {
    e.stopPropagation();
    const cell = grid[row][col];
    if (cell && cell.type === 'symbol') {
      setConnectionMode(true);
      setConnectionStart({ row, col });
    }
  };

  // Completar conexión
  const completeConnection = (row, col) => {
    if (connectionMode && connectionStart) {
      const cell = grid[connectionStart.row][connectionStart.col];

      // Si es una decisión, preguntar etiqueta
      let label = '';
      if (cell && cell.symbolId === 'decision') {
        label = prompt('Etiqueta (OK/NG):') || '';
      }

      addConnection(connectionStart.row, connectionStart.col, row, col, label);
      setConnectionMode(false);
      setConnectionStart(null);
    }
  };

  // Agregar nueva fila al grid
  const addRow = () => {
    const newGrid = [...grid];
    const newRow = [];
    for (let col = 0; col < GRID_COLS; col++) {
      newRow[col] = null;
    }
    newGrid.push(newRow);
    setGrid(newGrid);
    setGridRows(gridRows + 1);
  };

  // Quitar última fila del grid
  const removeRow = () => {
    if (gridRows <= INITIAL_ROWS) return; // No permitir menos de 4 filas

    // Verificar si la última fila tiene contenido
    const lastRow = grid[grid.length - 1];
    const hasContent = lastRow.some(cell => cell !== null);

    if (hasContent) {
      const confirm = window.confirm('La última fila tiene contenido. ¿Deseas eliminarla de todos modos?');
      if (!confirm) return;
    }

    const newGrid = grid.slice(0, -1);
    setGrid(newGrid);
    setGridRows(gridRows - 1);
    onChange?.(serializeGrid(newGrid));
  };

  // Renderizar conexiones (líneas SVG)
  const renderConnections = () => {
    const connections = [];

    grid.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        if (cell && cell.connections) {
          cell.connections.forEach((conn, connIdx) => {
            const x1 = colIdx * CELL_SIZE + CELL_SIZE / 2;
            const y1 = rowIdx * CELL_SIZE + 30; // Altura del símbolo
            const x2 = conn.targetCol * CELL_SIZE + CELL_SIZE / 2;
            const y2 = conn.targetRow * CELL_SIZE + 30;

            const isProblem = cell.isProblemPoint ||
              (grid[conn.targetRow][conn.targetCol] && grid[conn.targetRow][conn.targetCol].isProblemPoint);

            const color = isProblem ? '#d32f2f' : t.accent;

            connections.push(
              <g key={`${rowIdx}-${colIdx}-${connIdx}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                {conn.label && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 5}
                    fill={color}
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                    style={{ backgroundColor: 'white', padding: '2px' }}
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          });
        }
      });
    });

    return connections;
  };

  const styles = {
    container: {
      display: 'flex',
      gap: '10px',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: t.bg
    },
    sidebar: {
      width: '140px',
      backgroundColor: t.bgCard,
      borderRight: `1px solid ${t.border}`,
      padding: '10px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    sidebarTitle: {
      fontSize: '11px',
      fontWeight: 'bold',
      marginBottom: '8px',
      color: t.text,
      textAlign: 'center',
      borderBottom: `2px solid ${t.accent}`,
      paddingBottom: '5px'
    },
    symbolCard: {
      padding: '6px 8px',
      border: `2px solid ${t.border}`,
      borderRadius: '4px',
      cursor: 'grab',
      transition: 'all 0.2s',
      backgroundColor: t.bgCard,
      userSelect: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    symbolIcon: {
      fontSize: '20px',
      lineHeight: '1',
      minWidth: '20px',
      textAlign: 'center'
    },
    symbolLabel: {
      fontSize: '10px',
      fontWeight: '500',
      flex: 1,
      color: t.text
    },
    symbolCardDragging: {
      opacity: 0.5,
      cursor: 'grabbing'
    },
    canvas: {
      flex: 1,
      padding: '10px',
      overflowY: 'auto',
      overflowX: 'auto',
      position: 'relative'
    },
    gridContainer: {
      position: 'relative',
      display: 'inline-block',
      minWidth: `${GRID_COLS * CELL_SIZE}px`
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
      gap: '0',
      position: 'relative',
      zIndex: 2
    },
    cell: {
      width: `${CELL_SIZE}px`,
      height: `${CELL_SIZE}px`,
      border: `1px solid ${t.border}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      backgroundColor: t.bgCard,
      position: 'relative',
      padding: '4px',
      overflow: 'hidden'
    },
    cellHover: {
      backgroundColor: t.bgPanel,
      borderColor: t.accent
    },
    cellProblem: {
      backgroundColor: `${t.error}15`,
      borderColor: t.error,
      borderWidth: '2px',
      borderStyle: 'solid'
    },
    cellConnectionMode: {
      backgroundColor: `${t.warning}15`,
      borderColor: t.warning
    },
    cellSymbolIcon: {
      fontSize: '32px',
      lineHeight: '1',
      marginTop: '2px',
      marginBottom: '4px'
    },
    description: {
      width: '100%',
      fontSize: '9px',
      padding: '3px',
      border: `1px solid ${t.border}`,
      borderRadius: '2px',
      resize: 'none',
      fontFamily: 'inherit',
      minHeight: '40px',
      backgroundColor: t.bgCard,
      color: t.text
    },
    controls: {
      display: 'flex',
      gap: '2px',
      marginTop: '2px',
      width: '100%',
      justifyContent: 'center'
    },
    btn: {
      padding: '2px 4px',
      fontSize: '9px',
      border: 'none',
      borderRadius: '2px',
      cursor: 'pointer',
      backgroundColor: t.bgPanel,
      color: t.text
    },
    btnDanger: {
      backgroundColor: t.error,
      color: 'white'
    },
    btnSuccess: {
      backgroundColor: t.success,
      color: 'white'
    },
    btnPrimary: {
      backgroundColor: t.accent,
      color: 'white'
    },
    instructions: {
      padding: '8px',
      backgroundColor: `${t.warning}15`,
      borderRadius: '4px',
      fontSize: '9px',
      lineHeight: '1.3',
      marginTop: 'auto',
      border: `1px solid ${t.warning}`,
      color: t.text
    },
    addRowButton: {
      width: '100%',
      padding: '8px',
      backgroundColor: t.success,
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginBottom: '6px',
      transition: 'all 0.2s'
    },
    removeRowButton: {
      width: '100%',
      padding: '8px',
      backgroundColor: t.error,
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginBottom: '10px',
      transition: 'all 0.2s'
    },
    removeRowButtonDisabled: {
      backgroundColor: t.bgPanel,
      cursor: 'not-allowed',
      opacity: 0.6
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar con símbolos */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarTitle}>Símbolos ANSI</div>

        <button
          style={styles.addRowButton}
          onClick={addRow}
          title="Agregar fila al grid"
        >
          + Agregar Fila ({gridRows})
        </button>

        <button
          style={{
            ...styles.removeRowButton,
            ...(gridRows <= INITIAL_ROWS ? styles.removeRowButtonDisabled : {})
          }}
          onClick={removeRow}
          disabled={gridRows <= INITIAL_ROWS}
          title={gridRows <= INITIAL_ROWS ? 'Mínimo 4 filas' : 'Quitar última fila'}
        >
          - Quitar Fila
        </button>

        {processSymbols.map((symbol) => (
          <div
            key={symbol.id}
            draggable
            onDragStart={() => setDraggedSymbol(symbol.id)}
            onDragEnd={() => setDraggedSymbol(null)}
            style={{
              ...styles.symbolCard,
              ...(draggedSymbol === symbol.id ? styles.symbolCardDragging : {})
            }}
            title={symbol.label}
          >
            <span style={styles.symbolIcon}>{symbol.name}</span>
            <span style={styles.symbolLabel}>{symbol.label}</span>
          </div>
        ))}

        <div style={styles.instructions}>
          <b>Instrucciones:</b><br />
          1. Arrastra símbolos<br />
          2. Escribe descripciones<br />
          3. Conecta flujo<br />
          4. Marca problema
        </div>
      </div>

      {/* Grid canvas */}
      <div style={styles.canvas}>
        <div style={styles.gridContainer}>
          {/* SVG para conexiones */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill={t.accent} />
              </marker>
            </defs>
            {renderConnections()}
          </svg>

          {/* Grid de celdas */}
          <div style={styles.grid}>
            {grid.map((row, rowIdx) =>
              row.map((cell, colIdx) => {
                const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;
                const isConnection = connectionMode && connectionStart;

                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    style={{
                      ...styles.cell,
                      ...(isHovered ? styles.cellHover : {}),
                      ...(cell?.isProblemPoint ? styles.cellProblem : {}),
                      ...(isConnection ? styles.cellConnectionMode : {})
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleCellDrop(rowIdx, colIdx)}
                    onClick={() => {
                      if (connectionMode) {
                        completeConnection(rowIdx, colIdx);
                      }
                    }}
                    onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {/* Celda con símbolo */}
                    {cell?.type === 'symbol' && (
                      <>
                        <div style={styles.cellSymbolIcon}>
                          {cell.symbolName}
                        </div>
                        <textarea
                          style={styles.description}
                          value={cell.description}
                          onChange={(e) => updateDescription(rowIdx, colIdx, e.target.value)}
                          placeholder="Descripción..."
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div style={styles.controls}>
                          <button
                            style={{ ...styles.btn, ...styles.btnPrimary }}
                            onClick={(e) => startConnection(rowIdx, colIdx, e)}
                            title="Conectar"
                          >
                            
                          </button>
                          <button
                            style={{
                              ...styles.btn,
                              ...(cell.isProblemPoint ? styles.btnDanger : styles.btnSuccess)
                            }}
                            onClick={(e) => toggleProblemPoint(rowIdx, colIdx, e)}
                            title={cell.isProblemPoint ? 'Es problema' : 'Marcar problema'}
                          >
                            {cell.isProblemPoint ? '' : ''}
                          </button>
                          <button
                            style={styles.btn}
                            onClick={(e) => removeCell(rowIdx, colIdx, e)}
                            title="Eliminar"
                          >
                            
                          </button>
                        </div>
                      </>
                    )}

                    {/* Celda vacía o con nota */}
                    {(!cell || cell?.type === 'note') && (
                      <textarea
                        style={{ ...styles.description, minHeight: '100px', marginTop: '8px' }}
                        value={cell?.description || ''}
                        onChange={(e) => updateDescription(rowIdx, colIdx, e.target.value)}
                        placeholder="Nota/comentario..."
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}

                    {/* Botón eliminar para notas */}
                    {cell?.type === 'note' && (
                      <button
                        style={{ ...styles.btn, marginTop: '2px' }}
                        onClick={(e) => removeCell(rowIdx, colIdx, e)}
                      >
                         Borrar
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {connectionMode && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '12px 20px',
            backgroundColor: t.accent,
            color: 'white',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 1000
          }}>
             Modo conexión activo - Haz clic en celda destino
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessFlowBuilder;
