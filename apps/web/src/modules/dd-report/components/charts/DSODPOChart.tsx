/**
 * DSO/DPO Min-Max-Avg Chart Component
 * ====================================
 * Used for working capital analysis
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
  dso: WINCAP_BLUE,
  dpo: WINCAP_GOLD,
  min: '#22C55E',
  max: '#EF4444',
  avg: '#8B5CF6',
  grid: '#E5E7EB',
};

export interface MinMaxAvgDataPoint {
  period: string;
  min: number;
  max: number;
  avg: number;
}

interface DSODPOChartProps {
  dsoData: MinMaxAvgDataPoint[];
  dpoData?: MinMaxAvgDataPoint[];
  title?: string;
  height?: number;
  showDPO?: boolean;
}

export function DSODPOChart({
  dsoData,
  dpoData,
  title,
  height = 350,
  showDPO = true,
}: DSODPOChartProps) {
  // Combine data for single chart
  const combinedData = dsoData.map((dso, index) => ({
    period: dso.period,
    dsoMin: dso.min,
    dsoMax: dso.max,
    dsoAvg: dso.avg,
    dsoRange: dso.max - dso.min,
    dpoMin: dpoData?.[index]?.min || 0,
    dpoMax: dpoData?.[index]?.max || 0,
    dpoAvg: dpoData?.[index]?.avg || 0,
    dpoRange: (dpoData?.[index]?.max || 0) - (dpoData?.[index]?.min || 0),
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string }) => {
    if (active && payload && payload.length) {
      const dsoAvg = payload.find(p => p.dataKey === 'dsoAvg')?.value;
      const dpoAvg = payload.find(p => p.dataKey === 'dpoAvg')?.value;
      const dataPoint = combinedData.find(d => d.period === label);

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium" style={{ color: COLORS.dso }}>DSO</p>
              <p className="text-xs text-gray-600">
                Min: {dataPoint?.dsoMin.toFixed(0)} | Max: {dataPoint?.dsoMax.toFixed(0)} | Avg: {dsoAvg?.toFixed(0)} jours
              </p>
            </div>
            {showDPO && dpoData && (
              <div>
                <p className="text-sm font-medium" style={{ color: COLORS.dpo }}>DPO</p>
                <p className="text-xs text-gray-600">
                  Min: {dataPoint?.dpoMin.toFixed(0)} | Max: {dataPoint?.dpoMax.toFixed(0)} | Avg: {dpoAvg?.toFixed(0)} jours
                </p>
              </div>
            )}
          </div>
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
          data={combinedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: COLORS.grid }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            label={{
              value: 'Jours',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: '#6B7280' },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} />

          {/* DSO Range (visualized as a bar from min to max) */}
          <Bar
            dataKey="dsoMin"
            stackId="dso"
            fill="transparent"
            name="DSO Min"
            legendType="none"
          />
          <Bar
            dataKey="dsoRange"
            stackId="dso"
            fill={COLORS.dso}
            opacity={0.3}
            name="DSO Range"
            radius={[4, 4, 4, 4]}
          />

          {/* DSO Average line */}
          <Line
            type="monotone"
            dataKey="dsoAvg"
            stroke={COLORS.dso}
            strokeWidth={2}
            dot={{ fill: COLORS.dso, strokeWidth: 2, r: 5 }}
            name="DSO Moyen"
          />

          {showDPO && dpoData && (
            <>
              {/* DPO Range */}
              <Bar
                dataKey="dpoMin"
                stackId="dpo"
                fill="transparent"
                name="DPO Min"
                legendType="none"
              />
              <Bar
                dataKey="dpoRange"
                stackId="dpo"
                fill={COLORS.dpo}
                opacity={0.3}
                name="DPO Range"
                radius={[4, 4, 4, 4]}
              />

              {/* DPO Average line */}
              <Line
                type="monotone"
                dataKey="dpoAvg"
                stroke={COLORS.dpo}
                strokeWidth={2}
                dot={{ fill: COLORS.dpo, strokeWidth: 2, r: 5 }}
                name="DPO Moyen"
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DSODPOChart;
