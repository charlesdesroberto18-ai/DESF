import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, CreditCard, Sparkles, AlertCircle, Trash2, Edit3, Copy, X, Calendar } from 'lucide-react';
import { FixedExpense, CustomCategory } from '../types';

export const DEFAULT_ACCOUNT_CATEGORIES = ['Moradia', 'Alimentação', 'Saúde', 'Lazer', 'Assinaturas', 'Serviços / Contas', 'Transporte', 'Educação', 'Outros'];
const MAX_MONEY_VALUE = 999_999_999.99;

interface FixedExpensesTabProps {
  fixedExpenses: FixedExpense[];
  onUpdateFixedExpense: (id: string, name: string, value: number, dueDate?: string, category?: string) => void;
  onToggleFixedExpensePaid: (id: string) => void;
  onAddFixedExpense: (name: string, value: number, dueDate?: string, category?: string) => void;
  onDeleteFixedExpense: (id: string) => void;
  onDuplicateFixedExpenseToNextMonth: (id: string) => void;
  currentMonthName: string;
  currentYear: number;
  accountCategories: CustomCategory[];
}

export default function FixedExpensesTab({
  fixedExpenses,
  onUpdateFixedExpense,
  onToggleFixedExpensePaid,
  onAddFixedExpense,
  onDeleteFixedExpense,
  onDuplicateFixedExpenseToNextMonth,
  currentMonthName,
  currentYear,
  accountCategories
}: FixedExpensesTabProps) {
  const [newName, setNewName] = React.useState('');
  const [newValue, setNewValue] = React.useState('');
  const [dueDay, setDueDay] = React.useState('');
  const [category, setCategory] = React.useState('Moradia');
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [validationError, setValidationError] = React.useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDueDay, setEditDueDay] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Duplication notification toast
  const [duplicateMessage, setDuplicateMessage] = useState('');

  const totalFixed = fixedExpenses.reduce((sum, e) => sum + e.value, 0);
  const totalPaid = fixedExpenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.value, 0);
  const totalUnpaid = totalFixed - totalPaid;
  const percentPaid = totalFixed > 0 ? Math.round((totalPaid / totalFixed) * 100) : 0;

  const MONTH_NAMES = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];
  const monthIdx = MONTH_NAMES.indexOf(currentMonthName.toUpperCase());
  const monthNumber = monthIdx !== -1 ? monthIdx + 1 : 1;
  const year = currentYear || 2026;
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const normalizeDueDay = (dayText: string) => Math.min(daysInMonth, Math.max(1, Number(dayText)));

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setValidationError('Por favor, digite o nome da conta.');
      return;
    }
    const val = Number(newValue);
    if (!Number.isFinite(val) || val <= 0 || val > MAX_MONEY_VALUE) {
      setValidationError('Informe um valor entre R$ 0,01 e R$ 999.999.999,99.');
      return;
    }
    const dueDateStr = dueDay ? `${year}-${String(monthNumber).padStart(2, '0')}-${String(normalizeDueDay(dueDay)).padStart(2, '0')}` : undefined;
    onAddFixedExpense(newName.trim(), Math.round(val * 100) / 100, dueDateStr, category);
    setNewName('');
    setNewValue('');
    setDueDay('');
    setCategory('Moradia');
    setShowAddForm(false);
    setValidationError('');
  };

  const startEditing = (exp: FixedExpense) => {
    setEditingId(exp.id);
    setEditName(exp.name);
    setEditValue(exp.value.toString());
    setEditCategory(exp.category || '');
    if (exp.dueDate) {
      const parts = exp.dueDate.split('-');
      if (parts.length === 3) {
        setEditDueDay(parseInt(parts[2]).toString());
      } else {
        setEditDueDay('');
      }
    } else {
      setEditDueDay('');
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    const val = Number(editValue);
    if (!Number.isFinite(val) || val < 0 || val > MAX_MONEY_VALUE) return;

    const dueDateStr = editDueDay ? `${year}-${String(monthNumber).padStart(2, '0')}-${String(normalizeDueDay(editDueDay)).padStart(2, '0')}` : undefined;
    onUpdateFixedExpense(id, editName.trim(), Math.round(val * 100) / 100, dueDateStr, editCategory);
    setEditingId(null);
  };

  const handleDuplicateClick = (exp: FixedExpense) => {
    onDuplicateFixedExpenseToNextMonth(exp.id);
    setDuplicateMessage(`✓ "${exp.name}" copiada para o próximo mês!`);
    setTimeout(() => setDuplicateMessage(''), 4000);
  };

  return (
    <div className="space-y-6" id="fixed_expenses_tab_container">
      {/* Top Banner with Progress */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6" id="fixed_expenses_banner">
        <div>
          <span className="text-rose-100/90 text-xs font-bold uppercase tracking-widest block mb-1">Contas Fixas do Mês</span>
          <h2 className="privacy-value font-display text-3xl font-bold">
            R$ {totalFixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <div className="text-rose-100 text-xs mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 bg-emerald-500/30 p-0.5 rounded-full" />
              Pago: <strong className="privacy-value">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-300" />
              Pendente: <strong className="privacy-value">R$ {totalUnpaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>
        </div>

        {/* Progress Circular Gauge or Info */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center bg-white/10 rounded-full">
            <svg className="absolute w-full h-full" viewBox="0 0 36 36">
              <path
                className="text-white/20"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <motion.path
                className="text-white"
                strokeWidth="3.5"
                strokeDasharray={`${percentPaid}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8 }}
              />
            </svg>
            <span className="font-display text-xs font-bold font-mono">{percentPaid}%</span>
          </div>

          <button
            id="toggle_add_fixed_expense_form_btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-sm cursor-pointer shrink-0"
          >
            Nova Conta
          </button>
        </div>
      </div>

      {/* Duplicate Success Message */}
      <AnimatePresence>
        {duplicateMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between"
            id="duplicate_toast"
          >
            <span>{duplicateMessage}</span>
            <button onClick={() => setDuplicateMessage('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ledger list of accounts */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm" id="fixed_expenses_list_container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-slate-800 text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-rose-500" />
              Controle de Pagamentos
            </h3>
            <span className="text-xs text-slate-400 font-medium">Contas e Despesas Fixas em {currentMonthName}</span>
          </div>

          <div className="space-y-2.5">
            {fixedExpenses.length > 0 ? (
              fixedExpenses.map((exp) => {
                const isEditing = editingId === exp.id;

                return (
                  <div
                    key={exp.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      exp.isPaid
                        ? 'bg-emerald-50/30 border-emerald-100/60 shadow-sm shadow-emerald-50/20'
                        : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Paid / Unpaid Button Checkbox */}
                      <button
                        onClick={() => onToggleFixedExpensePaid(exp.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer border shrink-0 ${
                          exp.isPaid
                            ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                            : 'border-slate-300 bg-white hover:border-rose-400 text-transparent'
                        }`}
                        title={exp.isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                      >
                        <Check className="w-4 h-4 stroke-[3.5]" />
                      </button>

                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row gap-2 w-full pr-4">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-white border border-slate-200 focus:border-rose-500 rounded-lg text-xs font-semibold p-1.5 outline-none text-slate-700 flex-1"
                            placeholder="Nome do Compromisso"
                          />
                          <div className="relative w-28 shrink-0">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={MAX_MONEY_VALUE}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="pl-7 pr-2 py-1.5 w-full bg-white border border-slate-200 focus:border-rose-500 rounded-lg text-xs font-semibold text-slate-800 outline-none text-right font-mono"
                              placeholder="0,00"
                            />
                          </div>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="bg-white border border-slate-200 focus:border-rose-500 rounded-lg text-xs font-semibold p-1.5 outline-none text-slate-700 w-32 shrink-0 cursor-pointer"
                          >
                            <option value="">Sem Categoria</option>
                            {DEFAULT_ACCOUNT_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            {accountCategories.map((cat) => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                          </select>
                          <select
                            value={editDueDay}
                            onChange={(e) => setEditDueDay(e.target.value)}
                            className="bg-white border border-slate-200 focus:border-rose-500 rounded-lg text-xs font-semibold p-1.5 outline-none text-slate-700 w-28 shrink-0 cursor-pointer"
                          >
                            <option value="">Sem venc.</option>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                              <option key={day} value={day}>Dia {day}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-semibold transition-colors block ${exp.isPaid ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                              {exp.name}
                            </span>
                            {exp.dueDate && (
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                exp.isPaid 
                                  ? 'bg-slate-100 text-slate-400 border-slate-200' 
                                  : 'bg-rose-50 text-rose-600 border-rose-100/80'
                              }`}>
                                <Calendar className="w-2.5 h-2.5" />
                                Vencimento: Dia {exp.dueDate.split('-')[2]}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium font-mono flex flex-wrap items-center gap-1.5 mt-1">
                            <span>Fixo mensal — {exp.isPaid ? '✓ Pago' : '✗ Pendente'}</span>
                            {exp.category && (() => {
                              const match = accountCategories.find(c => c.name === exp.category);
                              return (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.2 rounded font-sans text-[9px] font-bold uppercase tracking-wider">
                                    {exp.category}
                                  </span>
                                  {match?.note && (
                                    <span className="text-slate-400 font-sans text-[10px] italic">
                                      ({match.note})
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {!isEditing && (
                        <div className="text-right mr-2 font-mono font-bold text-slate-700 text-xs">
                          R$ {exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      )}

                      {isEditing ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(exp.id)}
                            className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all cursor-pointer"
                            title="Salvar alteração"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Copy to Next Month Button */}
                          <button
                            onClick={() => handleDuplicateClick(exp)}
                            className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                            title="Duplicar para o Próximo Mês"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => startEditing(exp)}
                            className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="Editar conta fixa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Remove Button */}
                          <button
                            onClick={() => onDeleteFixedExpense(exp.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Excluir conta fixa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                Nenhuma conta fixa cadastrada neste mês.
              </div>
            )}
          </div>
        </div>

        {/* Adicionar Nova Conta Fixa form */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-fit" id="new_fixed_expense_form_card">
          <h3 className="font-display font-semibold text-slate-800 text-base mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Nova Conta Fixa
          </h3>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nome do Compromisso</label>
              <input
                type="text"
                required
                placeholder="Ex: Luz, Água, Gasolina Fixo"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Valor Mensal Estimado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={MAX_MONEY_VALUE}
                  required
                  placeholder="0,00"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg text-xs py-2 pl-8 pr-3 font-semibold outline-none text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Categoria da Conta</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 cursor-pointer"
              >
                {DEFAULT_ACCOUNT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                {accountCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Dia do Vencimento (Opcional)</label>
              <select
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 cursor-pointer"
              >
                <option value="">Sem data de vencimento</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>Dia {day}</option>
                ))}
              </select>
            </div>

            {validationError && (
              <div className="flex items-center gap-1.5 text-rose-600 text-[10px] font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{validationError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Adicionar às Contas Fixas
            </button>
          </form>

          {/* Quick tips about fixed expenses */}
          <div className="mt-5 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            <strong className="font-semibold text-slate-700 block mb-1">Dica de Finanças:</strong>
            As contas fixas representam sua estrutura básica de vida. Duplique-as para os próximos meses para planejar seu orçamento futuro com facilidade!
          </div>
        </div>
      </div>
    </div>
  );
}
