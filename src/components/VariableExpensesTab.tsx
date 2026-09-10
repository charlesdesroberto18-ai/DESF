import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Tag, Calendar, Search, Filter, AlertCircle, ShoppingCart, CheckCircle, Clock, FolderPlus, Sliders } from 'lucide-react';
import { CustomCategory, VariableExpense } from '../types';

interface VariableExpensesTabProps {
  variableExpenses: VariableExpense[];
  onAddVariableExpense: (description: string, category: string, value: number, date: string, isPaid: boolean) => void;
  onDeleteVariableExpense: (id: string) => void;
  onToggleVariableExpensePaid: (id: string) => void;
  customCategories: CustomCategory[];
  onAddCustomCategory: (name: string, note?: string) => void;
  onDeleteCustomCategory: (id: string) => void;
  currentMonthName: string;
  currentYear: number;
}

const CATEGORIES = [
  'Alimentação',
  'Transporte / Gasolina',
  'Lazer / Delivery',
  'Saúde / Farmácia',
  'Roupas / Compras',
  'Educação / Cursos',
  'Assinaturas / Serviços',
  'Outros'
];

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

export default function VariableExpensesTab({
  variableExpenses,
  onAddVariableExpense,
  onDeleteVariableExpense,
  onToggleVariableExpensePaid,
  customCategories,
  onAddCustomCategory,
  onDeleteCustomCategory,
  currentMonthName,
  currentYear
}: VariableExpensesTabProps) {
  const { minDate, maxDate, defaultDate } = getCompetenceDates(currentMonthName, currentYear);
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState(CATEGORIES[0]);
  const [value, setValue] = React.useState('');
  const [isPaid, setIsPaid] = React.useState(true); // default to true (Pago)
  const [date, setDate] = React.useState(defaultDate);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState('Todas');
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState('Todas'); // Todas, Pago, Pendente
  const [validationError, setValidationError] = React.useState('');

  const [newCatName, setNewCatName] = React.useState('');
  const [newCatNote, setNewCatNote] = React.useState('');
  const [catValidationError, setCatValidationError] = React.useState('');

  React.useEffect(() => {
    setDate((currentDate) => (
      currentDate >= minDate && currentDate <= maxDate ? currentDate : defaultDate
    ));
  }, [defaultDate, maxDate, minDate]);

  const allCategories = React.useMemo(() => {
    return [...CATEGORIES, ...customCategories.map(c => c.name)];
  }, [customCategories]);

  const handleAddSubmit = (e: React.FormEvent) => {
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

    onAddVariableExpense(description, category, Math.round(val * 100) / 100, date, isPaid);
    setDescription('');
    setValue('');
    setValidationError('');
  };

  const handleAddCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCatValidationError('Por favor, informe o nome da categoria.');
      return;
    }
    const normalizedNew = newCatName.trim().toLowerCase();
    
    // Check if it already exists in defaults or customs
    const existsInStandard = CATEGORIES.some(cat => cat.toLowerCase() === normalizedNew);
    const existsInCustom = customCategories.some(cat => cat.name.toLowerCase() === normalizedNew);
    
    if (existsInStandard || existsInCustom) {
      setCatValidationError('Esta categoria já existe (padrão ou personalizada).');
      return;
    }

    onAddCustomCategory(newCatName.trim(), newCatNote.trim() || undefined);
    setNewCatName('');
    setNewCatNote('');
    setCatValidationError('');
  };

  // Filter variable expenses based on search, category and status filter
  const filteredExpenses = variableExpenses.filter((item) => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'Todas' || item.category === selectedCategoryFilter;
    
    let matchesStatus = true;
    if (selectedStatusFilter === 'Pago') {
      matchesStatus = item.isPaid === true;
    } else if (selectedStatusFilter === 'Pendente') {
      matchesStatus = item.isPaid === false;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // sort newest first

  const totalFiltered = filteredExpenses.reduce((sum, item) => sum + item.value, 0);
  const totalAll = variableExpenses.reduce((sum, item) => sum + item.value, 0);
  const totalPaid = variableExpenses.filter(i => i.isPaid).reduce((sum, item) => sum + item.value, 0);
  const totalUnpaid = totalAll - totalPaid;

  // Helper to format date nicely
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
    <div className="space-y-6" id="variable_expenses_tab_container">
      {/* Top Banner Summary */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6" id="variable_expenses_banner">
        <div>
          <span className="text-pink-100/90 text-xs font-bold uppercase tracking-widest block mb-1">Gastos Variáveis do Dia a Dia</span>
          <h2 className="privacy-value font-display text-3xl font-bold">
            R$ {totalAll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <div className="text-pink-100 text-xs mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 bg-emerald-500/30 p-0.5 rounded-full" />
              Pago: <strong className="privacy-value">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 bg-amber-500/30 p-0.5 rounded-full" />
              Pendente: <strong className="privacy-value">R$ {totalUnpaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>
        </div>
        <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 text-right">
          <span className="text-[10px] text-pink-100/80 block uppercase font-bold">Lançamentos</span>
          <span className="font-display text-lg font-bold font-mono">
            {variableExpenses.length} itens registrados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ledger view with search & filters */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col" id="expenses_ledger_box">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h3 className="font-display font-semibold text-slate-800 text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-500" />
              Histórico de Gastos Variáveis
            </h3>

            {/* Quick stats on filtered list */}
            {selectedCategoryFilter !== 'Todas' || selectedStatusFilter !== 'Todas' || searchTerm ? (
              <span className="text-xs bg-slate-50 border border-slate-200/60 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
                Filtrado: <strong className="font-bold text-rose-600 font-mono">R$ {totalFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </span>
            ) : null}
          </div>

          {/* Search and Category Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="relative md:col-span-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar gasto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 rounded-xl text-xs font-semibold outline-none transition-all text-slate-700"
              />
            </div>

            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 rounded-xl text-xs font-semibold outline-none appearance-none transition-all text-slate-700 cursor-pointer"
              >
                <option value="Todas">Categorias: Todas</option>
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <CheckCircle className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 rounded-xl text-xs font-semibold outline-none appearance-none transition-all text-slate-700 cursor-pointer"
              >
                <option value="Todas">Status: Todos</option>
                <option value="Pago">Apenas Pago</option>
                <option value="Pendente">Apenas Pendente</option>
              </select>
            </div>
          </div>

          {/* Ledger List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 flex-1">
            <AnimatePresence initial={false}>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100/50 text-rose-500">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{item.description}</span>
                          
                          {/* Toggle Status badge on click */}
                          <button
                            onClick={() => onToggleVariableExpensePaid(item.id)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                              item.isPaid
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                            }`}
                            title="Clique para alternar status Pago / Pendente"
                          >
                            {item.isPaid ? 'Pago' : 'Pendente'}
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                            {item.category}
                          </span>
                          {(() => {
                            const customCat = customCategories.find(c => c.name.toLowerCase() === item.category.toLowerCase());
                            return customCat?.note ? (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold max-w-[150px] truncate" title={customCat.note}>
                                  🏷️ {customCat.note}
                                </span>
                              </>
                            ) : null;
                          })()}
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-[10px] text-slate-400 font-mono font-medium">
                            {formatDateString(item.date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold font-mono text-rose-600">
                        - R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => onDeleteVariableExpense(item.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50/50 rounded-lg transition-colors cursor-pointer"
                        title="Deletar gasto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center justify-center gap-2.5">
                  <ShoppingCart className="w-10 h-10 text-slate-200 stroke-[1.5]" />
                  <span>Nenhum gasto correspondente encontrado neste filtro.</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Formulário e Categorias */}
        <div className="space-y-6">
          {/* Adicionar Novo Gasto Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-fit" id="new_variable_expense_form_card">
            <h3 className="font-display font-semibold text-slate-800 text-base mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-500" />
              Lançar Gasto Rápido
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pastel feira, Uber Dudinha"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg text-xs py-2 px-2.5 font-semibold outline-none text-slate-700 cursor-pointer"
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Valor</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={MAX_MONEY_VALUE}
                      required
                      placeholder="0,00"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg text-xs py-2 pl-7 pr-2 font-semibold outline-none text-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Data do Gasto</label>
                  <input
                    type="date"
                    required
                    min={minDate}
                    max={maxDate}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 font-mono cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                  <select
                    value={isPaid ? 'pago' : 'pendente'}
                    onChange={(e) => setIsPaid(e.target.value === 'pago')}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg text-xs py-2 px-2.5 font-semibold outline-none text-slate-700 cursor-pointer"
                  >
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
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
                Confirmar Lançamento
              </button>
            </form>

            {/* Quick presets to add variables */}
            <div className="mt-5 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">Exemplos rápidos:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onAddVariableExpense('Padaria / Café', 'Alimentação', 15.50, date, true);
                  }}
                  className="p-1.5 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200/50 text-[10px] text-slate-600 font-semibold rounded-lg text-left transition-colors cursor-pointer"
                >
                  ☕ Padaria: R$ 15,50
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAddVariableExpense('Farmácia de Rotina', 'Saúde / Farmácia', 45.00, date, true);
                  }}
                  className="p-1.5 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200/50 text-[10px] text-slate-600 font-semibold rounded-lg text-left transition-colors cursor-pointer"
                >
                  💊 Farmácia: R$ 45,00
                </button>
              </div>
            </div>
          </div>

          {/* Gerenciar Categorias Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-fit" id="manage_categories_card">
            <h3 className="font-display font-semibold text-slate-800 text-base mb-1 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-500" />
              Categorias Personalizadas
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mb-4">
              Crie novas categorias e atribua notas ou etiquetas personalizadas a elas.
            </p>

            <form onSubmit={handleAddCatSubmit} className="space-y-3.5 mb-5 pb-5 border-b border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pet, Presentes, Carro..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nota / Etiqueta</label>
                <input
                  type="text"
                  placeholder="Ex: Ração do Toddy, Consórcio, etc..."
                  value={newCatNote}
                  onChange={(e) => setNewCatNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700"
                />
              </div>

              {catValidationError && (
                <div className="flex items-center gap-1.5 text-rose-600 text-[10px] font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{catValidationError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Salvar Categoria
              </button>
            </form>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">Categorias Criadas:</span>
              {customCategories.length > 0 ? (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {customCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-bold text-slate-700 truncate">{cat.name}</span>
                        {cat.note && (
                          <span className="text-[9px] text-slate-400 font-medium truncate flex items-center gap-0.5">
                            <span className="text-slate-300">└─</span> {cat.note}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteCustomCategory(cat.id)}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Deletar categoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-[10px] font-medium">
                  Nenhuma categoria personalizada criada para este mês.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
