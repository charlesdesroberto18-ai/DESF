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
  step?: number;
}

export default function MetricCard({
  id,
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  onClick,
  isActive = false,
  step
}: MetricCardProps) {
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100/50',
      text: 'text-emerald-500',
      accent: 'bg-emerald-500',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20'
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600 border-rose-100/50',
      text: 'text-rose-500',
      accent: 'bg-rose-500',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20'
    },
    teal: {
      bg: 'bg-teal-50 text-teal-600 border-teal-100/50',
      text: 'text-teal-500',
      accent: 'bg-teal-500',
      activeBorder: 'border-teal-500 ring-2 ring-teal-500/20'
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100/50',
      text: 'text-indigo-500',
      accent: 'bg-indigo-500',
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/20'
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600 border-amber-100/50',
      text: 'text-amber-500',
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
      className={`p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${isActive ? style.activeBorder : ''}`}
    >
      {/* Top Header Row within the Card */}
      <div className="flex items-center justify-between w-full border-b border-slate-100 pb-1.5 mb-1.5 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {step && (
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-[8.5px] font-extrabold bg-slate-100 text-slate-500 rounded-full shrink-0">
              {step}
            </span>
          )}
          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider truncate">
            {title}
          </span>
        </div>
        <Icon className={`w-3.5 h-3.5 ${style.text} shrink-0`} />
      </div>

      {/* Value and Subtitle section */}
      <div className="space-y-0.5 min-w-0">
        <div className="font-display font-bold text-sm sm:text-base md:text-sm lg:text-[13px] xl:text-[15px] 2xl:text-lg text-slate-800 tracking-tight font-mono truncate" title={`R$ ${value.toFixed(2)}`}>
          R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {subtitle && (
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate block leading-tight">
            {subtitle}
          </span>
        )}
      </div>
    </motion.div>
  );
}
