import React from 'react';
import { Stats } from '../types';
import { AlertCircle, Clock, CheckCircle2, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface StatsCardsProps {
  stats: Stats | null;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Active Issues',
      value: stats?.total || 0,
      icon: Activity,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      trend: '+12% from last week'
    },
    {
      label: 'Pending Repairs',
      value: stats?.pending || 0,
      icon: AlertCircle,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      trend: '4 high priority'
    },
    {
      label: 'Resolved Issues',
      value: stats?.resolved || 0,
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      trend: '82% success rate'
    },
    {
      label: 'Avg. Resolution Time',
      value: stats?.avgResolutionTime || '0h',
      icon: Clock,
      color: 'bg-slate-50 text-slate-600 border-slate-100',
      trend: '-15m from avg'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`p-6 rounded-3xl border shadow-sm ${card.color} flex flex-col`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-xl bg-white/50 backdrop-blur-sm`}>
              <card.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              {card.trend}
            </span>
          </div>
          <h3 className="text-3xl font-bold mb-1">{card.value}</h3>
          <p className="text-sm font-semibold opacity-70">{card.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
