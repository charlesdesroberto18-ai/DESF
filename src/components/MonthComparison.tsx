import { ArrowDown, ArrowUp, CreditCard, DollarSign, Minus, PiggyBank, TrendingUp } from 'lucide-react';

interface MonthSummary {
  income: number;
  expenses: number;
  savings: number;
  balance: number;
}

interface MonthComparisonProps {
  currentLabel: string;
  previousLabel: string;
  current: MonthSummary;
  previous: MonthSummary;
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

export default function MonthComparison({ currentLabel, previousLabel, current, previous }: MonthComparisonProps) {
  const metrics = [
    { label: 'Entradas', current: current.income, previous: previous.income, icon: DollarSign, favorLower: false, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Despesas', current: current.expenses, previous: previous.expenses, icon: CreditCard, favorLower: true, color: 'text-rose-600 bg-rose-50' },
    { label: 'Caixinhas', current: current.savings, previous: previous.savings, icon: PiggyBank, favorLower: false, color: 'text-teal-600 bg-teal-50' },
    { label: 'Saldo final', current: current.balance, previous: previous.balance, icon: TrendingUp, favorLower: false, color: 'text-indigo-600 bg-indigo-50' }
  ];

  return (
    <section className="rounded-3xl bg-white/90 border border-white shadow-lg shadow-slate-200/50 p-5 sm:p-6" aria-labelledby="month-comparison-title">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Evolução mensal</span>
          <h2 id="month-comparison-title" className="font-display font-bold text-lg text-slate-900 mt-1">Comparação com o mês anterior</h2>
          <p className="text-xs text-slate-500 mt-1">{currentLabel} comparado com {previousLabel}.</p>
        </div>
        <span className="text-[10px] font-semibold text-slate-400">Variações são calculadas pelos lançamentos registrados</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((metric) => {
          const difference = metric.current - metric.previous;
          const percentage = metric.previous !== 0 ? (difference / Math.abs(metric.previous)) * 100 : null;
          const isNeutral = Math.abs(difference) < 0.005;
          const isPositive = metric.favorLower ? difference < 0 : difference > 0;
          const trendLabel = isNeutral
            ? 'Sem variação'
            : percentage === null
              ? 'Novo'
              : `${Math.abs(percentage).toFixed(0)}%`;
          const TrendIcon = isNeutral ? Minus : difference > 0 ? ArrowUp : ArrowDown;
          const trendStyle = isNeutral
            ? 'bg-slate-100 text-slate-500'
            : isPositive
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700';
          const Icon = metric.icon;

          return (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 min-w-0"
              aria-label={`${metric.label}: ${formatCurrency(metric.current)} em ${currentLabel}; ${formatCurrency(metric.previous)} em ${previousLabel}. ${trendLabel}.`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</span>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${metric.color}`}><Icon className="w-4 h-4" aria-hidden="true" /></span>
              </div>
              <strong className="block font-display font-mono tabular-nums text-[clamp(0.7rem,3vw,1rem)] text-slate-900 mt-3 whitespace-nowrap">{formatCurrency(metric.current)}</strong>
              <div className="flex flex-col items-start gap-1.5 mt-2 min-w-0">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${trendStyle}`}>
                  <TrendIcon className="w-3 h-3" aria-hidden="true" />
                  {trendLabel}
                </span>
                <span className="text-[9px] leading-tight text-slate-400">Antes: <span className="font-mono whitespace-nowrap">{formatCurrency(metric.previous)}</span></span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
