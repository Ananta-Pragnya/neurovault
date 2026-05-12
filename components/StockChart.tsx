
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Line } from 'recharts';
import { Stock } from '../types';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-3 border border-white/10 rounded-lg text-xs">
        <p className="text-slate-400 mb-1">{label}</p>
        <p className="text-white font-bold text-lg">${payload[0].value.toFixed(2)}</p>
        {payload[1] && <p className="text-indigo-400">Vol: {payload[1].value.toLocaleString()}</p>}
      </div>
    );
  }
  return null;
};

const StockChart: React.FC<{ stock: Stock; height?: number }> = ({ stock, height = 300 }) => {
  const isUp = stock.change >= 0;
  const gradientColor = isUp ? '#10b981' : '#f43f5e';

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={stock.history}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={gradientColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10 }}
          />
          <YAxis 
            hide 
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={gradientColor} 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
          />
          <Bar 
            dataKey="volume" 
            fill="rgba(255,255,255,0.05)" 
            yAxisId={0} 
            radius={[2, 2, 0, 0]}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={gradientColor} 
            strokeWidth={2} 
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
