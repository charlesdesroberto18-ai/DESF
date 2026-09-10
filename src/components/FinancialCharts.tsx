import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  Wallet,
  Target,
  Percent,
  Calendar,
  Trash2,
  X,
  StickyNote,
  Check,
  AlertCircle,
  HelpCircle,
  ShoppingCart,
  Sparkles,
  LoaderCircle
} from 'lucide-react';
import { FixedExpense, VariableExpense, SavingGoal, Income } from '../types';

const MAX_MONEY_VALUE = 999_999_999.99;

interface FinancialChartsProps {
  totalIn: number;
  fixedTotal: number;
  variableTotal: number;
  caixinhasTotal: number;
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  savingGoals: SavingGoal[];
  currentMonthName: string;
  currentYear: number;
  incomes: Income[];
  observations: Record<string, string>;
  onAddIncome: (name: string, value: number, category: string, date: string, week: 1 | 2 | 3 | 4 | 5) => void;
  onDeleteIncome: (id: string) => void;
  onAddVariableExpense: (description: string, category: string, value: number, date: string, isPaid: boolean) => void;
  onDeleteVariableExpense: (id: string) => void;
  onUpdateObservations: (date: string, text: string) => void;
  onToggleFixedExpensePaid?: (id: string) => void;
  onToggleVariableExpensePaid?: (id: string) => void;
}

const MONTH_NAMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

