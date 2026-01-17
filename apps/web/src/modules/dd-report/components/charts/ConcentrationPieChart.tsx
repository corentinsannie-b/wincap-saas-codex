/**
 * Concentration Pie Chart Component
 * ==================================
 * Used for client/supplier concentration analysis
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PIE_CHART_COLORS } from '../../config/colors';

const COLOR_PALETTE = [
  ...PIE_CHART_COLORS,
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#6B7280', // Gray for "Others"
];

export interface PieDataItem {
  label: string;
  value: number;
  percent?: number;
}

interface ConcentrationPieChartProps {
  data: PieDataItem[];
  title?: string;
  height?: number;
  maxSlices?: number;
  formatValue?: (value: number) => string;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

export function ConcentrationPieChart({
  data,
  title,
  height = 350,
  maxSlices = 10,
  formatValue = (v) => `${(v / 1000).toFixed(0)}k€`,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 100,
}: ConcentrationPieChartProps) {
  // Sort by value and group small items into "Autres"
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const total = sortedData.reduce((sum, item) => sum + item.value, 0);

  let processedData: PieDataItem[];

  if (sortedData.length > maxSlices) {
    const topItems = sortedData.slice(0, maxSlices - 1);
    const othersValue = sortedData.slice(maxSlices - 1).reduce((sum, item) => sum + item.value, 0);

    processedData = [
      ...topItems.map(item => ({
        ...item,
        percent: total > 0 ? (item.value / total) * 100 : 0,
      })),
      {
        label: 'Autres',
        value: othersValue,
        percent: total > 0 ? (othersValue / total) * 100 : 0,
      },
    ];
  } else {
    processedData = sortedData.map(item => ({
      ...item,
      percent: total > 0 ? (item.value / total) * 100 : 0,
    }));
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: PieDataItem }[] }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{item.label}</p>
          <p className="text-sm text-gray-600">{formatValue(item.value)}</p>
          <p className="text-sm text-gray-600">{item.percent?.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius: ir,
    outerRadius: or,
    percent,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    const radius = ir + (or - ir) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show labels for small slices

    return (
      <text
        x={x}
        y={y}
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={11}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            dataKey="value"
            nameKey="label"
          >
            {processedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(value: string, entry: { payload?: PieDataItem }) => {
                const item = entry.payload;
                if (!item) return value;
                return `${value} (${item.percent?.toFixed(1)}%)`;
              }}
              wrapperStyle={{
                fontSize: 11,
                paddingLeft: 20,
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ConcentrationPieChart;
