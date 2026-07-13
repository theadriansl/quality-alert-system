import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';

// Colores para las graficas
const COLORS = {
  primary: '#0072CE',
  success: '#2E7D32',
  warning: '#C77700',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gray: '#6b7280'
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.purple,
  COLORS.pink,
  COLORS.gray
];

const STATUS_COLORS = {
  draft: '#6b7280',
  submitted: '#0072CE',
  approved: '#2E7D32',
  rejected: '#ef4444',
  closed: '#8b5cf6'
};

const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#C77700',
  medium: '#0072CE',
  low: '#2E7D32'
};

/**
 * Generic Chart Widget
 * Renders different chart types based on configuration
 */
const ChartWidget = ({
  type = 'line', // 'line' | 'bar' | 'pie' | 'donut' | 'horizontalBar'
  data = [],
  dataKey = 'value',
  nameKey = 'name',
  xAxisKey = 'month',
  lines = [], // For line charts: [{ key: 'created', color: '#0072CE', name: 'Creados' }]
  bars = [], // For bar charts: [{ key: 'count', color: '#0072CE', name: 'Cantidad' }]
  colorMap = null, // Custom color mapping for categories
  showLegend = true,
  showGrid = true,
  height = 250,
  valueSuffix = ''
}) => {
  const { theme: t } = useTheme();
  const { language } = useLanguage();

  const tr = {
    en: {
      unsupportedChartType: 'Unsupported chart type'
    },
    es: {
      unsupportedChartType: 'Tipo de gráfica no soportado'
    }
  }[language] || {};

  const getColor = (entry, index) => {
    // Check for status colors
    if (colorMap === 'status' && STATUS_COLORS[entry.name]) {
      return STATUS_COLORS[entry.name];
    }
    // Check for priority colors
    if (colorMap === 'priority' && PRIORITY_COLORS[entry.name]) {
      return PRIORITY_COLORS[entry.name];
    }
    // Default to chart colors
    return CHART_COLORS[index % CHART_COLORS.length];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: t.bgCard,
          padding: '12px',
          border: `1px solid ${t.border}`,
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          color: t.text
        }}>
          {label && <p style={{ margin: 0, fontWeight: '600', marginBottom: '4px' }}>{label}</p>}
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '2px 0', color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Line Chart
  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={t.border} />}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 12, fill: t.textMuted }}
            tickLine={false}
            axisLine={{ stroke: t.border }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: t.border }}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {lines.map((line, index) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color || CHART_COLORS[index]}
              name={line.name || line.key}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Bar Chart (Vertical)
  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={t.border} />}
          <XAxis
            dataKey={nameKey}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: t.border }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: t.border }}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {bars.length > 0 ? (
            bars.map((bar, index) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                fill={bar.color || CHART_COLORS[index]}
                name={bar.name || bar.key}
                radius={[4, 4, 0, 0]}
              />
            ))
          ) : (
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry, index)} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Horizontal Bar Chart — progress bar style
  if (type === 'horizontalBar') {
    const maxVal = Math.max(...data.map(d => Number(d[dataKey]) || 0), 1);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', padding: '0 2px' }}>
        {data.map((entry, index) => {
          const val = Number(entry[dataKey]) || 0;
          const pct = Math.round(val / maxVal * 100);
          const color = getColor(entry, index);
          const label = entry[nameKey] || '';
          return (
            <div key={index}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: t.text }}>{label}</span>
                <span style={{ fontWeight: '600', color }}>{val}{valueSuffix}</span>
              </div>
              <div style={{ height: '6px', backgroundColor: t.border, borderRadius: '3px' }}>
                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: color, borderRadius: '3px', transition: 'width 0.4s' }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Pie Chart
  if (type === 'pie' || type === 'donut') {
    const innerRadius = type === 'donut' ? '50%' : 0;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="38%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius="80%"
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry, index)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: '11px', lineHeight: '22px' }}
            formatter={(value) => value.length > 14 ? value.slice(0, 13) + '…' : value}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return <div>{tr.unsupportedChartType}: {type}</div>;
};

export default ChartWidget;
