import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, DollarSign, Sparkles, Calendar, AlertCircle, Trash2, Edit3, Tag, CalendarDays, Check } from 'lucide-react';
import { Income } from '../types';

interface IncomeTabProps {
  incomes: Income[];
  onAddIncome: (name: string, value: number, category: string, date: string, week: 1 | 2 | 3 | 4 | 5) => void;
  onUpdateIncome: (id: string, name: string, value: number, category: string, date: string, week: 1 | 2 | 3 | 4 | 5) => void;
  onDeleteIncome: (id: string) => void;
  currentYear: number;
  currentMonthName: string;
}

const CATEGORIES = ['Salário', 'Freelance', 'Venda', 'Extra', 'Garçom', 'Personalizada'];

const MAX_MONEY_VALUE = 999_999_999.99;
const MONTH_INDEX_BY_NAME: Record<string, number> = {
  JANEIRO: 0,
  FEVEREIRO: 1,
  MARCO: 2,
  ABRIL: 3,
  MAIO: 4,
  JUNHO: 5,
  JULHO: 6,
  AGOSTO: 7,
  SETEMBRO: 8,
  OUTUBRO: 9,
  NOVEMBRO: 10,
  DEZEMBRO: 11
};

const getCompetenceDates = (monthName: string, year: number) => {
  const normalizedMonth = monthName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  const monthIndex = MONTH_INDEX_BY_NAME[normalizedMonth] ?? 0;
  const safeYear = Number.isInteger(year) && year >= 1900 && year <= 9999
    ? year
    : new Date().getFullYear();
  const month = String(monthIndex + 1).padStart(2, '0');
  const lastDay = String(new Date(safeYear, monthIndex + 1, 0).getDate()).padStart(2, '0');
  const minDate = `${safeYear}-${month}-01`;
  const maxDate = `${safeYear}-${month}-${lastDay}`;
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return {
    minDate,
    maxDate,
    defaultDate: todayDate >= minDate && todayDate <= maxDate ? todayDate : minDate
  };
};

