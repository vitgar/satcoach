import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { GraphData, GraphAngleLabel, GraphSideLabel } from '../types';
import {
  computePolygonCentroid,
  computeRelativeAngleLabelPosition,
  computeSideLabelPosition,
  polygonSizeScale,
} from '../utils/geometryUtils';

interface GraphRendererProps {
  graphData: GraphData;
  className?: string;
}

type ResolvedAngleLabel = GraphAngleLabel & { x: number; y: number };
type ResolvedSideLabel = GraphSideLabel & { x: number; y: number };

// Color palette for charts
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

// Custom tooltip for better display
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
        {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const GraphRenderer: React.FC<GraphRendererProps> = ({ graphData, className = '' }) => {
  const { type, data, config = {} } = graphData;

  // Default configuration
  const {
    title,
    xLabel = '',
    yLabel = '',
    xDomain,
    yDomain,
    showGrid = true,
    showLegend = false,
    dataKeys = [],
  } = config;

  // Common chart props
  const commonMargin = { top: 20, right: 30, left: 20, bottom: 20 };

  const requiresData = type !== 'fraction-rectangle' && type !== 'polygon';

  // Error boundary for malformed data
  if (requiresData && (!data || data.length === 0)) {
    return (
      <div className={`graph-container p-6 text-center ${className}`}>
        <p className="text-gray-500">No graph data available</p>
      </div>
    );
  }

  const chartData = data ?? [];

  const renderChart = () => {
    try {
      switch (type) {
        case 'line': {
          // Line chart for functions and trends
          const baseKeys = chartData[0] ? Object.keys(chartData[0]) : [];
          const keys = dataKeys.length > 0 ? dataKeys : baseKeys.filter(k => k !== 'x' && k !== 'name');
          
          return (
            <LineChart data={chartData} margin={commonMargin}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
              <XAxis
                dataKey="x"
                label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
                domain={xDomain}
                type="number"
                stroke="#666"
              />
              <YAxis
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined}
                domain={yDomain}
                stroke="#666"
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {keys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          );
        }

        case 'bar': {
          // Bar chart for categorical data
          const keys = dataKeys.length > 0 ? dataKeys : Object.keys(chartData[0]).filter(k => k !== 'category' && k !== 'name');
          
          return (
            <BarChart data={chartData} margin={commonMargin}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
              <XAxis
                dataKey="category"
                label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
                stroke="#666"
              />
              <YAxis
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined}
                domain={yDomain}
                stroke="#666"
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {keys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[index % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          );
        }

        case 'scatter': {
          // Scatter plot for correlation and relationships
          return (
            <ScatterChart margin={commonMargin}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
              <XAxis
                type="number"
                dataKey="x"
                label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
                domain={xDomain}
                stroke="#666"
              />
              <YAxis
                type="number"
                dataKey="y"
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined}
                domain={yDomain}
                stroke="#666"
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              {showLegend && <Legend />}
            <Scatter
                name="Data Points"
                data={chartData}
                fill={COLORS[0]}
              />
            </ScatterChart>
          );
        }

        case 'area': {
          // Area chart for cumulative data
          const keys = dataKeys.length > 0 ? dataKeys : Object.keys(chartData[0]).filter(k => k !== 'x' && k !== 'name');
          
          return (
            <AreaChart data={chartData} margin={commonMargin}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
              <XAxis
                dataKey="x"
                label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5 } : undefined}
                domain={xDomain}
                stroke="#666"
              />
              <YAxis
                label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined}
                domain={yDomain}
                stroke="#666"
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {keys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          );
        }

        case 'pie': {
          // Pie chart for proportions
          return (
            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
            </PieChart>
          );
        }

        case 'fraction-rectangle': {
          const rectangleConfig = config.rectangleConfig || {
            rows: 1,
            cols: 1,
            shadedCells: [],
          };
          const {
            rows,
            cols,
            shadedCells,
            shadedColor = '#c7d2fe',
            emptyColor = '#fff',
            outlineColor = '#94a3b8',
            caption,
          } = rectangleConfig;
          const totalCells = Math.max(rows * cols, 1);
          const shadedSet = new Set(shadedCells);

          return (
            <div className="space-y-4">
              <div
                className="fraction-rectangle-grid"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                  borderColor: outlineColor,
                }}
              >
                {Array.from({ length: totalCells }).map((_, index) => {
                  const isShaded = shadedSet.has(index);
                  return (
                    <div
                      key={index}
                      className="fraction-rectangle-cell"
                      style={{
                        backgroundColor: isShaded ? shadedColor : emptyColor,
                        borderColor: outlineColor,
                      }}
                    />
                  );
                })}
              </div>
              {caption && <p className="text-center text-sm text-gray-600">{caption}</p>}
            </div>
          );
        }

        case 'polygon': {
          const polygonConfig = config.polygonConfig;
          if (!polygonConfig || !polygonConfig.points || polygonConfig.points.length < 3) {
            return (
              <div className="p-6 text-center">
                <p className="text-gray-500">Invalid polygon data.</p>
              </div>
            );
          }

          const {
            points,
            extraLines = [],
            angleLabels: rawAngleLabels = [],
            sideLabels: rawSideLabels = [],
            pointLabelOffset,
            strokeColor = '#1d4ed8',
            fillColor = '#dbeafe',
            height: svgHeight = 320,
          } = polygonConfig;

          const viewBox = '0 0 100 100';
          const pointPath = points.map((pt) => `${pt.x},${pt.y}`).join(' ');
          const resolvedHeight = Math.min(svgHeight, 400);
          const polygonScale = polygonSizeScale(points);
          const centroid = computePolygonCentroid(points);

          const resolvedAngleLabels: ResolvedAngleLabel[] = rawAngleLabels
            .map((label) => {
              if (label.atVertex) {
                const computed = computeRelativeAngleLabelPosition(label, points, polygonScale);
                if (computed?.x !== undefined && computed?.y !== undefined) {
                  return computed;
                }
              }

              if (label.x === undefined || label.y === undefined) {
                return null;
              }

              return {
                ...label,
                x: label.x + (label.offset?.x ?? 0),
                y: label.y + (label.offset?.y ?? 0),
              };
            })
            .filter((label): label is ResolvedAngleLabel => Boolean(label));

          const resolvedSideLabels: ResolvedSideLabel[] = rawSideLabels
            .map((label) => {
              if (label.onSide) {
                const computed = computeSideLabelPosition(label, points, centroid, polygonScale);
                if (computed?.x !== undefined && computed?.y !== undefined) {
                  return computed;
                }
              }

              if (label.x === undefined || label.y === undefined) {
                return null;
              }

              return {
                ...label,
                x: label.x + (label.offset?.x ?? 0),
                y: label.y + (label.offset?.y ?? 0),
              };
            })
            .filter((label): label is ResolvedSideLabel => Boolean(label));

          return (
            <svg
              viewBox={viewBox}
              preserveAspectRatio="xMidYMid meet"
              className="w-full max-w-[420px]"
              style={{ height: `${resolvedHeight}px`, display: 'block' }}
            >
              <polygon
                points={pointPath}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={2}
                opacity={0.35}
              />
              <polyline
                points={pointPath}
                fill="none"
                stroke={strokeColor}
                strokeWidth={2.5}
              />
              <line
                x1={points[points.length - 1].x}
                y1={points[points.length - 1].y}
                x2={points[0].x}
                y2={points[0].y}
                stroke={strokeColor}
                strokeWidth={2.5}
              />

              {extraLines.map((line, index) => {
                const fromPoint = points[line.from];
                const toPoint = points[line.to];
                if (!fromPoint || !toPoint) return null;
                return (
                  <line
                    key={`extra-line-${index}`}
                    x1={fromPoint.x}
                    y1={fromPoint.y}
                    x2={toPoint.x}
                    y2={toPoint.y}
                    stroke={strokeColor}
                    strokeWidth={1.8}
                    strokeDasharray={line.dashed ? '4 4' : undefined}
                  />
                );
              })}

              {points.map((point, index) => (
                <g key={`point-${index}`}>
                  <circle cx={point.x} cy={point.y} r={2.2} fill={strokeColor} />
                  {point.label && (
                    <text
                      x={point.x + (point.labelOffset?.x ?? (pointLabelOffset?.x ?? 2))}
                      y={point.y + (point.labelOffset?.y ?? (pointLabelOffset?.y ?? -2))}
                      fontSize={4.5}
                      fill="#0f172a"
                      fontWeight={600}
                    >
                      {point.label}
                    </text>
                  )}
                </g>
              ))}

              {resolvedAngleLabels.map((label, index) => (
                <text
                  key={`angle-${index}`}
                  x={label.x}
                  y={label.y}
                  fontSize={4.5}
                  fill="#111827"
                  textAnchor={label.align ?? 'middle'}
                  fontWeight={600}
                >
                  {label.text}
                </text>
              ))}

              {resolvedSideLabels.map((label, index) => (
                <text
                  key={`side-${index}`}
                  x={label.x}
                  y={label.y}
                  fontSize={3.8}
                  fill="#374151"
                  textAnchor={label.align ?? 'middle'}
                >
                  {label.text}
                </text>
              ))}
            </svg>
          );
        }

        default:
          return (
            <div className="p-6 text-center">
              <p className="text-gray-500">Unsupported graph type: {type}</p>
            </div>
          );
      }
    } catch (error) {
      console.error('Error rendering graph:', error);
      return (
        <div className="p-6 text-center">
          <p className="text-red-500">Error rendering graph. Please check the data format.</p>
        </div>
      );
    }
  };

  const isCustomVisual = type === 'fraction-rectangle' || type === 'polygon';

  return (
    <div className={`graph-container bg-white border border-gray-200 rounded-lg p-4 my-4 ${className}`}>
      {title && (
        <h3 className="text-center text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      {isCustomVisual ? (
        <div className="flex justify-center">{renderChart()}</div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          {renderChart()}
        </ResponsiveContainer>
      )}
    </div>
  );
};