export default function FinancialCharts({
  totalIn,
  fixedTotal,
  variableTotal,
  caixinhasTotal,
  fixedExpenses,
  variableExpenses,
  savingGoals,
  currentMonthName,
  currentYear,
  incomes,
  observations,
  onAddIncome,
  onDeleteIncome,
  onAddVariableExpense,
  onDeleteVariableExpense,
  onUpdateObservations,
  onToggleFixedExpensePaid,
  onToggleVariableExpensePaid
}: FinancialChartsProps) {
  const despesasTotais = fixedTotal + variableTotal;
  const totalOutWithCaixinhas = despesasTotais + caixinhasTotal;
  const balance = totalIn - totalOutWithCaixinhas;

  // Percentages relative to total income (for allocation stack)
  const percentFixedOfIn = totalIn > 0 ? (fixedTotal / totalIn) * 100 : 0;
  const percentVariableOfIn = totalIn > 0 ? (variableTotal / totalIn) * 100 : 0;
  const percentSavingsOfIn = totalIn > 0 ? (caixinhasTotal / totalIn) * 100 : 0;
  const percentLeftoverOfIn = totalIn > 0 ? (balance / totalIn) * 100 : 0;

  // Group variable expenses by category
  const categoriesMap: Record<string, { value: number; count: number }> = {};
  variableExpenses.forEach(exp => {
    const cat = exp.category || 'Outros';
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = { value: 0, count: 0 };
    }
    categoriesMap[cat].value += exp.value;
    categoriesMap[cat].count += 1;
  });

  const categoriesData = Object.entries(categoriesMap)
    .map(([name, data]) => ({
      name,
      value: data.value,
      count: data.count,
      percentage: variableTotal > 0 ? (data.value / variableTotal) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);

  const topVariableCategory = categoriesData[0];
  const committedPercent = totalIn > 0 ? Math.round(((fixedTotal + variableTotal) / totalIn) * 100) : 0;
  const localInsights = [
    totalIn === 0
      ? 'Registre uma entrada para liberar a leitura completa do mês.'
      : balance >= 0
        ? `Depois de gastos e Caixinhas, o saldo final é ${balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
        : `O planejamento atual está ${Math.abs(balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} acima das entradas.`,
    totalIn > 0
      ? `${committedPercent}% das entradas estão comprometidas com contas e gastos variáveis.`
      : 'A proporção entre contas e entradas aparecerá após o primeiro registro.',
    topVariableCategory
      ? `${topVariableCategory.name} é a maior categoria variável, com ${topVariableCategory.percentage.toFixed(0)}% desses gastos.`
      : 'As categorias de gastos aparecerão conforme os lançamentos forem registrados.'
  ];
  const [aiInsights, setAiInsights] = useState<string[] | null>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [aiError, setAiError] = useState('');
  const displayedInsights = aiInsights || localInsights;

  const aiDataFingerprint = JSON.stringify({
    month: currentMonthName,
    year: currentYear,
    totalIn,
    fixedTotal,
    variableTotal,
    caixinhasTotal,
    incomeCount: incomes.length,
    fixedExpenseCount: fixedExpenses.length,
    paidFixedExpenseCount: fixedExpenses.filter((expense) => expense.isPaid).length,
    variableExpenseCount: variableExpenses.length,
    savingsGoals: savingGoals.map((goal) => [goal.current, goal.target]),
    variableCategories: categoriesData.map((category) => [category.name, category.value, category.count]),
  });

  useEffect(() => {
    setAiInsights(null);
    setAiStatus('idle');
    setAiError('');
  }, [aiDataFingerprint]);

  const handleGenerateAiInsights = async () => {
    setAiStatus('loading');
    setAiError('');

    try {
      const response = await fetch('/api/monthly-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: currentMonthName,
          year: currentYear,
          totalIncome: totalIn,
          fixedExpensesTotal: fixedTotal,
          variableExpensesTotal: variableTotal,
          savingsTotal: caixinhasTotal,
          finalBalance: balance,
          incomeCount: incomes.length,
          fixedExpenseCount: fixedExpenses.length,
          paidFixedExpenseCount: fixedExpenses.filter((expense) => expense.isPaid).length,
          variableExpenseCount: variableExpenses.length,
          savingsGoalCount: savingGoals.length,
          savingsTargetTotal: savingGoals.reduce((sum, goal) => sum + goal.target, 0),
          variableCategories: categoriesData.slice(0, 8).map((category) => ({
            name: category.name,
            value: category.value,
            count: category.count,
          })),
        }),
      });

      let result: { insights?: unknown; error?: unknown };
      try {
        result = await response.json() as { insights?: unknown; error?: unknown };
      } catch {
        throw new Error('A análise por IA não está disponível neste ambiente.');
      }
      if (!response.ok || !Array.isArray(result.insights) || result.insights.length !== 3) {
        throw new Error(typeof result.error === 'string' ? result.error : 'A análise por IA não está disponível agora.');
      }

      const safeInsights = result.insights.filter((item): item is string => typeof item === 'string');
      if (safeInsights.length !== 3) {
        throw new Error('A análise por IA não retornou um resultado válido.');
      }

      setAiInsights(safeInsights);
      setAiStatus('success');
    } catch (error) {
      setAiInsights(null);
      setAiStatus('error');
      setAiError(error instanceof Error ? error.message : 'A análise por IA não está disponível agora.');
    }
  };

  const categoryColors: Record<string, string> = {
    'Alimentação': 'bg-amber-500',
    'Transporte / Gasolina': 'bg-blue-500',
    'Lazer / Delivery': 'bg-rose-500',
    'Saúde / Farmácia': 'bg-emerald-500',
    'Roupas / Compras': 'bg-purple-500',
    'Educação / Cursos': 'bg-teal-500',
    'Assinaturas / Serviços': 'bg-indigo-500',
    'Outros': 'bg-slate-400'
  };

  const categoryTextColors: Record<string, string> = {
    'Alimentação': 'text-amber-500',
    'Transporte / Gasolina': 'text-blue-500',
    'Lazer / Delivery': 'text-rose-500',
    'Saúde / Farmácia': 'text-emerald-500',
    'Roupas / Compras': 'text-purple-500',
    'Educação / Cursos': 'text-teal-500',
    'Assinaturas / Serviços': 'text-indigo-500',
    'Outros': 'text-slate-400'
  };

  const categoryIcons: Record<string, any> = {
    'Alimentação': ShoppingCart,
    'Transporte / Gasolina': Wallet,
    'Lazer / Delivery': Target,
    'Saúde / Farmácia': AlertCircle,
    'Roupas / Compras': ShoppingCart,
    'Educação / Cursos': Percent,
    'Assinaturas / Serviços': Percent,
    'Outros': HelpCircle
  };

  // Active Month Calculations for Calendar
  const monthIndex = MONTH_NAMES.indexOf(currentMonthName.toUpperCase());
  const monthNumber = monthIndex !== -1 ? monthIndex + 1 : 7;
  const year = currentYear;

  // Total days in current month
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  // Weekday index of the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayIndex = new Date(year, monthNumber - 1, 1).getDay();

  // Selected Day State for detail panel / modal
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Quick Add forms states
  const [quickType, setQuickType] = useState<'income' | 'expense'>('expense');
  const [desc, setDesc] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('Alimentação');
  const [isPaidInput, setIsPaidInput] = useState(true);
  const [noteInput, setNoteInput] = useState('');
  const [modalError, setModalError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auto-fill form values when opening/changing selectedDay
  useEffect(() => {
    if (selectedDay !== null) {
      setDesc('');
      setValueInput('');
      setModalError('');
      setSaveSuccess(false);
      setQuickType('expense');
      setCategoryInput('Alimentação');
      setIsPaidInput(true);
      const dateString = `${year}-${String(monthNumber).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      setNoteInput(observations[dateString] || '');
    }
  }, [selectedDay, monthNumber, year, observations]);

  useEffect(() => {
    if (selectedDay === null) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedDay(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedDay]);

  // Handler for type toggling in quick add form
  const handleTypeChange = (type: 'income' | 'expense') => {
    setQuickType(type);
    setCategoryInput(type === 'income' ? 'Extra' : 'Alimentação');
    setModalError('');
  };

  const selectedDateString = selectedDay !== null
    ? `${year}-${String(monthNumber).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : '';

  const selectedDayIncomes = incomes.filter(inc => inc.date === selectedDateString);
  const selectedDayExpenses = variableExpenses.filter(ve => ve.date === selectedDateString);
  const selectedDayObservation = selectedDateString ? (observations[selectedDateString] || '') : '';

  const dayIncomesTotal = selectedDayIncomes.reduce((sum, item) => sum + item.value, 0);
  const dayExpensesTotal = selectedDayExpenses.reduce((sum, item) => sum + item.value, 0);
  const dayBalance = dayIncomesTotal - dayExpensesTotal;

  // Handle transaction submission
  const handleSubmitQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !selectedDateString) return;

    if (!desc.trim()) {
      setModalError('Por favor, informe uma descrição.');
      return;
    }

    const val = Number(valueInput);
    if (!Number.isFinite(val) || val <= 0 || val > MAX_MONEY_VALUE) {
      setModalError('Informe um valor entre R$ 0,01 e R$ 999.999.999,99.');
      return;
    }

    const normalizedValue = Math.round(val * 100) / 100;

    if (quickType === 'income') {
      const weekNum = Math.min(5, Math.ceil(selectedDay / 7)) as 1 | 2 | 3 | 4 | 5;
      onAddIncome(desc.trim(), normalizedValue, categoryInput, selectedDateString, weekNum);
    } else {
      onAddVariableExpense(desc.trim(), categoryInput, normalizedValue, selectedDateString, isPaidInput);
    }

    // Reset simple fields
    setDesc('');
    setValueInput('');
    setModalError('');
  };

  // Handle note submission
  const handleSaveNote = () => {
    if (!selectedDateString) return;
    onUpdateObservations(selectedDateString, noteInput.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Construct today's date string in YYYY-MM-DD format
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  // Gather pending and overdue bills
  const pendingBills = [
    ...fixedExpenses
      .filter(fe => !fe.isPaid && fe.dueDate)
      .map(fe => ({
        id: fe.id,
        name: fe.name,
        value: fe.value,
        type: 'fixed' as const,
        dueDate: fe.dueDate!,
        isOverdue: fe.dueDate! < todayStr,
      })),
    ...variableExpenses
      .filter(ve => !ve.isPaid && ve.date)
      .map(ve => ({
        id: ve.id,
        name: ve.description,
        value: ve.value,
        type: 'variable' as const,
        dueDate: ve.date,
        isOverdue: ve.date < todayStr,
      }))
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Build grid items
  const calendarCells = [];
  // Add empty spaces for previous month's days
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ type: 'empty', key: `empty-${i}` });
  }
  // Add actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateString = `${year}-${String(monthNumber).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayIncs = incomes.filter(inc => inc.date === dateString);
    const dayVars = variableExpenses.filter(ve => ve.date === dateString);
    
    // Check if there are unpaid fixed expenses due on this date
    const hasUnpaidFixed = fixedExpenses.some(fe => fe.dueDate === dateString && !fe.isPaid);
    // Check if there are unpaid variable expenses due on this date
    const hasUnpaidVariable = dayVars.some(ve => !ve.isPaid);
    const hasUnpaidBills = hasUnpaidFixed || hasUnpaidVariable;
    
    const incSum = dayIncs.reduce((sum, item) => sum + item.value, 0);
    const expSum = dayVars.reduce((sum, item) => sum + item.value, 0);
    const dayObs = observations[dateString] || '';

    const isToday = todayObj.getFullYear() === year && (todayObj.getMonth() + 1) === monthNumber && todayObj.getDate() === d;

    calendarCells.push({
      type: 'day',
      day: d,
      dateString,
      isToday,
      incomesSum: incSum,
      expensesSum: expSum,
      hasObservation: dayObs.trim().length > 0,
      hasUnpaidBills,
      key: `day-${d}`
    });
  }

  return (
    <div className="space-y-6" id="dashboard_tab_panel">
      
      {/* Alertas de Prazos a Vencer */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4" id="due_date_alerts_panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-800 text-base">
                Alertas de Prazos a Vencer
              </h3>
              <p className="text-xs text-slate-400">Contas fixas e despesas pendentes deste mês com vencimento.</p>
            </div>
          </div>
          {pendingBills.length > 0 && (
            <span className="text-xs font-bold bg-rose-50 text-rose-600 px-3 py-1 rounded-full font-mono border border-rose-100">
              {pendingBills.length} pendentes • R$ {pendingBills.reduce((sum, b) => sum + b.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {pendingBills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingBills.map((bill) => (
              <div
                key={`${bill.type}-${bill.id}`}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  bill.isOverdue
                    ? 'bg-rose-50/40 border-rose-100 hover:border-rose-200'
                    : 'bg-amber-50/20 border-amber-100 hover:border-amber-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Quick toggle payment button */}
                  <button
                    onClick={() => {
                      if (bill.type === 'fixed' && onToggleFixedExpensePaid) {
                        onToggleFixedExpensePaid(bill.id);
                      } else if (bill.type === 'variable' && onToggleVariableExpensePaid) {
                        onToggleVariableExpensePaid(bill.id);
                      }
                    }}
                    className="w-5 h-5 rounded-full border border-slate-300 bg-white hover:border-rose-400 text-transparent flex items-center justify-center shrink-0 transition-colors cursor-pointer group"
                    title="Marcar como pago"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3.5] text-slate-400 group-hover:text-rose-500" />
                  </button>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate text-slate-800">
                      {bill.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                        bill.isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {bill.isOverdue ? 'Atrasada!' : 'A vencer'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Dia {bill.dueDate.split('-')[2]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold font-mono text-slate-700 block">
                    R$ {bill.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">
                    {bill.type === 'fixed' ? 'Fixa' : 'Variável'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-xl p-4 text-center text-xs font-semibold text-emerald-800 flex items-center justify-center gap-2">
            <Check className="w-4 h-4 bg-emerald-500 text-white p-0.5 rounded-full" />
            <span>Parabéns! Nenhuma conta com vencimento pendente para o mês de {currentMonthName.toLowerCase()}.</span>
          </div>
        )}
      </div>

      {/* SEÇÃO DE ANÁLISE DE FLUXO E DISTRIBUIÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="visual_analysis_section">
        
        {/* Left Card: Dynamic Cash Flow Stack */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5 flex flex-col justify-between" id="cashflow_flow_analysis">
          <div className="space-y-0.5">
            <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Alocação da Receita Total
            </h3>
            <p className="text-xs text-slate-400">Veja proporcionalmente para onde estão indo seus ganhos deste mês.</p>
          </div>

          {/* Graphical Multi-Segment Stack Bar */}
          <div className="space-y-4">
            <div
              className="h-6 w-full bg-slate-100 rounded-2xl overflow-hidden flex p-0.5 animate-pulse-once"
              role="img"
              aria-label={`Distribuição das entradas: ${percentFixedOfIn.toFixed(1)}% em contas fixas, ${percentVariableOfIn.toFixed(1)}% em gastos variáveis, ${percentSavingsOfIn.toFixed(1)}% em Caixinhas e ${Math.max(0, percentLeftoverOfIn).toFixed(1)}% de saldo.`}
            >
              {percentFixedOfIn > 0 && (
                <div
                  style={{ width: `${Math.min(100, Math.max(0, percentFixedOfIn))}%` }}
                  className="bg-rose-500 h-full transition-all duration-500 ease-out first:rounded-l-xl last:rounded-r-xl"
                  title={`Contas Fixas: R$ ${fixedTotal.toFixed(2)} (${percentFixedOfIn.toFixed(1)}%)`}
                />
              )}
              {percentVariableOfIn > 0 && (
                <div
                  style={{ width: `${Math.min(100, Math.max(0, percentVariableOfIn))}%` }}
                  className="bg-indigo-500 h-full transition-all duration-500 ease-out first:rounded-l-xl last:rounded-r-xl"
                  title={`Gastos Variáveis: R$ ${variableTotal.toFixed(2)} (${percentVariableOfIn.toFixed(1)}%)`}
                />
              )}
              {percentSavingsOfIn > 0 && (
                <div
                  style={{ width: `${Math.min(100, Math.max(0, percentSavingsOfIn))}%` }}
                  className="bg-teal-500 h-full transition-all duration-500 ease-out first:rounded-l-xl last:rounded-r-xl"
                  title={`Caixinhas: R$ ${caixinhasTotal.toFixed(2)} (${percentSavingsOfIn.toFixed(1)}%)`}
                />
              )}
              {balance > 0 && (
                <div
                  style={{ width: `${Math.min(100, Math.max(0, percentLeftoverOfIn))}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500 ease-out first:rounded-l-xl last:rounded-r-xl"
                  title={`Sobra Líquida: R$ ${balance.toFixed(2)} (${percentLeftoverOfIn.toFixed(1)}%)`}
                />
              )}
            </div>

            {/* If zero revenue */}
            {totalIn === 0 && (
              <div className="text-center py-2 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-100">
                Nenhuma receita registrada ainda. Adicione uma para ver o gráfico.
              </div>
            )}

            {/* If deficit */}
            {balance < 0 && (
              <div className="bg-rose-50 border border-rose-100/60 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 animate-bounce" />
                <span>Suas despesas totais superaram suas receitas em R$ {Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.</span>
              </div>
            )}
          </div>

          {/* Breakdown detailed list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" id="cashflow_legends_grid">
            <div className="p-3 bg-rose-50/30 border border-rose-100/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                <span className="text-xs font-bold text-slate-600">Contas fixas</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono text-slate-800 block">R$ {fixedTotal.toLocaleString('pt-BR')}</span>
                <span className="text-[10px] text-slate-400 block">{percentFixedOfIn.toFixed(1)}% da receita</span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/30 border border-indigo-100/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-xs font-bold text-slate-600">Gastos variáveis</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono text-slate-800 block">R$ {variableTotal.toLocaleString('pt-BR')}</span>
                <span className="text-[10px] text-slate-400 block">{percentVariableOfIn.toFixed(1)}% da receita</span>
              </div>
            </div>

            <div className="p-3 bg-teal-50/30 border border-teal-100/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full bg-teal-500 shrink-0" />
                <span className="text-xs font-bold text-slate-600">Caixinhas</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono text-slate-800 block">R$ {caixinhasTotal.toLocaleString('pt-BR')}</span>
                <span className="text-[10px] text-slate-400 block">{percentSavingsOfIn.toFixed(1)}% da receita</span>
              </div>
            </div>

            <div className={`p-3 border rounded-xl flex items-center justify-between ${
              balance >= 0 ? 'bg-emerald-50/30 border-emerald-100/30' : 'bg-rose-50/40 border-rose-100/40'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-3 h-3 rounded-full shrink-0 ${balance >= 0 ? 'bg-emerald-500' : 'bg-rose-600'}`} />
                <span className="text-xs font-bold text-slate-600">Saldo final</span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold font-mono block ${balance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  R$ {balance.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {balance >= 0 ? `${percentLeftoverOfIn.toFixed(1)}% livre` : 'Saldo Negativo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Expenses Category Breakdown */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between" id="category_breakdown_analysis">
          <div className="space-y-0.5">
            <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-500" />
              Gastos Variáveis por Categoria
            </h3>
            <p className="text-xs text-slate-400">Distribuição dos gastos variáveis registrados no mês.</p>
          </div>

          <div className="flex-1 mt-4 space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
            {categoriesData.length > 0 ? (
              categoriesData.map((cat) => {
                const barColor = categoryColors[cat.name] || 'bg-slate-400';
                const textColor = categoryTextColors[cat.name] || 'text-slate-500';
                const CatIcon = categoryIcons[cat.name] || HelpCircle;

                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1 rounded-lg ${barColor.replace('bg-', 'bg-opacity-10 bg-')} ${textColor}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-700 two-line-clamp">{cat.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                          {cat.count} {cat.count === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold font-mono text-slate-800">
                          R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-semibold">({cat.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                    
                    {/* Visual Progress Line */}
                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden" role="progressbar" aria-label={`${cat.name}: ${cat.percentage.toFixed(0)}% dos gastos variáveis`} aria-valuenow={Math.round(cat.percentage)} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        style={{ width: `${cat.percentage}%` }}
                        className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 space-y-2 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                <ShoppingCart className="w-8 h-8 text-slate-300" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-500">Nenhum gasto variável lançado</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto">Clique em qualquer dia do calendário abaixo para registrar despesas diárias.</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <section className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm" aria-labelledby="quick-insights-title">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-8">
          <div className="lg:w-60 shrink-0">
            <span className="text-[10px] font-bold text-teal-300 uppercase tracking-widest">
              {aiStatus === 'success' ? 'Análise com IA' : 'Leitura automática'}
            </span>
            <h3 id="quick-insights-title" className="font-display font-bold text-lg mt-1">Resumo do mês</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {aiStatus === 'success'
                ? 'Gerado pelo DeepSeek V4 Flash com totais e categorias agregadas.'
                : 'A leitura local permanece disponível. A IA recebe somente totais e categorias, sem nomes ou descrições.'}
            </p>
            <button
              type="button"
              onClick={handleGenerateAiInsights}
              disabled={aiStatus === 'loading'}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-400 text-slate-950 hover:bg-teal-300 disabled:opacity-60 disabled:cursor-wait px-3.5 py-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
              aria-describedby={aiError ? 'ai-insights-error' : undefined}
            >
              {aiStatus === 'loading' ? (
                <LoaderCircle className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {aiStatus === 'loading'
                ? 'Analisando…'
                : aiStatus === 'success'
                  ? 'Atualizar análise'
                  : 'Analisar com IA'}
            </button>
            {aiError && (
              <p id="ai-insights-error" className="text-[10px] text-amber-200 mt-2 leading-relaxed" role="status">
                {aiError} A leitura local foi mantida.
              </p>
            )}
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
            {displayedInsights.map((insight, index) => (
              <li key={insight} className="privacy-value bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs leading-relaxed text-slate-200 flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center shrink-0" aria-hidden="true">{index + 1}</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* NOVO CALENDÁRIO MENSAL INTERATIVO */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4" id="monthly_calendar_card">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-500" />
              Calendário Mensal de Movimentações
            </h3>
            <p className="text-xs text-slate-400">Clique em qualquer dia para ver detalhes, adicionar receitas, despesas ou anotações rápidas.</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl py-1.5 px-3">
            <span className="text-xs font-bold text-slate-700 tracking-wide font-mono">
              {currentMonthName} / {currentYear}
            </span>
          </div>
        </div>

        {/* Calendário Grid */}
        <div className="border border-slate-100 rounded-xl overflow-hidden" id="calendar_grid_wrapper">
          {/* Dias da semana */}
          <div className="grid grid-cols-7 bg-slate-50/60 border-b border-slate-100 py-3 text-center">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dayLabel => (
              <span key={dayLabel} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                {dayLabel}
              </span>
            ))}
          </div>

          {/* Células de dias */}
          <div className="grid grid-cols-7 gap-px bg-slate-100">
            {calendarCells.map((cell, idx) => {
              if (cell.type === 'empty') {
                return (
                  <div key={cell.key} className="bg-slate-50/20 min-h-[72px] md:min-h-[90px] p-2" />
                );
              }

              const hasIncomes = cell.incomesSum > 0;
              const hasExpenses = cell.expensesSum > 0;
              const hasObs = cell.hasObservation;
              const dayAriaLabel = [
                `${cell.day} de ${currentMonthName.toLowerCase()} de ${currentYear}`,
                hasIncomes
                  ? `Entradas de ${cell.incomesSum!.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                  : 'Sem entradas',
                hasExpenses
                  ? `Saídas de ${cell.expensesSum!.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                  : 'Sem saídas',
                cell.hasUnpaidBills ? 'Há contas pendentes' : '',
                hasObs ? 'Possui observação' : '',
                'Abrir detalhes do dia'
              ].filter(Boolean).join('. ');

              return (
                <button
                  type="button"
                  key={cell.key}
                  onClick={() => setSelectedDay(cell.day!)}
                  aria-label={dayAriaLabel}
                  aria-current={cell.isToday ? 'date' : undefined}
                  className={`bg-white min-h-[72px] md:min-h-[90px] p-2 text-left hover:bg-slate-50/70 transition-all cursor-pointer flex flex-col justify-between group relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 ${
                    cell.isToday ? 'ring-2 ring-teal-500/25 bg-teal-50/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${
                        cell.isToday 
                          ? 'bg-teal-600 text-white w-5 h-5 rounded-full flex items-center justify-center' 
                          : 'text-slate-700 group-hover:text-slate-900'
                      }`}>
                        {cell.day}
                      </span>
                      {cell.hasUnpaidBills && (
                        <span className="flex h-1.5 w-1.5 relative" title="Contas pendentes!">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {cell.hasUnpaidBills && (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" title="Contas vencendo ou pendentes" />
                      )}
                      {hasObs && (
                        <StickyNote className="w-3.5 h-3.5 text-amber-500" title="Possui observação" />
                      )}
                    </div>
                  </div>

                  {/* Compact indicators area */}
                  <div className="mt-2 space-y-1">
                    {/* Desktop detailed view */}
                    <div className="hidden sm:block space-y-0.5">
                      {hasIncomes && (
                        <div className="bg-emerald-50/60 border border-emerald-100 text-[9px] font-bold font-mono text-emerald-700 px-1 py-0.5 rounded truncate">
                          + R$ {cell.incomesSum.toFixed(0)}
                        </div>
                      )}
                      {hasExpenses && (
                        <div className="bg-rose-50/60 border border-rose-100 text-[9px] font-bold font-mono text-rose-600 px-1 py-0.5 rounded truncate">
                          - R$ {cell.expensesSum.toFixed(0)}
                        </div>
                      )}
                    </div>

                    {/* Mobile tiny dot indicators */}
                    <div className="flex sm:hidden items-center justify-center gap-1 mt-1">
                      {hasIncomes && (
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      )}
                      {hasExpenses && (
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PAINEL/MODAL DETALHADO DO DIA */}
      <AnimatePresence>
        {selectedDay !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" id="day_modal_overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="day-modal-title"
              aria-describedby="day-modal-description"
              className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto"
              id="day_modal_box"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <div>
                    <h3 id="day-modal-title" className="font-display font-bold text-slate-800 text-lg">
                      Movimentações de {selectedDay} de {currentMonthName.toLowerCase()}
                    </h3>
                    <p id="day-modal-description" className="text-xs text-slate-400">Lançamentos e observações rápidos para esta data específica.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  aria-label="Fechar detalhes do dia"
                  className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Day KPIs indicators */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block mb-0.5">Entradas do Dia</span>
                  <div className="text-base font-bold text-emerald-700 font-mono">
                    R$ {dayIncomesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-rose-50/50 border border-rose-100/50 rounded-xl p-3">
                  <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block mb-0.5">Saídas do Dia</span>
                  <div className="text-base font-bold text-rose-700 font-mono">
                    R$ {dayExpensesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className={`${dayBalance >= 0 ? 'bg-teal-50/50 border-teal-100/50' : 'bg-rose-50/40 border-rose-100/40'} rounded-xl p-3 border`}>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Saldo do Dia</span>
                  <div className={`text-base font-bold font-mono ${dayBalance >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                    R$ {dayBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Split Content: Transactions List vs Add Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                
                {/* LIST OF TRANSACTIONS */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lançamentos do Dia</h4>
                  
                  {/* Incomes lists */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">Receitas</span>
                    {selectedDayIncomes.length > 0 ? (
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {selectedDayIncomes.map(inc => (
                          <div key={inc.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                            <div className="min-w-0">
                              <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-800 py-0.5 px-1.5 rounded-full mr-2">
                                {inc.category}
                              </span>
                              <span className="text-xs font-medium text-slate-700 truncate">{inc.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-emerald-600 font-mono">
                                R$ {inc.value.toFixed(2)}
                              </span>
                              <button
                                onClick={() => onDeleteIncome(inc.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                                title="Excluir receita"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-slate-50/50 p-2.5 rounded-lg border border-dashed border-slate-100">
                        Nenhuma receita neste dia.
                      </p>
                    )}
                  </div>

                  {/* Expenses lists */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block">Despesas</span>
                    {selectedDayExpenses.length > 0 ? (
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {selectedDayExpenses.map(ve => (
                          <div key={ve.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                            <div className="min-w-0">
                              <span className="text-[9px] font-semibold bg-rose-100 text-rose-800 py-0.5 px-1.5 rounded-full mr-2">
                                {ve.category}
                              </span>
                              <span className="text-xs font-medium text-slate-700 truncate">{ve.description}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                ve.isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {ve.isPaid ? 'Pago' : 'Pendente'}
                              </span>
                              <span className="text-xs font-bold text-rose-500 font-mono">
                                R$ {ve.value.toFixed(2)}
                              </span>
                              <button
                                onClick={() => onDeleteVariableExpense(ve.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                                title="Excluir despesa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-slate-50/50 p-2.5 rounded-lg border border-dashed border-slate-100">
                        Nenhuma despesa neste dia.
                      </p>
                    )}
                  </div>

                  {/* OBSERVATION VIEW */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block flex items-center gap-1">
                      <StickyNote className="w-3 h-3 text-amber-500" />
                      Observações do Dia
                    </span>
                    {selectedDayObservation ? (
                      <div className="bg-amber-50/40 border border-amber-200/50 text-slate-700 text-xs p-3 rounded-lg leading-relaxed italic">
                        {selectedDayObservation}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-slate-50/50 p-2 rounded-lg border border-dashed border-slate-100">
                        Nenhuma observação anotada para esta data.
                      </p>
                    )}
                  </div>
                </div>

                {/* ADD TRANSACTION OR EDIT NOTES */}
                <div className="space-y-4 bg-slate-50/40 border border-slate-100 p-4.5 rounded-2xl">
                  
                  {/* Form toggle headers */}
                  <div className="flex border-b border-slate-200">
                    <button
                      onClick={() => { setModalError(''); }}
                      className="flex-1 pb-2 text-center text-xs font-bold text-slate-500"
                    >
                      Painel de Lançamento
                    </button>
                  </div>

                  {/* QUICK ADD LAUNCHER FORM */}
                  <form onSubmit={handleSubmitQuickAdd} className="space-y-3.5">
                    {/* Income vs Expense Selection Tabs */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleTypeChange('expense')}
                        className={`py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors cursor-pointer ${
                          quickType === 'expense'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Gasto Variável
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTypeChange('income')}
                        className={`py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors cursor-pointer ${
                          quickType === 'income'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Receita Extra
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Descrição / Nome
                        </label>
                        <input
                          type="text"
                          value={desc}
                          onChange={(e) => setDesc(e.target.value)}
                          placeholder={quickType === 'income' ? 'Ex: Bônus extra, Freela...' : 'Ex: Padaria, Uber, Almoço...'}
                          className="w-full bg-white border border-slate-200 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 focus:border-slate-300 transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Valor (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={MAX_MONEY_VALUE}
                            value={valueInput}
                            onChange={(e) => setValueInput(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-white border border-slate-200 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 font-mono focus:border-slate-300 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Categoria
                          </label>
                          <select
                            value={categoryInput}
                            onChange={(e) => setCategoryInput(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 cursor-pointer focus:border-slate-300 transition-colors"
                          >
                            {quickType === 'income' ? (
                              ['Salário', 'Freelance', 'Venda', 'Extra', 'Garçom', 'Outros'].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))
                            ) : (
                              ['Alimentação', 'Transporte / Gasolina', 'Lazer / Delivery', 'Saúde / Farmácia', 'Roupas / Compras', 'Educação / Cursos', 'Assinaturas / Serviços', 'Outros'].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      {quickType === 'expense' && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                            Status do Pagamento
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setIsPaidInput(true)}
                              className={`py-1.5 px-3 text-[10px] font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                isPaidInput
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isPaidInput ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              Pago
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsPaidInput(false)}
                              className={`py-1.5 px-3 text-[10px] font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                !isPaidInput
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${!isPaidInput ? 'bg-amber-500' : 'bg-slate-300'}`} />
                              Pendente
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {modalError && (
                      <div className="flex items-center gap-1.5 text-rose-600 text-[10px] font-semibold bg-rose-50 p-2 rounded-lg border border-rose-100">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{modalError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className={`w-full text-white font-bold text-xs py-2 px-4 rounded-xl transition-colors cursor-pointer shadow-sm ${
                        quickType === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-500 hover:bg-rose-600'
                      }`}
                    >
                      Lançar {quickType === 'income' ? 'Receita' : 'Despesa'}
                    </button>
                  </form>

                  {/* QUICK OBSERVATION FIELD */}
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Anotar / Editar Observação
                    </label>
                    <textarea
                      rows={2}
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Anote detalhes específicos sobre este dia..."
                      className="w-full bg-white border border-slate-200 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 focus:border-slate-300 transition-colors resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleSaveNote}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                      >
                        Salvar Observação
                      </button>
                      
                      {saveSuccess && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Salvo com sucesso!
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Close Button Footer */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedDay(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Concluir e Voltar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