export default function IncomeTab({
  incomes,
  onAddIncome,
  onUpdateIncome,
  onDeleteIncome,
  currentYear,
  currentMonthName
}: IncomeTabProps) {
  const { minDate, maxDate, defaultDate } = getCompetenceDates(currentMonthName, currentYear);

  // Add form states
  const [activeAddFormWeek, setActiveAddFormWeek] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [validationError, setValidationError] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editWeek, setEditWeek] = useState<1 | 2 | 3 | 4 | 5>(1);

  useEffect(() => {
    setDate((currentDate) => (
      currentDate >= minDate && currentDate <= maxDate ? currentDate : defaultDate
    ));
  }, [defaultDate, maxDate, minDate]);

  const totalIn = incomes.reduce((sum, i) => sum + i.value, 0);

  // Group incomes by week
  const getIncomesForWeek = (weekNum: number) => {
    return incomes.filter(i => i.week === weekNum);
  };

  const getWeekTotal = (weekNum: number) => {
    return getIncomesForWeek(weekNum).reduce((sum, i) => sum + i.value, 0);
  };

  // Group by Category for summary
  const incomesByCategory = incomes.reduce((acc, curr) => {
    const cat = curr.category || 'Outros';
    acc[cat] = (acc[cat] || 0) + curr.value;
    return acc;
  }, {} as Record<string, number>);

  const handleAddSubmit = (e: React.FormEvent, weekNum: number) => {
    e.preventDefault();
    if (!description.trim()) {
      setValidationError('Por favor, informe uma descrição.');
      return;
    }
    const val = Number(value);
    if (!Number.isFinite(val) || val <= 0 || val > MAX_MONEY_VALUE) {
      setValidationError('Informe um valor entre R$ 0,01 e R$ 999.999.999,99.');
      return;
    }
    if (!date || date < minDate || date > maxDate) {
      setValidationError(`Selecione uma data entre ${minDate} e ${maxDate}.`);
      return;
    }

    const finalCategory = category === 'Personalizada' ? customCategory.trim() : category;
    if (category === 'Personalizada' && !customCategory.trim()) {
      setValidationError('Por favor, digite a categoria personalizada.');
      return;
    }

    onAddIncome(description.trim(), Math.round(val * 100) / 100, finalCategory || 'Receita', date, weekNum as any);
    
    // Clear states
    setDescription('');
    setValue('');
    setCategory(CATEGORIES[0]);
    setCustomCategory('');
    setActiveAddFormWeek(null);
    setValidationError('');
  };

  const startEditing = (inc: Income) => {
    setEditingId(inc.id);
    setEditDescription(inc.name);
    setEditValue(inc.value.toString());
    
    const isStandardCat = CATEGORIES.includes(inc.category);
    if (isStandardCat && inc.category !== 'Personalizada') {
      setEditCategory(inc.category);
      setEditCustomCategory('');
    } else {
      setEditCategory('Personalizada');
      setEditCustomCategory(inc.category);
    }
    setEditDate(inc.date);
    setEditWeek(inc.week);
  };

  const handleEditSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editDescription.trim()) return;
    const val = Number(editValue);
    if (!Number.isFinite(val) || val <= 0 || val > MAX_MONEY_VALUE) return;
    if (!editDate || editDate < minDate || editDate > maxDate) return;

    const finalCategory = editCategory === 'Personalizada' ? editCustomCategory.trim() : editCategory;
    
    onUpdateIncome(id, editDescription.trim(), Math.round(val * 100) / 100, finalCategory || 'Receita', editDate, editWeek);
    setEditingId(null);
  };

  const formatDateString = (dtStr: string) => {
    try {
      const parts = dtStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dtStr;
    } catch {
      return dtStr;
    }
  };

  return (
    <div className="space-y-6" id="income_tab_container">
      {/* Top Banner Summary */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6" id="income_overview_banner">
        <div>
          <span className="text-emerald-100/90 text-xs font-bold uppercase tracking-widest block mb-1">Total de Entradas ({currentMonthName})</span>
          <h2 className="privacy-value font-display text-3xl font-bold">
            R$ {totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-emerald-100 text-xs mt-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            Organizado de forma semanal em até 5 semanas, com categorias flexíveis.
          </p>
        </div>
        <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 text-right">
          <span className="text-[10px] text-emerald-100/80 block uppercase font-bold">Total Recebido</span>
          <span className="font-display text-lg font-bold font-mono">
            {incomes.length} lançamentos
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weeks list from Week 1 to 5 */}
        <div className="lg:col-span-2 space-y-4" id="weeks_ledger_container">
          <h3 className="font-display font-semibold text-slate-800 text-base mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            Receitas por Semana (S1 a S5)
          </h3>

          {[1, 2, 3, 4, 5].map((weekNum) => {
            const weekIncomes = getIncomesForWeek(weekNum);
            const weekTotal = getWeekTotal(weekNum);
            const isAddingInThisWeek = activeAddFormWeek === weekNum;

            return (
              <div
                key={weekNum}
                id={`week_section_${weekNum}`}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                {/* Week Summary Bar */}
                <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-display font-bold text-slate-700 text-sm">Semana {weekNum}</span>
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                      {weekIncomes.length} {weekIncomes.length === 1 ? 'receita' : 'receitas'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl">
                      R$ {weekTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>

                    <button
                      onClick={() => {
                        if (isAddingInThisWeek) {
                          setActiveAddFormWeek(null);
                        } else {
                          setActiveAddFormWeek(weekNum);
                          setValidationError('');
                          setDate(defaultDate);
                        }
                      }}
                      className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 p-1.5 rounded-lg text-slate-500 transition-colors cursor-pointer"
                      title="Adicionar receita nesta semana"
                    >
                      <Plus className={`w-4 h-4 transition-transform duration-200 ${isAddingInThisWeek ? 'rotate-45 text-rose-500 hover:text-rose-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Adding income form inside the specific week */}
                {isAddingInThisWeek && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-slate-50/50 border-b border-slate-100"
                  >
                    <form onSubmit={(e) => handleAddSubmit(e, weekNum)} className="space-y-3.5">
                      <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        Nova Receita na Semana {weekNum}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descrição</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Renda de Garçom fds, Extra venda"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs py-1.5 px-3 font-semibold outline-none text-slate-700"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Valor</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={MAX_MONEY_VALUE}
                              required
                              placeholder="0,00"
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                              className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs py-1.5 pl-7 pr-2 font-semibold outline-none text-slate-700 font-mono text-right"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Categoria</label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs py-1.5 px-2 font-semibold outline-none text-slate-700 cursor-pointer"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        {category === 'Personalizada' && (
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Qual Categoria?</label>
                            <input
                              type="text"
                              required
                              placeholder="Digite a categoria"
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs py-1.5 px-3 font-semibold outline-none text-slate-700"
                            />
                          </div>
                        )}

                        <div className={category === 'Personalizada' ? '' : 'sm:col-span-2'}>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Data</label>
                          <input
                            type="date"
                            required
                            min={minDate}
                            max={maxDate}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs py-1.5 px-3 font-semibold outline-none text-slate-700 font-mono cursor-pointer"
                          />
                        </div>
                      </div>

                      {validationError && (
                        <div className="flex items-center gap-1.5 text-rose-600 text-[10px] font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{validationError}</span>
                        </div>
                      )}

                      <div className="flex gap-2 justify-end">
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1.5 px-3.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Adicionar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAddFormWeek(null);
                            setValidationError('');
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold text-xs py-1.5 px-3.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* List of Incomes for this Week */}
                <div className="p-2 space-y-1">
                  {weekIncomes.length > 0 ? (
                    weekIncomes.map((inc) => {
                      const isEditing = editingId === inc.id;

                      if (isEditing) {
                        return (
                          <form
                            key={inc.id}
                            onSubmit={(e) => handleEditSubmit(e, inc.id)}
                            className="p-3 bg-teal-50/30 rounded-xl border border-teal-200 space-y-3"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <div className="sm:col-span-2">
                                <input
                                  type="text"
                                  required
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-md text-xs py-1 px-2 font-semibold text-slate-700 outline-none focus:border-teal-500"
                                />
                              </div>
                              <div>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={MAX_MONEY_VALUE}
                                    required
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-md text-xs py-1 pl-6 pr-1 font-semibold text-slate-700 outline-none focus:border-teal-500 font-mono text-right"
                                  />
                                </div>
                              </div>
                              <div>
                                <input
                                  type="date"
                                  required
                                  min={minDate}
                                  max={maxDate}
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-md text-xs py-1 px-2 font-semibold text-slate-700 outline-none focus:border-teal-500 font-mono"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <select
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-md text-xs py-1 px-2 font-semibold text-slate-700 outline-none focus:border-teal-500"
                                >
                                  {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>

                              {editCategory === 'Personalizada' && (
                                <div>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Nome da categoria"
                                    value={editCustomCategory}
                                    onChange={(e) => setEditCustomCategory(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-md text-xs py-1 px-2 font-semibold text-slate-700 outline-none focus:border-teal-500"
                                  />
                                </div>
                              )}

                              <div className="flex gap-1 justify-end ml-auto sm:col-span-1">
                                <button
                                  type="submit"
                                  className="bg-teal-600 text-white p-1 rounded-md hover:bg-teal-700 cursor-pointer"
                                  title="Salvar"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="bg-slate-200 text-slate-600 p-1 rounded-md hover:bg-slate-300 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </form>
                        );
                      }

                      return (
                        <div
                          key={inc.id}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100/50">
                              <Tag className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">{inc.name}</span>
                                <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                  {inc.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span className="font-mono flex items-center gap-0.5">
                                  <CalendarDays className="w-3 h-3 text-slate-300" />
                                  {formatDateString(inc.date)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-emerald-600">
                              + R$ {inc.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            
                            <button
                              onClick={() => startEditing(inc)}
                              className="p-1 text-slate-300 hover:text-slate-600 rounded-md transition-colors"
                              title="Editar receita"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onDeleteIncome(inc.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 rounded-md transition-colors"
                              title="Deletar receita"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                      Nenhuma receita registrada na semana {weekNum}.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Categories Breakdown & Quick Tips */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm" id="categories_breakdown_card">
            <h3 className="font-display font-semibold text-slate-800 text-base mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-500" />
              Por Categoria
            </h3>

            <div className="space-y-3">
              {Object.keys(incomesByCategory).length > 0 ? (
                Object.entries(incomesByCategory).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between items-center p-2 rounded-xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 transition-colors">
                    <span className="text-xs font-semibold text-slate-600">{cat}</span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Sem dados de categorias.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-xs text-slate-500 leading-relaxed space-y-3" id="quick_finances_tips_card">
            <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Rendimento Semanal
            </h4>
            <p>
              Charles, separar seus ganhos semana a semana ajuda você a entender o fluxo dos seus bicos e salário regular.
            </p>
            <p className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/40 font-medium">
              💡 <strong>Dica:</strong> Se você trabalhar em bicos como garçom, registre os recebimentos de cada diária diretamente na semana correspondente para ter relatórios precisos do seu faturamento real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
