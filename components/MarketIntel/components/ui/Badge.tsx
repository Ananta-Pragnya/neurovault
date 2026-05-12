
import React from 'react';

interface BadgeProps {
  type: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed';
}

export const SentimentBadge: React.FC<BadgeProps> = ({ type }) => {
  const styles = {
    Bullish: "bg-green-900/30 text-green-400 border-green-700",
    Bearish: "bg-red-900/30 text-red-400 border-red-700",
    Neutral: "bg-gray-800 text-gray-400 border-gray-700",
    Mixed: "bg-yellow-900/30 text-yellow-400 border-yellow-700",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[type]}`}>
      {type}
    </span>
  );
};
