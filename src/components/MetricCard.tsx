import { useState } from 'react';
import { Info, LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface MetricCardProps {
  id: string;
  title: string;
  value: number;
  icon: LucideIcon;
  color: 'emerald' | 'rose' | 'teal' | 'indigo' | 'amber';
  subtitle?: string;
  details?: string;
  accessibleLabel?: string;
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
  details,
  accessibleLabel,
  onClick,
  isActive = false,
  step
}: MetricCardProps) {
  const [showDetails, setShowDetails] = useState(false);
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
  const formattedValue = value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const detailsId = `${id}-details`;

  return (
    <motion.div
      id={id}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`relative rounded-3xl bg-white/95 border border-white shadow-md shadow-slate-200/50 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-xl hover:shadow-slate-200/70' : ''
      } ${isActive ? style.activeBorder : ''}`}
    >
      <span className={`absolute top-0 left-5 right-5 h-0.5 rounded-full ${style.accent}`} aria-hidden="true" />
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label={accessibleLabel || `${title}. ${formattedValue}. ${subtitle || ''}${details ? `. ${details}` : ''}`}
        className="w-full min-h-32 p-3.5 sm:p-4 text-left flex flex-col justify-between rounded-3xl disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      >
        <div className="w-full border-b border-slate-100 pb-2 mb-2">
          <div className="flex items-center justify-between gap-2">
            {step && (
              <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-extrabold bg-slate-100 text-slate-500 rounded-full shrink-0 mt-0.5">
                {step}
              </span>
            )}
            <span className={`w-8 h-8 rounded-xl border flex items-center justify-center ${style.bg}`}>
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight two-line-clamp min-h-6 mt-1 block">
            {title}
          </span>
        </div>

        <div className="space-y-1 min-w-0">
          <div className="font-display font-extrabold text-sm sm:text-base xl:text-xl text-slate-900 tracking-tight font-mono tabular-nums whitespace-nowrap">
            {formattedValue}
          </div>
          {subtitle && (
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block leading-snug two-line-clamp min-h-7">
              {subtitle}
            </span>
          )}
        </div>
      </button>

      {details && (
        <>
          <button
            type="button"
            aria-label={`Explicação de ${title}`}
            aria-expanded={showDetails}
            aria-controls={detailsId}
            onClick={(event) => {
              event.stopPropagation();
              setShowDetails((current) => !current);
            }}
            className="absolute bottom-2 right-2 p-1 rounded-full text-slate-300 hover:text-teal-600 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          {showDetails && (
            <div
              id={detailsId}
              role="status"
              className="absolute z-30 left-3 right-3 top-[calc(100%-0.5rem)] rounded-xl border border-slate-200 bg-slate-900 text-white text-[11px] leading-relaxed p-3 shadow-xl"
            >
              {details}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
