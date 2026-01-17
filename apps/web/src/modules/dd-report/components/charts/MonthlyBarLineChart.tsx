/**
 * Monthly Bar + Line Combo Chart
 * ===============================
 * Used for monthly invoicing with LTM overlay
 */

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { WINCAP_GOLD, WINCAP_BLUE } from '../../config/colors';

const COLORS = {
  primary: WINCAP_GOLD,
  secondary: WINCAP_BLUE,
  tertiary: '#22C55E',
  grid: '#E5E7EB',
};

export interface MonthlyDataPoint {
  month: Date | string;
  barValue: number;
  lineValue?: number;
  barLabel?: string;
  lineLabel?: string;
}

interface MonthlyBarLineChartProps {
  data: MonthlyDataPoint[];
  title?: string;
  height?: number;
  barLabel?: string;
  lineLabel?: string;
  formatValue?: (value: number) => string;
  showLegend?: boolean;
}

export function MonthlyBarLineChart({
  data,
  title,
  height = 350,
  barLabel = 'Mensuel',
  lineLabel = 'LTM',
  formatValue = (v) => `${(v / 1000).toFixed(0)}k€`,
  showLegend = true,
}: MonthlyBarLineChartProps) {
  const processedData = data.map((item) => {
    const date = item.month instanceof Date ? item.month : new Date(item.month);
    return {
      ...item,
      name: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      sortKey: date.getTime(),
    };
  }).sort((a, b) => a.sortKey - b.sortKey);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'barValue' ? barLabel : lineLabel}: {formatValue(entry.value)}
            </p>
          ))}
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
        <ComposedChart
          data={processedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: COLORS.grid }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          {data.some(d => d.lineValue !== undefined) && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => value === 'barValue' ? barLabel : lineLabel}
            />
          )}
          <Bar
            yAxisId="left"
            dataKey="barValue"
            fill={COLORS.secondary}
            radius={[4, 4, 0, 0]}
            name={barLabel}
          />
          {data.some(d => d.lineValue !== undefined) && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="lineValue"
              stroke={COLORS.primary}
              strokeWidth={2}
              dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
              name={lineLabel}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MonthlyBarLineChart;
