import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle,
  Edit3,
  Gift,
  HeartPulse,
  Map,
  PiggyBank,
  Plus,
  Shield,
  ShoppingBag,
  Target,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import { SavingGoal } from '../types';

interface SavingsTabProps {
  savingGoals: SavingGoal[];
  onAddTransactionToGoal: (id: string, amount: number) => void;
  onCreateGoal: (goal: Omit<SavingGoal, 'id' | 'current'>) => void;
  onUpdateGoal: (id: string, goal: Omit<SavingGoal, 'id' | 'current'>) => void;
  onDeleteGoal: (id: string) => void;
}

type GoalDraft = Omit<SavingGoal, 'id' | 'current'>;

const GOAL_SUGGESTIONS: Array<GoalDraft> = [
  { name: 'Reserva de emergência', target: 1000, description: 'Proteção para despesas inesperadas.', icon: 'shield' },
  { name: 'Viagem', target: 1500, description: 'Planejamento de passagens e hospedagem.', icon: 'map' },
  { name: 'Compras planejadas', target: 500, description: 'Compras importantes sem apertar o mês.', icon: 'shopping-bag' },
  { name: 'Saúde', target: 500, description: 'Consultas, exames e medicamentos.', icon: 'heart-pulse' },
  { name: 'Estudos', target: 800, description: 'Cursos, livros e formação profissional.', icon: 'book-open' },
  { name: 'Manutenção', target: 600, description: 'Casa, moto, carro ou equipamentos.', icon: 'wrench' },
  { name: 'Presentes', target: 300, description: 'Datas especiais com planejamento.', icon: 'gift' }
];

const ICONS = {
  shield: Shield,
  map: Map,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  'book-open': BookOpen,
  wrench: Wrench,
  gift: Gift,
  'piggy-bank': PiggyBank
};

