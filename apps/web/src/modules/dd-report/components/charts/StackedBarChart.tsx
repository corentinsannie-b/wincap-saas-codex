/**
 * Stacked Bar Chart Component
 * ===========================
 * Used for revenue mix, geographic distribution
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { PIE_CHART_COLORS } from '../../config/colors';

const COLOR_PALETTE = [
  ...PIE_CHART_COLORS,
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

export interface StackedDataPoint {
  label: string;
  segments: { label: string; value: number }[];
}

interface StackedBarChartProps {
  data: StackedDataPoint[];
  title?: string;
  height?: number;
  formatValue?: (value: number) => string;
  showLegend?: boolean;
  horizontal?: boolean;
}

export function StackedBarChart({
  data,
  title,
  height = 350,
  formatValue = (v) => `${(v / 1000).toFixed(0)}k€`,
  showLegend = true,
  horizontal = false,
}: StackedBarChartProps) {
  // Get all unique segment labels
  const segmentLabels = [...new Set(data.flatMap(d => d.segments.map(s => s.label)))];

  // Transform data for recharts
  const processedData = data.map(item => {
    const result: Record<string, string | number> = { name: item.label };
    for (const segment of item.segments) {
      result[segment.label] = segment.value;
    }
    return result;
  });

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm flex justify-between gap-4" style={{ color: entry.color }}>
              <span>{entry.dataKey}:</span>
              <span className="font-medium">{formatValue(entry.value)}</span>
            </p>
          ))}
          <p className="text-sm font-semibold text-gray-700 mt-2 pt-2 border-t">
            Total: {formatValue(total)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={processedData}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 20, right: 30, left: horizontal ? 100 : 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#374151' }}
                width={90}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
            </>
          )}
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ paddingBottom: 10 }}
            />
          )}
          {segmentLabels.map((label, index) => (
            <Bar
              key={label}
              dataKey={label}
              stackId="stack"
              fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
              radius={index === segmentLabels.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default StackedBarChart;
