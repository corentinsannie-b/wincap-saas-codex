/**
 * Waterfall Chart Component
 * =========================
 * Used for EBITDA bridges and variance analysis
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { CHART_COLORS } from '../../config/colors';

const COLORS = CHART_COLORS;

export interface WaterfallItem {
  label: string;
  value: number;
  type: 'start' | 'positive' | 'negative' | 'subtotal' | 'end';
}

interface WaterfallChartProps {
  data: WaterfallItem[];
  title?: string;
  height?: number;
  formatValue?: (value: number) => string;
  showValues?: boolean;
}

interface ProcessedDataItem {
  name: string;
  value: number;
  displayValue: number;
  start: number;
  end: number;
  type: WaterfallItem['type'];
  color: string;
}

export function WaterfallChart({
  data,
  title,
  height = 400,
  formatValue = (v) => `${(v / 1000).toFixed(0)}k€`,
  showValues = true,
}: WaterfallChartProps) {
  const processedData = useMemo(() => {
    const result: ProcessedDataItem[] = [];
    let runningTotal = 0;

    for (const item of data) {
      let start: number;
      let end: number;
      let color: string;

      switch (item.type) {
        case 'start':
          start = 0;
          end = item.value;
          runningTotal = item.value;
          color = COLORS.secondary;
          break;
        case 'positive':
          start = runningTotal;
          end = runningTotal + item.value;
          runningTotal = end;
          color = COLORS.positive;
          break;
        case 'negative':
          start = runningTotal + item.value;
          end = runningTotal;
          runningTotal = start;
          color = COLORS.negative;
          break;
        case 'subtotal':
          start = 0;
          end = item.value;
          runningTotal = item.value;
          color = COLORS.neutral;
          break;
        case 'end':
          start = 0;
          end = item.value;
          color = COLORS.primary;
          break;
        default:
          start = runningTotal;
          end = runningTotal + item.value;
          runningTotal = end;
          color = COLORS.neutral;
      }

      result.push({
        name: item.label,
        value: Math.abs(end - start),
        displayValue: item.value,
        start: Math.min(start, end),
        end: Math.max(start, end),
        type: item.type,
        color,
      });
    }

    return result;
  }, [data]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ProcessedDataItem }[] }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{item.name}</p>
          <p className="text-sm" style={{ color: item.color }}>
            {item.type === 'positive' ? '+' : item.type === 'negative' ? '' : ''}
            {formatValue(item.displayValue)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomBarLabel = (props: { x?: number; y?: number; width?: number; height?: number; value?: number; index?: number }) => {
    const { x = 0, y = 0, width = 0, value = 0, index = 0 } = props;
    const item = processedData[index];

    if (!showValues || !item) return null;

    const displayText = item.type === 'positive' ? `+${formatValue(item.displayValue)}` :
                        item.type === 'negative' ? formatValue(item.displayValue) :
                        formatValue(item.displayValue);

    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill={item.color}
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
      >
        {displayText}
      </text>
    );
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={processedData}
          margin={{ top: 30, right: 20, left: 20, bottom: 60 }}
        >
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#374151' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#E5E7EB" />

          {/* Invisible bar for positioning */}
          <Bar dataKey="start" stackId="stack" fill="transparent" />

          {/* Visible bar */}
          <Bar
            dataKey="value"
            stackId="stack"
            radius={[4, 4, 0, 0]}
            label={renderCustomBarLabel}
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WaterfallChart;
