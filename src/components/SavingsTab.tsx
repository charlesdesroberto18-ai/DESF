import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PiggyBank, Plus, ArrowUpRight, ArrowDownLeft, Shield, ShoppingBag, Edit3, Target, CheckCircle } from 'lucide-react';
import { SavingGoal } from '../types';

interface SavingsTabProps {
  savingGoals: SavingGoal[];
  onAddTransactionToGoal: (id: string, amount: number) => void;
  onUpdateGoalTarget: (id: string, target: number) => void;
  onResetGoal: (id: string) => void;
}

export default function SavingsTab({
  savingGoals,
  onAddTransactionToGoal,
  onUpdateGoalTarget,
  onResetGoal
}: SavingsTabProps) {
  const [selectedGoalId, setSelectedGoalId] = React.useState<string | null>(savingGoals[0]?.id || null);
  const [transactionAmount, setTransactionAmount] = React.useState('');
  const [targetAmount, setTargetAmount] = React.useState('');
  const [isEditingTarget, setIsEditingTarget] = React.useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = React.useState('');

  const totalSaved = savingGoals.reduce((sum, g) => sum + g.current, 0);
  const activeGoal = savingGoals.find(g => g.id === selectedGoalId) || savingGoals[0];

  const handleTransaction = (type: 'deposit' | 'withdraw') => {
    if (!activeGoal) return;
    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      setFeedbackMsg('Por favor, insira um valor válido maior que zero.');
      return;
    }

    if (type === 'withdraw' && amount > activeGoal.current) {
      setFeedbackMsg('Saldo insuficiente nesta caixinha para resgate.');
      return;
    }

    const value = type === 'deposit' ? amount : -amount;
    onAddTransactionToGoal(activeGoal.id, value);
    setTransactionAmount('');
    setFeedbackMsg('');

    // Trigger sweet success message
    const msg = type === 'deposit' 
      ? `Sucesso! R$ ${amount.toFixed(2)} guardados na ${activeGoal.name}.`
      : `Sucesso! R$ ${amount.toFixed(2)} resgatados da ${activeGoal.name}.`;
    
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleUpdateTarget = (id: string) => {
    const newTarget = parseFloat(targetAmount);
    if (isNaN(newTarget) || newTarget < 0) return;
    onUpdateGoalTarget(id, newTarget);
    setIsEditingTarget(null);
    setTargetAmount('');
  };

  return (
    <div className="space-y-6" id="savings_tab_container">
      {/* Top Banner Summary */}
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6" id="savings_overview_banner">
        <div>
          <span className="text-teal-100/90 text-xs font-bold uppercase tracking-widest block mb-1">Caixinhas (Guardado este Mês)</span>
          <h2 className="font-display text-3xl font-bold">
            R$ {totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-teal-100 text-xs mt-1.5 flex items-center gap-1.5">
            <PiggyBank className="w-3.5 h-3.5 text-teal-200" />
            Guarde parte das suas receitas semanais para garantir seu futuro e lazer!
          </p>
        </div>
        <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 text-right">
          <span className="text-[10px] text-teal-100/80 block uppercase font-bold">Total Caixinhas</span>
          <span className="font-display text-lg font-bold font-mono">
            {savingGoals.length} Ativas
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals Interactive Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-display font-semibold text-slate-800 text-base mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            Suas Metas de Reserva
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savingGoals.map((goal) => {
              const isSelected = goal.id === selectedGoalId;
              const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
              const isEmergency = goal.name.toLowerCase().includes('emerg');

              return (
                <div
                  key={goal.id}
                  onClick={() => setSelectedGoalId(goal.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between h-44 ${
                    isSelected
                      ? 'bg-teal-50/50 border-teal-500 ring-1 ring-teal-500 shadow-md'
                      : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100/50">
                        {isEmergency ? (
                          <Shield className="w-5 h-5 text-teal-600" />
                        ) : (
                          <ShoppingBag className="w-5 h-5 text-teal-600" />
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">Guardado</span>
                        <span className="text-base font-bold text-slate-800 font-mono">
                          R$ {goal.current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      {goal.name}
                    </h4>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3 text-teal-500" />
                          Meta: R$ {goal.target.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </span>
                        <span>{percent}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full bg-teal-500 rounded-full animate-pulse-slow"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Target Editor for Selected Goal */}
          {activeGoal && (
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-teal-500" />
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Definir Meta para</span>
                  <span className="text-sm font-bold text-slate-800 block">{activeGoal.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isEditingTarget === activeGoal.id ? (
                  <>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                      <input
                        type="number"
                        placeholder="Ex: 500"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        className="pl-7 pr-2 py-1.5 w-28 bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleUpdateTarget(activeGoal.id)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setIsEditingTarget(null)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold text-xs py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      X
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold font-mono text-slate-700">
                      R$ {activeGoal.target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => {
                        setIsEditingTarget(activeGoal.id);
                        setTargetAmount(activeGoal.target.toString());
                      }}
                      className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-teal-600 transition-colors cursor-pointer"
                      title="Editar meta"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Panel to Deposit / Withdraw */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between" id="savings_deposit_withdraw_panel">
          <div>
            <h3 className="font-display font-semibold text-slate-800 text-base mb-4 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-teal-600" />
              Depósitos e Resgates
            </h3>

            {activeGoal ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Caixinha Selecionada</span>
                  <span className="text-sm font-bold text-slate-800">{activeGoal.name}</span>
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="text-slate-500">Saldo Atual:</span>
                    <strong className="font-mono text-teal-700">R$ {activeGoal.current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Informe o Valor</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg text-sm py-2 pl-8 pr-3 font-semibold outline-none text-slate-700 font-mono"
                    />
                  </div>
                </div>

                {/* Feedback Message */}
                <AnimatePresence>
                  {feedbackMsg && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`text-xs p-2.5 rounded-lg font-medium flex items-center gap-1.5 ${
                        feedbackMsg.includes('Sucesso')
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                          : 'bg-rose-50 text-rose-800 border border-rose-100'
                      }`}
                    >
                      {feedbackMsg.includes('Sucesso') ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Shield className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{feedbackMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleTransaction('deposit')}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2.5 px-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Guardar
                  </button>

                  <button
                    onClick={() => handleTransaction('withdraw')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Resgatar
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Selecione uma caixinha ao lado para depositar ou resgatar dinheiro.
              </div>
            )}
          </div>

          {/* Preset shortcuts to save */}
          {activeGoal && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-2">Gurdar valor rápido:</span>
              <div className="flex gap-2 justify-between">
                {[50, 100, 200, 500].map(amt => (
                  <button
                    key={amt}
                    onClick={() => {
                      setTransactionAmount(amt.toString());
                    }}
                    className="flex-1 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-600 font-bold text-xs py-1.5 rounded-lg border border-slate-200/50 hover:border-teal-200 transition-all cursor-pointer"
                  >
                    R$ {amt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
