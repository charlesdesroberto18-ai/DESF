import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface MetricCardProps {
  id: string;
  title: string;
  value: number;
  icon: LucideIcon;
  color: 'emerald' | 'rose' | 'teal' | 'indigo' | 'amber';
  subtitle?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export default function MetricCard({
  id,
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  onClick,
  isActive = false
}: MetricCardProps) {
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100/50',
      text: 'text-emerald-700',
      accent: 'bg-emerald-500',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20'
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600 border-rose-100/50',
      text: 'text-rose-700',
      accent: 'bg-rose-500',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20'
    },
    teal: {
      bg: 'bg-teal-50 text-teal-600 border-teal-100/50',
      text: 'text-teal-700',
      accent: 'bg-teal-500',
      activeBorder: 'border-teal-500 ring-2 ring-teal-500/20'
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100/50',
      text: 'text-indigo-700',
      accent: 'bg-indigo-500',
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/20'
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600 border-amber-100/50',
      text: 'text-amber-700',
      accent: 'bg-amber-500',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20'
    }
  };

  const style = colorStyles[color];

  return (
    <motion.div
      id={id}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`p-4.5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${isActive ? style.activeBorder : ''}`}
    >
      <div className="space-y-1.5 flex-1 min-w-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          {title}
        </span>
        <div className="font-display font-bold text-xl sm:text-2xl text-slate-800 tracking-tight font-mono truncate">
          R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {subtitle && (
          <span className="text-[10px] text-slate-500 font-medium truncate block">
            {subtitle}
          </span>
        )}
      </div>

      <div className={`p-3 rounded-xl border ${style.bg} shrink-0 ml-3`}>
        <Icon className="w-5 h-5" />
      </div>
    </motion.div>
  );
}
