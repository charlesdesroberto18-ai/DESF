import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  PiggyBank,
  Target,
  Percent,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  StickyNote,
  Check,
  AlertCircle,
  HelpCircle,
  ShoppingCart
} from 'lucide-react';
import { FixedExpense, VariableExpense, SavingGoal, Income } from '../types';

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
  onUpdateObservations
}: FinancialChartsProps) {
  const despesasTotais = fixedTotal + variableTotal;
  const totalOutWithCaixinhas = despesasTotais + caixinhasTotal;
  const balance = totalIn - totalOutWithCaixinhas;

  // KPIs Calculations
  const totalMetaTarget = savingGoals.reduce((sum, g) => sum + g.target, 0);
  const totalMetaRestante = savingGoals.reduce((sum, g) => sum + Math.max(0, g.target - g.current), 0);
  const percentMetaConcluida = totalMetaTarget > 0 ? Math.round((caixinhasTotal / totalMetaTarget) * 100) : 0;

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

    const val = parseFloat(valueInput);
    if (isNaN(val) || val <= 0) {
      setModalError('Por favor, informe um valor maior que zero.');
      return;
    }

    if (quickType === 'income') {
      const weekNum = Math.min(5, Math.ceil(selectedDay / 7)) as 1 | 2 | 3 | 4 | 5;
      onAddIncome(desc.trim(), val, categoryInput, selectedDateString, weekNum);
    } else {
      onAddVariableExpense(desc.trim(), categoryInput, val, selectedDateString, isPaidInput);
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
    
    const incSum = dayIncs.reduce((sum, item) => sum + item.value, 0);
    const expSum = dayVars.reduce((sum, item) => sum + item.value, 0);
    const dayObs = observations[dateString] || '';

    const todayObj = new Date();
    const isToday = todayObj.getFullYear() === year && (todayObj.getMonth() + 1) === monthNumber && todayObj.getDate() === d;

    calendarCells.push({
      type: 'day',
      day: d,
      dateString,
      isToday,
      incomesSum: incSum,
      expensesSum: expSum,
      hasObservation: dayObs.trim().length > 0,
      key: `day-${d}`
    });
  }

  return (
    <div className="space-y-6" id="dashboard_tab_panel">
      
      {/* 6 Indicadores Financeiros do Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5" id="indicators_grid">
        {/* 1. Receita Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between" id="indicator_revenue">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receita Total</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 font-mono">
              R$ {totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-emerald-600 font-medium mt-1 block">Tudo que entrou no mês</span>
          </div>
        </div>

        {/* 2. Despesas Totais */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between" id="indicator_total_expenses">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Despesas Totais</span>
            <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 font-mono">
              R$ {despesasTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-rose-500 font-medium mt-1 block">Fixas + Variáveis</span>
          </div>
        </div>

        {/* 3. Saldo Atual */}
        <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between ${
          balance >= 0 ? 'bg-white border-slate-100' : 'bg-rose-50/50 border-rose-200'
        }`} id="indicator_current_balance">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Atual</span>
            <div className={`p-1.5 rounded-lg ${balance >= 0 ? 'bg-teal-50 text-teal-600' : 'bg-rose-100 text-rose-600'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-sm font-bold font-mono ${balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-slate-400 font-medium mt-1 block">Saldo final livre</span>
          </div>
        </div>

        {/* 4. Economia do Mês */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between" id="indicator_economy">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Economia (Mês)</span>
            <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 font-mono">
              R$ {caixinhasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-teal-600 font-medium mt-1 block">Guardado nas Caixinhas</span>
          </div>
        </div>

        {/* 5. Restante para a Meta */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between" id="indicator_remaining_goal">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Falta para Meta</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 font-mono">
              R$ {totalMetaRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] text-amber-600 font-medium mt-1 block">Para atingir as metas</span>
          </div>
        </div>

        {/* 6. Percentual da Meta */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between" id="indicator_goal_percentage">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta Concluída</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 font-mono">
              {percentMetaConcluida}%
            </div>
            <span className="text-[9px] text-indigo-500 font-medium mt-1 block">Progresso total</span>
          </div>
        </div>
      </div>

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

              return (
                <div
                  key={cell.key}
                  onClick={() => setSelectedDay(cell.day!)}
                  className={`bg-white min-h-[72px] md:min-h-[90px] p-2 hover:bg-slate-50/70 transition-all cursor-pointer flex flex-col justify-between group relative ${
                    cell.isToday ? 'ring-2 ring-teal-500/25 bg-teal-50/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      cell.isToday 
                        ? 'bg-teal-600 text-white w-5 h-5 rounded-full flex items-center justify-center' 
                        : 'text-slate-700 group-hover:text-slate-900'
                    }`}>
                      {cell.day}
                    </span>

                    {hasObs && (
                      <StickyNote className="w-3.5 h-3.5 text-amber-500" title="Possui observação" />
                    )}
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
                </div>
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
              className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto"
              id="day_modal_box"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <div>
                    <h3 className="font-display font-bold text-slate-800 text-lg">
                      Movimentações de {selectedDay} de {currentMonthName.toLowerCase()}
                    </h3>
                    <p className="text-xs text-slate-400">Lançamentos e observações rápidos para esta data específica.</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
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