const emptyDraft: GoalDraft = {
  name: '',
  target: 0,
  description: '',
  icon: 'piggy-bank'
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

export default function SavingsTab({
  savingGoals,
  onAddTransactionToGoal,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal
}: SavingsTabProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(savingGoals[0]?.id || null);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [draft, setDraft] = useState<GoalDraft>(emptyDraft);
  const [formError, setFormError] = useState('');
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  const activeGoal = savingGoals.find((goal) => goal.id === selectedGoalId) || savingGoals[0];
  const totalSaved = savingGoals.reduce((sum, goal) => sum + goal.current, 0);
  const totalTarget = savingGoals.reduce((sum, goal) => sum + goal.target, 0);
  const totalProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const deleteGoal = useMemo(
    () => savingGoals.find((goal) => goal.id === deleteGoalId),
    [deleteGoalId, savingGoals]
  );

  useEffect(() => {
    if (selectedGoalId && !savingGoals.some((goal) => goal.id === selectedGoalId)) {
      setSelectedGoalId(savingGoals[0]?.id || null);
    }
    if (!selectedGoalId && savingGoals[0]) setSelectedGoalId(savingGoals[0].id);
  }, [savingGoals, selectedGoalId]);

  const openCreate = (suggestion?: GoalDraft) => {
    setDraft(suggestion ? { ...suggestion } : { ...emptyDraft });
    setEditorMode('create');
    setFormError('');
  };

  const openEdit = (goal: SavingGoal) => {
    setDraft({ name: goal.name, target: goal.target, description: goal.description || '', icon: goal.icon || 'piggy-bank' });
    setSelectedGoalId(goal.id);
    setEditorMode('edit');
    setFormError('');
  };

  const closeEditor = () => {
    setEditorMode(null);
    setFormError('');
  };

  const handleSaveGoal = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description?.trim(),
      target: Number(draft.target)
    };
    if (!normalized.name) return setFormError('Informe um nome para a caixinha.');
    if (!Number.isFinite(normalized.target) || normalized.target <= 0) return setFormError('Informe uma meta maior que zero.');
    if ((normalized.description || '').length > 90) return setFormError('Use uma descrição de até 90 caracteres.');

    if (editorMode === 'edit' && activeGoal) {
      onUpdateGoal(activeGoal.id, normalized);
    } else {
      onCreateGoal(normalized);
    }
    closeEditor();
  };

  const handleTransaction = (type: 'deposit' | 'withdraw') => {
    if (!activeGoal) return;
    const amount = Number(transactionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedbackMsg('Informe um valor maior que zero.');
      return;
    }
    if (type === 'withdraw' && amount > activeGoal.current) {
      setFeedbackMsg('O valor do resgate é maior que o saldo desta caixinha.');
      return;
    }
    onAddTransactionToGoal(activeGoal.id, type === 'deposit' ? amount : -amount);
    setTransactionAmount('');
    setFeedbackMsg(type === 'deposit' ? 'Valor guardado com sucesso.' : 'Resgate registrado com sucesso.');
    window.setTimeout(() => setFeedbackMsg(''), 3500);
  };

  return (
    <div className="space-y-6" id="savings_tab_container">
      <section className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-5 sm:p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <span className="text-teal-100 text-xs font-bold uppercase tracking-widest">Guardado nas caixinhas</span>
            <h2 className="privacy-value font-display text-3xl font-bold mt-1">{formatCurrency(totalSaved)}</h2>
            <p className="text-teal-100 text-xs mt-1.5">Separe objetivos e acompanhe cada avanço com clareza.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 min-w-32">
              <span className="text-[10px] text-teal-100 uppercase font-bold block">Progresso geral</span>
              <strong className="text-lg font-mono">{totalProgress}%</strong>
            </div>
            <button
              type="button"
              onClick={() => openCreate()}
              className="bg-white text-teal-700 hover:bg-teal-50 font-bold text-xs py-3 px-4 rounded-xl flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Nova Caixinha
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="mb-4">
          <h3 className="font-display font-semibold text-slate-800">Comece com uma sugestão</h3>
          <p className="text-xs text-slate-500 mt-1">Escolha um modelo e personalize nome, meta, texto e ícone.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {GOAL_SUGGESTIONS.map((suggestion) => {
            const SuggestionIcon = ICONS[suggestion.icon as keyof typeof ICONS] || PiggyBank;
            return (
              <button
                key={suggestion.name}
                type="button"
                onClick={() => openCreate(suggestion)}
                className="shrink-0 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:border-teal-300 hover:bg-teal-50 text-xs font-semibold text-slate-700 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <SuggestionIcon className="w-4 h-4 text-teal-600" aria-hidden="true" />
                {suggestion.name}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4" aria-labelledby="goal-list-title">
          <div className="flex items-center justify-between">
            <h3 id="goal-list-title" className="font-display font-semibold text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-teal-600" aria-hidden="true" />
              Suas caixinhas
            </h3>
            <span className="text-xs text-slate-500">{savingGoals.length} {savingGoals.length === 1 ? 'ativa' : 'ativas'}</span>
          </div>

          {savingGoals.length === 0 ? (
            <div className="text-center bg-white rounded-2xl border border-dashed border-slate-200 p-10">
              <PiggyBank className="w-10 h-10 text-slate-300 mx-auto" aria-hidden="true" />
              <h4 className="font-bold text-slate-700 mt-3">Crie sua primeira caixinha</h4>
              <p className="text-xs text-slate-500 mt-1">Defina um objetivo para começar a guardar.</p>
              <button type="button" onClick={() => openCreate()} className="mt-4 bg-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl">Nova Caixinha</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savingGoals.map((goal) => {
                const GoalIcon = ICONS[goal.icon as keyof typeof ICONS] || PiggyBank;
                const isSelected = goal.id === activeGoal?.id;
                const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
                return (
                  <article key={goal.id} className={`rounded-2xl border bg-white shadow-sm transition-all ${isSelected ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-100'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedGoalId(goal.id)}
                      aria-pressed={isSelected}
                      aria-label={`${goal.name}. ${formatCurrency(goal.current)} guardados de ${formatCurrency(goal.target)}. ${percent}% concluído.`}
                      className="w-full p-5 text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100"><GoalIcon className="w-5 h-5 text-teal-600" aria-hidden="true" /></div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Guardado</span>
                          <strong className="text-base text-slate-800 font-mono whitespace-nowrap">{formatCurrency(goal.current)}</strong>
                        </div>
                      </div>
                      <h4 className="font-display font-bold text-slate-800 text-sm mt-3 two-line-clamp">{goal.name}</h4>
                      {goal.description && <p className="text-xs text-slate-500 mt-1 two-line-clamp min-h-8">{goal.description}</p>}
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1.5">
                          <span>Meta: {formatCurrency(goal.target)}</span><span>{percent}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden" aria-hidden="true">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className="h-full bg-teal-500 rounded-full" />
                        </div>
                      </div>
                    </button>
                    <div className="flex justify-end gap-1 px-4 pb-4">
                      <button type="button" onClick={() => openEdit(goal)} className="p-2 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg" aria-label={`Editar ${goal.name}`}><Edit3 className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setDeleteGoalId(goal.id)} disabled={goal.current > 0} title={goal.current > 0 ? 'Resgate o saldo antes de excluir' : 'Excluir caixinha'} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-35 disabled:cursor-not-allowed" aria-label={`Excluir ${goal.name}`}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-fit" aria-labelledby="transaction-title">
          <h3 id="transaction-title" className="font-display font-semibold text-slate-800 flex items-center gap-2"><PiggyBank className="w-5 h-5 text-teal-600" />Depósitos e resgates</h3>
          {activeGoal ? (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Caixinha selecionada</span>
                <strong className="text-sm text-slate-800 two-line-clamp">{activeGoal.name}</strong>
                <div className="flex justify-between mt-2 text-xs"><span className="text-slate-500">Saldo atual</span><strong className="font-mono text-teal-700">{formatCurrency(activeGoal.current)}</strong></div>
              </div>
              <label className="block"><span className="text-xs font-bold text-slate-500 uppercase">Valor</span><input type="number" min="0.01" step="0.01" value={transactionAmount} onChange={(event) => setTransactionAmount(event.target.value)} placeholder="0,00" className="mt-1.5 w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-lg text-sm py-2.5 px-3 font-semibold outline-none font-mono" /></label>
              <AnimatePresence>{feedbackMsg && <motion.div role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${feedbackMsg.includes('sucesso') ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'} border text-xs p-3 rounded-lg flex gap-2`}><CheckCircle className="w-4 h-4 shrink-0" />{feedbackMsg}</motion.div>}</AnimatePresence>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => handleTransaction('deposit')} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5"><ArrowUpRight className="w-4 h-4" />Guardar</button>
                <button type="button" onClick={() => handleTransaction('withdraw')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5"><ArrowDownLeft className="w-4 h-4" />Resgatar</button>
              </div>
              <div className="pt-3 border-t border-slate-100"><span className="text-[10px] text-slate-400 uppercase font-bold">Atalhos</span><div className="grid grid-cols-4 gap-2 mt-2">{[50, 100, 200, 500].map((amount) => <button key={amount} type="button" onClick={() => setTransactionAmount(String(amount))} className="bg-slate-50 hover:bg-teal-50 text-slate-600 text-[11px] font-bold py-2 rounded-lg border border-slate-200">{amount}</button>)}</div></div>
            </div>
          ) : <p className="text-center py-10 text-xs text-slate-400">Crie uma caixinha para começar.</p>}
        </section>
      </div>

      <AnimatePresence>
        {editorMode && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
            <motion.div role="dialog" aria-modal="true" aria-labelledby="goal-editor-title" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg p-6">
              <div className="flex items-center justify-between"><div><h3 id="goal-editor-title" className="font-display font-bold text-slate-800">{editorMode === 'create' ? 'Nova Caixinha' : 'Editar Caixinha'}</h3><p className="text-xs text-slate-500 mt-1">Use um objetivo claro e uma descrição curta.</p></div><button type="button" onClick={closeEditor} aria-label="Fechar" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button></div>
              <form onSubmit={handleSaveGoal} className="space-y-4 mt-5">
                <label className="block"><span className="text-xs font-bold text-slate-500">Nome</span><input autoFocus maxLength={45} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ex.: Reserva de emergência" className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500" /></label>
                <label className="block"><span className="text-xs font-bold text-slate-500">Meta</span><input type="number" min="0.01" step="0.01" value={draft.target || ''} onChange={(event) => setDraft({ ...draft, target: Number(event.target.value) })} placeholder="500,00" className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-teal-500" /></label>
                <label className="block"><span className="text-xs font-bold text-slate-500">Descrição curta <span className="font-normal text-slate-400">(opcional)</span></span><textarea maxLength={90} rows={2} value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Para que você quer guardar?" className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-500 resize-none" /><span className="text-[10px] text-slate-400 block text-right">{(draft.description || '').length}/90</span></label>
                <fieldset><legend className="text-xs font-bold text-slate-500 mb-2">Ícone</legend><div className="flex flex-wrap gap-2">{Object.entries(ICONS).map(([key, Icon]) => <button key={key} type="button" onClick={() => setDraft({ ...draft, icon: key })} aria-label={`Usar ícone ${key}`} aria-pressed={draft.icon === key} className={`p-2.5 rounded-xl border ${draft.icon === key ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200 text-slate-400'}`}><Icon className="w-4 h-4" /></button>)}</div></fieldset>
                {formError && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-100 p-3 rounded-xl">{formError}</p>}
                <div className="flex gap-3 pt-2"><button type="button" onClick={closeEditor} className="flex-1 bg-slate-100 text-slate-700 text-xs font-bold py-3 rounded-xl">Cancelar</button><button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-3 rounded-xl">{editorMode === 'create' ? 'Criar Caixinha' : 'Salvar alterações'}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteGoal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 p-4 flex items-center justify-center">
            <motion.div role="alertdialog" aria-modal="true" aria-labelledby="delete-goal-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 id="delete-goal-title" className="font-display font-bold text-slate-800">Excluir Caixinha?</h3>
              <p className="text-xs text-slate-500 mt-2">“{deleteGoal.name}” será removida deste mês. Esta ação só é permitida com saldo zerado.</p>
              <div className="flex gap-3 mt-5"><button type="button" onClick={() => setDeleteGoalId(null)} className="flex-1 bg-slate-100 text-slate-700 text-xs font-bold py-3 rounded-xl">Cancelar</button><button type="button" onClick={() => { onDeleteGoal(deleteGoal.id); setDeleteGoalId(null); }} className="flex-1 bg-rose-600 text-white text-xs font-bold py-3 rounded-xl">Excluir</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
