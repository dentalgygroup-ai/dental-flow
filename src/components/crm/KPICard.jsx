import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  className = ''
}) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 bg-gray-50 rounded-lg">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-3 text-xs ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend === 'up' ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}