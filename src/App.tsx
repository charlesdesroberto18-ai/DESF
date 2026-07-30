import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  CreditCard,
  PiggyBank,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Plus,
  Settings,
  Calendar,
  Wallet,
  Eye,
  EyeOff,
  Search,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Imports of custom sub-components
import MetricCard from './components/MetricCard';
import MonthComparison from './components/MonthComparison';

const FinancialCharts = lazy(() => import('./components/FinancialCharts'));
const IncomeTab = lazy(() => import('./components/IncomeTab'));
const FixedExpensesTab = lazy(() => import('./components/FixedExpensesTab'));
const SavingsTab = lazy(() => import('./components/SavingsTab'));
const VariableExpensesTab = lazy(() => import('./components/VariableExpensesTab'));
const SettingsTab = lazy(() => import('./components/SettingsTab'));

// Firebase integration helpers
import {
  isFirebaseConfigured,
  loadBudgetsFromFirebase,
  saveBudgetToFirebase,
  deleteBudgetFromFirebase,
  bulkSaveBudgetsToFirebase,
  testConnection as testFirebaseConnection,
  initAuth,
  googleSignIn,
  logoutGoogle
} from './lib/firebase';

// Types import
import { Income, FixedExpense, SavingGoal, VariableExpense, MonthlyBudget } from './types';

// Constants for initial values
const INITIAL_FIXED_EXPENSES: FixedExpense[] = [
  { id: 'fe-1', name: 'Aluguel (sua parte)', value: 500, isPaid: false },
  { id: 'fe-2', name: 'Medicação', value: 300, isPaid: false },
  { id: 'fe-3', name: 'Mercado / comida', value: 400, isPaid: false },
  { id: 'fe-4', name: 'Internet', value: 90, isPaid: false },
  { id: 'fe-5', name: 'Tablet duda', value: 200, isPaid: false },
  { id: 'fe-6', name: 'Passeio Escola Duda', value: 70, isPaid: false },
  { id: 'fe-7', name: 'Assinatura Xbox', value: 80, isPaid: false }
];

const INITIAL_SAVING_GOALS: SavingGoal[] = [
  { id: 'sg-1', name: 'Reserva de emergência', target: 300, current: 0, icon: 'shield', description: 'Proteção para despesas inesperadas.' },
  { id: 'sg-2', name: 'Compras planejadas', target: 200, current: 0, icon: 'shopping-bag', description: 'Compras importantes sem apertar o mês.' }
];

const MONTH_NAMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const LOCAL_STORAGE_KEY_MULTI = 'charles_financial_dashboard_multi_budget_v2';
const LOCAL_STORAGE_KEY_LEGACY = 'charles_financial_dashboard_budget';
type ActiveTab = 'overview' | 'incomes' | 'fixed' | 'savings' | 'variables' | 'settings';
const NAV_TABS: Array<{ id: ActiveTab; label: string; mobileLabel: string; icon: typeof TrendingUp }> = [
  { id: 'overview', label: 'Painel Geral', mobileLabel: 'Painel', icon: TrendingUp },
  { id: 'incomes', label: 'Entradas', mobileLabel: 'Entradas', icon: DollarSign },
  { id: 'fixed', label: 'Contas Fixas', mobileLabel: 'Contas', icon: CreditCard },
  { id: 'savings', label: 'Caixinhas', mobileLabel: 'Metas', icon: PiggyBank },
  { id: 'variables', label: 'Gastos Variáveis', mobileLabel: 'Gastos', icon: ShoppingCart },
  { id: 'settings', label: 'Configurações', mobileLabel: 'Ajustes', icon: Settings }
];

const summarizeBudget = (monthlyBudget: MonthlyBudget) => {
  const income = monthlyBudget.incomes.reduce((sum, item) => sum + item.value, 0);
  const fixed = monthlyBudget.fixedExpenses.reduce((sum, item) => sum + item.value, 0);
  const variable = monthlyBudget.variableExpenses.reduce((sum, item) => sum + item.value, 0);
  const savings = monthlyBudget.savingGoals.reduce((sum, item) => sum + item.current, 0);

  return {
    income,
    expenses: fixed + variable,
    savings,
    balance: income - fixed - variable - savings
  };
};

const formatBudgetLabel = (monthlyBudget: MonthlyBudget) => {
  const month = monthlyBudget.month.charAt(0) + monthlyBudget.month.slice(1).toLowerCase();
  return `${month} de ${monthlyBudget.year}`;
};

const getMonthDateBounds = (monthKey: string) => {
  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const lastDay = new Date(year, month, 0).getDate();
  const min = `${yearText}-${monthText}-01`;
  const max = `${yearText}-${monthText}-${String(lastDay).padStart(2, '0')}`;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayDate = `${todayKey}-${String(today.getDate()).padStart(2, '0')}`;

  return { min, max, defaultDate: todayKey === monthKey ? todayDate : min };
};

const moveDateToMonth = (date: string | undefined, year: number, month: number) => {
  if (!date) return undefined;
  const day = Number(date.split('-')[2]);
  if (!Number.isInteger(day) || day < 1) return undefined;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
};

const mergeBudgetRecords = (
  localBudgets: Record<string, MonthlyBudget>,
  cloudBudgets: Record<string, MonthlyBudget>
) => {
  const merged: Record<string, MonthlyBudget> = { ...cloudBudgets };

  Object.entries(localBudgets).forEach(([key, localBudget]) => {
    const cloudBudget = cloudBudgets[key];
    if (!cloudBudget) {
      merged[key] = localBudget;
      return;
    }

    const localUpdatedAt = Date.parse(localBudget.updatedAt || '');
    const cloudUpdatedAt = Date.parse(cloudBudget.updatedAt || '');
    if (Number.isFinite(localUpdatedAt) && (!Number.isFinite(cloudUpdatedAt) || localUpdatedAt > cloudUpdatedAt)) {
      merged[key] = localBudget;
    }
  });

  return merged;
};

export default function App() {
  // Current tab active: 'overview' | 'incomes' | 'fixed' | 'savings' | 'variables' | 'settings'
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Help Modal State
  const [showHelp, setShowHelp] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('charles_financial_privacy_mode') === 'true');

  // New Month Modal State
  const [showNewMonthModal, setShowNewMonthModal] = useState(false);
  const [newMonthName, setNewMonthName] = useState(MONTH_NAMES[0]);
  const [newMonthYear, setNewMonthYear] = useState('2026');
  const [newMonthStrategy, setNewMonthStrategy] = useState<'empty' | 'copy_fixed'>('copy_fixed');
  const [newMonthError, setNewMonthError] = useState('');

  // Quick Add Variable Expense Modal State
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickDesc, setQuickDesc] = useState('');
  const [quickValue, setQuickValue] = useState('');
  const [quickCategory, setQuickCategory] = useState('Alimentação');
  const [quickIsPaid, setQuickIsPaid] = useState(true);
  const [quickDate, setQuickDate] = useState('');
  const [quickError, setQuickError] = useState('');

  useEffect(() => {
    localStorage.setItem('charles_financial_privacy_mode', String(privacyMode));
  }, [privacyMode]);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandQuery('');
        setShowCommandPalette((current) => !current);
      }

      if (event.key === 'Escape') {
        setShowCommandPalette(false);
        setShowHelp(false);
        setShowDemoConfirm(false);
        setShowNewMonthModal(false);
        setShowQuickAddModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, []);

  // Handler to open and initialize Quick Add modal
  const handleOpenQuickAdd = () => {
    setQuickDesc('');
    setQuickValue('');
    setQuickCategory('Alimentação');
    setQuickIsPaid(true);
    setQuickDate(getMonthDateBounds(currentMonthKey).defaultDate);
    setQuickError('');
    setShowQuickAddModal(true);
  };

  // Handler to submit Quick Add form
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDesc.trim()) {
      setQuickError('Por favor, informe uma descrição.');
      return;
    }
    const val = Number(quickValue);
    if (!Number.isFinite(val) || val <= 0 || val > 999999999.99) {
      setQuickError('Por favor, informe um valor maior que zero.');
      return;
    }
    const { min, max } = getMonthDateBounds(currentMonthKey);
    if (!quickDate || quickDate < min || quickDate > max) {
      setQuickError(`Escolha uma data entre ${min.split('-').reverse().join('/')} e ${max.split('-').reverse().join('/')}.`);
      return;
    }

    handleAddVariableExpense(quickDesc, quickCategory, Math.round(val * 100) / 100, quickDate, quickIsPaid);
    setShowQuickAddModal(false);
  };

  // Budgets state (Map of string keys "YYYY-MM" to MonthlyBudget)
  const [budgets, setBudgets] = useState<Record<string, MonthlyBudget>>(() => {
    // 1. Try to load the multi budget
    const savedMulti = localStorage.getItem(LOCAL_STORAGE_KEY_MULTI);
    if (savedMulti) {
      try {
        const parsed = JSON.parse(savedMulti);
        if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Error loading multi-budget", e);
      }
    }

    // 2. Try to migrate legacy single budget
    const savedLegacy = localStorage.getItem(LOCAL_STORAGE_KEY_LEGACY);
    if (savedLegacy) {
      try {
        const parsed = JSON.parse(savedLegacy);
        if (parsed && parsed.month && parsed.year) {
          // Convert legacy structure
          const convertedIncomes = (parsed.incomes || []).map((inc: any) => ({
            id: inc.id,
            name: inc.name || (inc.category === 'garcom' ? `Renda garçom — Semana ${inc.week}` : 'Renda Extra'),
            value: inc.value || 0,
            category: inc.category === 'garcom' ? 'Garçom' : 'Extra',
            date: inc.date || `2026-07-${String(inc.week || 1).padStart(2, '0')}`,
            week: inc.week || 1
          }));

          const convertedVariables = (parsed.variableExpenses || []).map((ve: any) => ({
            ...ve,
            isPaid: ve.isPaid !== undefined ? ve.isPaid : true
          }));

          const legacyMonthName = String(parsed.month).toUpperCase();
          const legacyYear = parsed.year || 2026;
          const monthIdx = MONTH_NAMES.indexOf(legacyMonthName) + 1;
          const key = `${legacyYear}-${String(monthIdx > 0 ? monthIdx : 7).padStart(2, '0')}`;

          return {
            [key]: {
              month: legacyMonthName,
              year: legacyYear,
              incomes: convertedIncomes,
              fixedExpenses: parsed.fixedExpenses || INITIAL_FIXED_EXPENSES,
              savingGoals: parsed.savingGoals || INITIAL_SAVING_GOALS,
              variableExpenses: convertedVariables
            }
          };
        }
      } catch (e) {
        console.error("Error migrating legacy budget", e);
      }
    }

    // 3. Fallback to default July 2026 initial budget
    const initialKey = "2026-07";
    const defaultIncomes: Income[] = [
      { id: 'in-1', name: 'Renda Garçom Sexta', value: 0, category: 'Garçom', date: '2026-07-03', week: 1 },
      { id: 'in-2', name: 'Renda Garçom Sábado', value: 0, category: 'Garçom', date: '2026-07-11', week: 2 },
      { id: 'in-3', name: 'Renda Garçom Domingo', value: 0, category: 'Garçom', date: '2026-07-19', week: 3 },
      { id: 'in-4', name: 'Renda Garçom Extra', value: 0, category: 'Garçom', date: '2026-07-27', week: 4 }
    ];

    return {
      [initialKey]: {
        month: 'JULHO',
        year: 2026,
        incomes: defaultIncomes,
        fixedExpenses: INITIAL_FIXED_EXPENSES,
        savingGoals: INITIAL_SAVING_GOALS,
        variableExpenses: []
      }
    };
  });

  const [currentMonthKey, setCurrentMonthKey] = useState<string>(() => {
    const savedMulti = localStorage.getItem(LOCAL_STORAGE_KEY_MULTI);
    if (savedMulti) {
      try {
        const parsed = JSON.parse(savedMulti);
        const keys = Object.keys(parsed);
        if (keys.length > 0) {
          keys.sort();
          return keys[keys.length - 1]; // return the latest month
        }
      } catch {}
    }
    return "2026-07";
  });

  // Database Sync States (Firebase)
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isDbConfigured, setIsDbConfigured] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [dbError, setDbError] = useState<string | null>(null);

  const prevBudgetsRef = useRef<Record<string, MonthlyBudget>>(budgets);

  // Google Integration States
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [exportSuccessUrl, setExportSuccessUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Google Auth lifecycle
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        void handleRetryDb();
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleConnectGoogle = async () => {
    setExportError(null);
    setExportSuccessUrl(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        void handleRetryDb();
      }
    } catch (err: any) {
      console.error("Failed to connect Google account:", err);
      const message = String(err?.message || '');
      setExportError(
        message.includes('auth/unauthorized-domain')
          ? 'Este endereço ainda não está autorizado no Firebase. Adicione o domínio da Vercel em Authentication > Settings > Authorized domains.'
          : message || 'Falha ao conectar a conta Google. Verifique se o navegador bloqueou a janela de acesso.'
      );
    }
  };

  const handleDisconnectGoogle = async () => {
    setExportError(null);
    setExportSuccessUrl(null);
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
    } catch (err: any) {
      console.error("Failed to disconnect Google:", err);
    }
  };

  const handleExportSheets = async () => {
    if (!googleToken) {
      setExportError("Você precisa estar conectado à sua conta Google para realizar o export.");
      return;
    }
    setIsExportingSheets(true);
    setExportError(null);
    setExportSuccessUrl(null);

    try {
      const b = budgets[currentMonthKey];
      if (!b) {
        throw new Error("Nenhum orçamento encontrado para o mês selecionado.");
      }
      const { exportBudgetToGoogleSheets } = await import('./lib/googleSheets');
      const result = await exportBudgetToGoogleSheets(b, googleToken);
      setExportSuccessUrl(result.spreadsheetUrl);
    } catch (err: any) {
      console.error("Export to Sheets error:", err);
      setExportError(err?.message || "Ocorreu um erro ao exportar para o Google Planilhas.");
    } finally {
      setIsExportingSheets(false);
    }
  };

  // Handle retry connection to Database (Firebase)
  const handleRetryDb = async () => {
    const isFb = isFirebaseConfigured();
    if (isFb) {
      setIsDbLoading(true);
      setDbError(null);
      setSyncStatus('syncing');
      try {
        await testFirebaseConnection();
        const dbBudgets = await loadBudgetsFromFirebase();

        if (dbBudgets && Object.keys(dbBudgets).length > 0) {
          const mergedBudgets = mergeBudgetRecords(budgets, dbBudgets);
          prevBudgetsRef.current = dbBudgets;
          setBudgets(mergedBudgets);
          const keys = Object.keys(mergedBudgets);
          keys.sort();
          setCurrentMonthKey(keys[keys.length - 1]);
        } else if (dbBudgets) {
          await bulkSaveBudgetsToFirebase(budgets);
          prevBudgetsRef.current = budgets;
        }
        setSyncStatus('synced');
        setDbError(null);
      } catch (e: any) {
        console.error("Error loading from database:", e);
        setDbError(e?.message || "Erro ao conectar ao banco de dados do Firebase.");
        setSyncStatus('error');
      } finally {
        setIsDbLoading(false);
      }
    }
  };

  // Initialize and load from Database on mount
  useEffect(() => {
    async function initDb() {
      const isFb = isFirebaseConfigured();
      if (isFb) {
        setIsDbConfigured(true);
        setIsDbLoading(true);
        try {
          await testFirebaseConnection();
          const dbBudgets = await loadBudgetsFromFirebase();

          if (dbBudgets && Object.keys(dbBudgets).length > 0) {
            const mergedBudgets = mergeBudgetRecords(budgets, dbBudgets);
            prevBudgetsRef.current = dbBudgets;
            setBudgets(mergedBudgets);
            // Select the latest month
            const keys = Object.keys(mergedBudgets);
            keys.sort();
            setCurrentMonthKey(keys[keys.length - 1]);
          } else if (dbBudgets) {
            // Database is configured but empty. Seed it with current local storage / default budgets
            await bulkSaveBudgetsToFirebase(budgets);
            prevBudgetsRef.current = budgets;
          }
          setSyncStatus('synced');
          setDbError(null);
        } catch (e: any) {
          console.error("Error loading from database on mount:", e);
          setDbError(e?.message || "Erro ao conectar ao banco de dados do Firebase.");
          setSyncStatus('error');
        } finally {
          setIsDbLoading(false);
        }
      } else {
        setIsDbLoading(false);
      }
    }
    initDb();
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_MULTI, JSON.stringify(budgets));
  }, [budgets]);

  // Sync state to Database when budgets changes (excluding initial load)
  useEffect(() => {
    if (isDbLoading) {
      return;
    }

    const syncToDb = async () => {
      const isFb = isFirebaseConfigured();
      if (isFb) {
        setSyncStatus('syncing');
        try {
          let success = true;

          const keys = Object.keys(budgets);
          for (const key of keys) {
            const prev = prevBudgetsRef.current[key];
            const curr = budgets[key];
            if (!prev || JSON.stringify(prev) !== JSON.stringify(curr)) {
              const saved = await saveBudgetToFirebase(key, curr);
              if (!saved) success = false;
            }
          }

          // Handle deletions of months
          const prevKeys = Object.keys(prevBudgetsRef.current);
          for (const key of prevKeys) {
            if (!budgets[key]) {
              const deleted = await deleteBudgetFromFirebase(key);
              if (!deleted) success = false;
            }
          }

          if (success) {
            prevBudgetsRef.current = budgets;
            setSyncStatus('synced');
            setDbError(null);
          } else {
            setSyncStatus('error');
            setDbError('Falha ao salvar no Firebase.');
          }
        } catch (error) {
          console.error('Falha ao sincronizar alterações:', error);
          setSyncStatus('error');
          setDbError('As alterações estão salvas neste dispositivo, mas a nuvem não respondeu. Tente sincronizar novamente.');
        }
      }
    };

    void syncToDb();
  }, [budgets, isDbLoading]);

  // Ensure currentMonthKey points to an existing budget
  useEffect(() => {
    const keys = Object.keys(budgets);
    if (keys.length > 0 && !budgets[currentMonthKey]) {
      keys.sort();
      setCurrentMonthKey(keys[keys.length - 1]);
    }
  }, [budgets, currentMonthKey]);

  // Current budget object helper
  const budget = budgets[currentMonthKey] || {
    month: 'JULHO',
    year: 2026,
    incomes: [],
    fixedExpenses: [],
    savingGoals: [],
    variableExpenses: [],
    customCategories: [],
    accountCategories: []
  };

  // Helper to create an empty budget structure for a key
  const createEmptyBudgetStructure = (
    key: string,
    monthName: string,
    year: number,
    savingGoals: SavingGoal[] = INITIAL_SAVING_GOALS
  ): MonthlyBudget => {
    return {
      month: monthName,
      year,
      updatedAt: new Date().toISOString(),
      incomes: [],
      fixedExpenses: [],
      savingGoals: savingGoals.map(g => ({ ...g, current: 0 })),
      variableExpenses: [],
      customCategories: [],
      accountCategories: []
    };
  };

  // State-modifier helper
  const updateBudget = (updater: (prev: MonthlyBudget) => MonthlyBudget) => {
    setBudgets(prev => {
      const current = prev[currentMonthKey] || createEmptyBudgetStructure(currentMonthKey, budget.month, budget.year);
      return {
        ...prev,
        [currentMonthKey]: {
          ...updater(current),
          updatedAt: new Date().toISOString()
        }
      };
    });
  };

  // Core calculations for current selected month
  const totalIn = budget.incomes.reduce((sum, item) => sum + item.value, 0);
  const fixedTotal = budget.fixedExpenses.reduce((sum, item) => sum + item.value, 0);
  const caixinhasTotal = budget.savingGoals.reduce((sum, item) => sum + item.current, 0);
  const variableTotal = budget.variableExpenses.reduce((sum, item) => sum + item.value, 0);
  const fixedPaidTotal = budget.fixedExpenses.filter(item => item.isPaid).reduce((sum, item) => sum + item.value, 0);
  const variablePaidTotal = budget.variableExpenses.filter(item => item.isPaid).reduce((sum, item) => sum + item.value, 0);
  
  // New optimized metrics requested by Charles:
  const balanceForAccounts = totalIn - variableTotal; // Saldo p/ pagar contas (Recebido - Variáveis)
  const remainingBeforeSavings = totalIn - variableTotal - fixedTotal; // Sobra operacional antes das Caixinhas
  const netBalance = totalIn - fixedTotal - caixinhasTotal - variableTotal; // Sobra líquida real final
  const availableAfterPaid = totalIn - fixedPaidTotal - variablePaidTotal - caixinhasTotal;
  const pendingCommitments = Math.max(0, (fixedTotal - fixedPaidTotal) + (variableTotal - variablePaidTotal));
  const paidFixedCount = budget.fixedExpenses.filter(item => item.isPaid).length;
  const fixedProgress = budget.fixedExpenses.length > 0
    ? Math.round((paidFixedCount / budget.fixedExpenses.length) * 100)
    : 0;
  const savingTargetTotal = budget.savingGoals.reduce((sum, item) => sum + item.target, 0);
  const savingsProgress = savingTargetTotal > 0
    ? Math.min(100, Math.round((caixinhasTotal / savingTargetTotal) * 100))
    : 0;
  const priorMonthKeys = Object.keys(budgets).filter(key => key < currentMonthKey).sort();
  const previousMonthKey = priorMonthKeys.length > 0 ? priorMonthKeys[priorMonthKeys.length - 1] : null;
  const previousBudget = previousMonthKey ? budgets[previousMonthKey] : null;
  const currentMonthSummary = summarizeBudget(budget);
  const previousMonthSummary = previousBudget ? summarizeBudget(previousBudget) : null;

  const navigateToTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      document.getElementById('tab_contents_container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const commandItems = [
    ...NAV_TABS.map(tab => ({
      id: `navigate-${tab.id}`,
      label: `Abrir ${tab.label}`,
      group: 'Navegação',
      icon: tab.icon,
      action: () => navigateToTab(tab.id)
    })),
    {
      id: 'quick-expense',
      label: 'Registrar gasto rápido',
      group: 'Ação',
      icon: ShoppingCart,
      action: handleOpenQuickAdd
    },
    {
      id: 'new-month',
      label: 'Criar novo mês',
      group: 'Ação',
      icon: Plus,
      action: () => {
        setNewMonthError('');
        setShowNewMonthModal(true);
      }
    },
    {
      id: 'privacy',
      label: privacyMode ? 'Desativar modo discreto' : 'Ativar modo discreto',
      group: 'Privacidade',
      icon: privacyMode ? Eye : EyeOff,
      action: () => setPrivacyMode(current => !current)
    }
  ];
  const normalizedCommandQuery = commandQuery.trim().toLocaleLowerCase('pt-BR');
  const filteredCommandItems = commandItems.filter(item =>
    `${item.label} ${item.group}`.toLocaleLowerCase('pt-BR').includes(normalizedCommandQuery)
  );

  const runCommand = (action: () => void) => {
    setShowCommandPalette(false);
    setCommandQuery('');
    action();
  };

  // --- HANDLER FUNCTIONS ---

  // INCOMES
  const handleAddIncome = (name: string, value: number, category: string, date: string, week: 1 | 2 | 3 | 4 | 5) => {
    updateBudget(prev => ({
      ...prev,
      incomes: [
        ...prev.incomes,
        { id: `in-${Date.now()}`, name, value, category, date, week }
      ]
    }));
  };

  const handleUpdateIncome = (id: string, name: string, value: number, category: string, date: string, week: 1 | 2 | 3 | 4 | 5) => {
    updateBudget(prev => ({
      ...prev,
      incomes: prev.incomes.map(item => item.id === id ? { ...item, name, value, category, date, week } : item)
    }));
  };

  const handleDeleteIncome = (id: string) => {
    updateBudget(prev => ({
      ...prev,
      incomes: prev.incomes.filter(item => item.id !== id)
    }));
  };

  // FIXED EXPENSES
  const handleUpdateFixedExpense = (id: string, name: string, value: number, dueDate?: string, category?: string) => {
    updateBudget(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.map(item => item.id === id ? { ...item, name, value, dueDate, category } : item)
    }));
  };

  const handleToggleFixedExpensePaid = (id: string) => {
    updateBudget(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.map(item => item.id === id ? { ...item, isPaid: !item.isPaid } : item)
    }));
  };

  const handleAddFixedExpense = (name: string, value: number, dueDate?: string, category?: string) => {
    updateBudget(prev => ({
      ...prev,
      fixedExpenses: [
        ...prev.fixedExpenses,
        { id: `fe-${Date.now()}`, name, value, isPaid: false, dueDate, category }
      ]
    }));
  };

  const handleDeleteFixedExpense = (id: string) => {
    updateBudget(prev => ({
      ...prev,
      fixedExpenses: prev.fixedExpenses.filter(item => item.id !== id)
    }));
  };

  const handleDuplicateFixedExpenseToNextMonth = (id: string) => {
    const [yearStr, monthStr] = currentMonthKey.split('-');
    let year = parseInt(yearStr);
    let month = parseInt(monthStr);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    const nextKey = `${year}-${String(month).padStart(2, '0')}`;
    const nextMonthName = MONTH_NAMES[month - 1];

    setBudgets(prev => {
      const currentBudget = prev[currentMonthKey];
      if (!currentBudget) return prev;

      const expenseToCopy = currentBudget.fixedExpenses.find(e => e.id === id);
      if (!expenseToCopy) return prev;

      const nextBudget = prev[nextKey] || createEmptyBudgetStructure(nextKey, nextMonthName, year, currentBudget.savingGoals);
      
      const alreadyHas = nextBudget.fixedExpenses.some(e => e.name.toLowerCase() === expenseToCopy.name.toLowerCase());
      if (alreadyHas) return prev;

      return {
        ...prev,
        [nextKey]: {
          ...nextBudget,
          updatedAt: new Date().toISOString(),
          fixedExpenses: [
            ...nextBudget.fixedExpenses,
            { ...expenseToCopy, id: `fe-${Date.now()}`, isPaid: false, dueDate: moveDateToMonth(expenseToCopy.dueDate, year, month) }
          ]
        }
      };
    });
  };

  // SAVING GOALS
  const handleAddTransactionToGoal = (id: string, amount: number) => {
    updateBudget(prev => ({
      ...prev,
      savingGoals: prev.savingGoals.map(item => {
        if (item.id === id) {
          const updated = Math.max(0, item.current + amount);
          return { ...item, current: updated };
        }
        return item;
      })
    }));
  };

  const handleCreateGoal = (goal: Omit<SavingGoal, 'id' | 'current'>) => {
    updateBudget(prev => ({
      ...prev,
      savingGoals: [...prev.savingGoals, { ...goal, id: `sg-${Date.now()}`, current: 0 }]
    }));
  };

  const handleUpdateGoal = (id: string, goal: Omit<SavingGoal, 'id' | 'current'>) => {
    updateBudget(prev => ({
      ...prev,
      savingGoals: prev.savingGoals.map(item => item.id === id ? { ...item, ...goal } : item)
    }));
  };

  const handleDeleteGoal = (id: string) => {
    updateBudget(prev => ({
      ...prev,
      savingGoals: prev.savingGoals.filter(item => item.id !== id || item.current > 0)
    }));
  };

  // VARIABLE EXPENSES
  const handleAddVariableExpense = (description: string, category: string, value: number, date: string, isPaid: boolean) => {
    updateBudget(prev => ({
      ...prev,
      variableExpenses: [
        ...prev.variableExpenses,
        { id: `ve-${Date.now()}`, description, category, value, date, isPaid }
      ]
    }));
  };

  const handleDeleteVariableExpense = (id: string) => {
    updateBudget(prev => ({
      ...prev,
      variableExpenses: prev.variableExpenses.filter(item => item.id !== id)
    }));
  };

  const handleToggleVariableExpensePaid = (id: string) => {
    updateBudget(prev => ({
      ...prev,
      variableExpenses: prev.variableExpenses.map(item => item.id === id ? { ...item, isPaid: !item.isPaid } : item)
    }));
  };

  const handleAddCustomCategory = (name: string, note?: string) => {
    updateBudget(prev => ({
      ...prev,
      customCategories: [
        ...(prev.customCategories || []),
        { id: `cat-${Date.now()}`, name, note }
      ]
    }));
  };

  const handleDeleteCustomCategory = (id: string) => {
    updateBudget(prev => ({
      ...prev,
      customCategories: (prev.customCategories || []).filter(cat => cat.id !== id)
    }));
  };

  const handleAddAccountCategory = (name: string, note?: string) => {
    updateBudget(prev => ({
      ...prev,
      accountCategories: [
        ...(prev.accountCategories || []),
        { id: `cat-acc-${Date.now()}`, name, note }
      ]
    }));
  };

  const handleDeleteAccountCategory = (id: string) => {
    updateBudget(prev => ({
      ...prev,
      accountCategories: (prev.accountCategories || []).filter(cat => cat.id !== id)
    }));
  };

  const handleUpdateObservations = (date: string, text: string) => {
    updateBudget(prev => ({
      ...prev,
      observations: {
        ...(prev.observations || {}),
        [date]: text
      }
    }));
  };

  // --- DEMO AND SYSTEM SETTINGS HANDLERS ---

  const handleLoadDemoData = () => {
    updateBudget(prev => ({
      ...prev,
      incomes: [
        { id: 'in-1', name: 'Renda Garçom Sexta', value: 450.00, category: 'Garçom', date: `${prev.year}-${String(MONTH_NAMES.indexOf(prev.month) + 1).padStart(2, '0')}-05`, week: 1 },
        { id: 'in-2', name: 'Renda Garçom Sábado', value: 620.00, category: 'Garçom', date: `${prev.year}-${String(MONTH_NAMES.indexOf(prev.month) + 1).padStart(2, '0')}-12`, week: 2 },
        { id: 'in-3', name: 'Renda Garçom Domingo', value: 500.00, category: 'Garçom', date: `${prev.year}-${String(MONTH_NAMES.indexOf(prev.month) + 1).padStart(2, '0')}-19`, week: 3 },
        { id: 'in-4', name: 'Renda Garçom Bônus', value: 150.00, category: 'Garçom', date: `${prev.year}-${String(MONTH_NAMES.indexOf(prev.month) + 1).padStart(2, '0')}-20`, week: 3 },
        { id: 'in-5', name: 'Trabalho Freelance Design', value: 580.00, category: 'Freelance', date: `${prev.year}-${String(MONTH_NAMES.indexOf(prev.month) + 1).padStart(2, '0')}-26`, week: 4 },
        { id: 'in-extra-demo', name: 'Venda de Tablet Antigo', value: 350.00, category: 'Venda', date: `${prev.year}-${String(MONTH_NAMES.indexOf(prev.month) + 1).padStart(2, '0')}-18`, week: 3 }
      ],
      fixedExpenses: [
        { id: 'fe-1', name: 'Aluguel (sua parte)', value: 500, isPaid: true },
        { id: 'fe-2', name: 'Medicação', value: 300, isPaid: true },
        { id: 'fe-3', name: 'Mercado / comida', value: 400, isPaid: true },
        { id: 'fe-4', name: 'Internet', value: 90, isPaid: true },
        { id: 'fe-5', name: 'Tablet duda', value: 200, isPaid: false },
        { id: 'fe-6', name: 'Passeio Escola Duda', value: 70, isPaid: true },
        { id: 'fe-7', name: 'Assinatura Xbox', value: 80, isPaid: false }
      ],
      savingGoals: [
        { id: 'sg-1', name: 'Reserva de emergência', target: 300, current: 150, icon: 'shield', description: 'Proteção para despesas inesperadas.' },
        { id: 'sg-2', name: 'Compras planejadas', target: 200, current: 80, icon: 'shopping-bag', description: 'Compras importantes sem apertar o mês.' }
      ],
      variableExpenses: [
        { id: 've-1', description: 'Pastel e caldo de cana feira', category: 'Alimentação', value: 18.50, date: `${prev.year}-${String(MONTH_NAMES.indexOf(prev.month) + 1).padStart(2, '0')}-05`, isPaid: true },
        { id: 've-2', description: 'Combustível Moto', category: 'Transporte / Gasolina', value: 60.00, date: `${prev.year}-${String(MONTH_NAMES.indexOf(prev.month) + 1).padStart(2, '0')}-08`, isPaid: true },
        { id: 've-3', description: 'Sorvete com a Dudinha', category: 'Lazer / Delivery', value: 24.00, date: `${prev.year}-${String(MONTH_NAMES.indexOf(prev.month) + 1).padStart(2, '0')}-12`, isPaid: true },
        { id: 've-4', description: 'Comida rápida fds', category: 'Alimentação', value: 45.00, date: `${prev.year}-${String(MONTH_NAMES.indexOf(prev.month) + 1).padStart(2, '0')}-15`, isPaid: false }
      ]
    }));
    setActiveTab('overview');
  };

  const handleClearCurrentMonth = () => {
    updateBudget(prev => ({
      ...prev,
      incomes: [],
      fixedExpenses: INITIAL_FIXED_EXPENSES.map(fe => ({ ...fe, isPaid: false })),
      savingGoals: prev.savingGoals.map(sg => ({ ...sg, current: 0 })),
      variableExpenses: []
    }));
  };

  const handleClearAllData = () => {
    const initialKey = "2026-07";
    const pristineBudget = {
      [initialKey]: {
        month: 'JULHO',
        year: 2026,
        updatedAt: new Date().toISOString(),
        incomes: [],
        fixedExpenses: INITIAL_FIXED_EXPENSES.map(fe => ({ ...fe, isPaid: false })),
        savingGoals: INITIAL_SAVING_GOALS.map(sg => ({ ...sg, current: 0 })),
        variableExpenses: []
      }
    };
    setBudgets(pristineBudget);
    setCurrentMonthKey(initialKey);
    setActiveTab('overview');
  };

  const handleImportBackup = (importedData: Record<string, MonthlyBudget>) => {
    const importedAt = new Date().toISOString();
    const timestampedData = Object.fromEntries(
      Object.entries(importedData).map(([key, importedBudget]) => [key, { ...importedBudget, updatedAt: importedAt }])
    );
    setBudgets(timestampedData);
    const keys = Object.keys(importedData);
    keys.sort();
    setCurrentMonthKey(keys[keys.length - 1]);
  };

  // --- MONTH MANAGEMENT MODAL FUNCTIONS ---

  const handleCreateNewMonth = (e: React.FormEvent) => {
    e.preventDefault();
    const monthIdx = MONTH_NAMES.indexOf(newMonthName) + 1;
    const yearNum = Number(newMonthYear);

    if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
      setNewMonthError('Por favor, informe um ano válido (Ex: 2026)');
      return;
    }

    const key = `${yearNum}-${String(monthIdx).padStart(2, '0')}`;
    
    if (budgets[key]) {
      setNewMonthError('Este mês já existe no seu controle!');
      return;
    }

    let nextFixed: FixedExpense[] = [];
    if (newMonthStrategy === 'copy_fixed') {
      // Copy fixed expenses of currently selected month
      nextFixed = budget.fixedExpenses.map(fe => ({
        ...fe,
        isPaid: false,
        dueDate: moveDateToMonth(fe.dueDate, yearNum, monthIdx)
      }));
    }

    const newMonthBudget: MonthlyBudget = {
      month: newMonthName,
      year: yearNum,
      updatedAt: new Date().toISOString(),
      incomes: [],
      fixedExpenses: nextFixed,
      savingGoals: budget.savingGoals.map(sg => ({ ...sg, current: 0 })),
      variableExpenses: [],
      customCategories: (budget.customCategories || []).map(category => ({ ...category })),
      accountCategories: (budget.accountCategories || []).map(category => ({ ...category }))
    };

    setBudgets(prev => ({
      ...prev,
      [key]: newMonthBudget
    }));

    setCurrentMonthKey(key);
    setShowNewMonthModal(false);
    setNewMonthError('');
    setActiveTab('overview');
  };

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-teal-500 selection:text-white pb-28 sm:pb-12 ${privacyMode ? 'privacy-mode' : ''}`} id="app_root_container">
      {/* Top Professional Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-white/80 shadow-sm shadow-slate-200/50" id="main_header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-teal-500 to-emerald-600 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-500/20 ring-1 ring-white/60">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-slate-800 tracking-tight leading-none flex items-center gap-1.5">
                Controle Financeiro
                <span className="privacy-exempt text-[10px] bg-slate-100 text-slate-600 font-mono py-0.5 px-2 rounded-full font-semibold border border-slate-200">
                  Charles
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 mt-1 gap-y-0.5">
                <p className="text-xs text-slate-400">Transformando planilhas em decisões inteligentes</p>
                {isDbConfigured && (
                  <>
                    <span className="text-slate-300 text-xs hidden sm:inline">•</span>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
                        syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`} />
                      <span className={`privacy-exempt text-[9px] font-bold tracking-wider uppercase font-mono ${
                        syncStatus === 'syncing' ? 'text-amber-600' :
                        syncStatus === 'synced' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {syncStatus === 'syncing' ? 'Salvando...' :
                         syncStatus === 'synced' ? 'Nuvem OK' : 'Sem Conexão'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Month Indicator and Utility Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
            {/* Dynamic Month Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1" id="month_selector_container">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={currentMonthKey}
                onChange={(e) => setCurrentMonthKey(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-800 outline-none pr-1 cursor-pointer focus:ring-0"
                id="month_select_dropdown"
              >
                {Object.keys(budgets).sort().map(key => {
                  const b = budgets[key];
                  return (
                    <option key={key} value={key}>
                      {b.month} / {b.year}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Create New Month Button */}
            <button
              onClick={() => {
                setShowNewMonthModal(true);
                setNewMonthError('');
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              id="add_new_month_btn"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Mês
            </button>

            <button
              id="demo_data_loader_btn"
              onClick={() => setShowDemoConfirm(true)}
              className="hidden md:flex bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs py-2 px-3.5 rounded-xl transition-all border border-emerald-200/50 items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Demo Completa
            </button>

            <button
              type="button"
              onClick={() => {
                setCommandQuery('');
                setShowCommandPalette(true);
              }}
              className="inline-flex items-center gap-2 p-2 lg:px-3 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 transition-colors border border-transparent hover:border-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              aria-label="Abrir busca rápida"
              title="Busca rápida (Ctrl+K)"
              id="command_palette_trigger"
            >
              <Search className="w-4.5 h-4.5" aria-hidden="true" />
              <span className="hidden lg:inline text-[10px] font-bold">Buscar</span>
              <kbd className="hidden xl:inline privacy-exempt rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-mono text-slate-400">Ctrl K</kbd>
            </button>

            <button
              type="button"
              onClick={() => setPrivacyMode(current => !current)}
              className={`p-2 rounded-xl transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${privacyMode ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 border-transparent hover:border-slate-100'}`}
              aria-label={privacyMode ? 'Desativar modo discreto visual' : 'Ativar modo discreto visual'}
              aria-pressed={privacyMode}
              title={privacyMode ? 'Mostrar valores na tela' : 'Ocultar valores na tela'}
              id="privacy_mode_toggle"
            >
              {privacyMode ? <EyeOff className="w-4.5 h-4.5" aria-hidden="true" /> : <Eye className="w-4.5 h-4.5" aria-hidden="true" />}
            </button>

            <button
              id="help_modal_trigger_btn"
              onClick={() => setShowHelp(true)}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
              title="Ajuda e Instruções"
            >
              <HelpCircle className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>
 
      {/* Main Container */}
      {isDbLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]" id="db_loading_spinner">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-teal-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-500 font-display">Sincronizando com o Firebase...</p>
          </div>
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6" id="main_layout">
          <section
            className="relative overflow-hidden rounded-[28px] bg-slate-950 text-white p-5 sm:p-7 lg:p-8 shadow-xl shadow-slate-900/10"
            aria-labelledby="month-overview-title"
            id="month_overview_hero"
          >
            <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-28 left-1/3 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="relative grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-7 lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    {budget.month} {budget.year}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold border ${
                    totalIn === 0
                      ? 'bg-amber-400/10 text-amber-200 border-amber-300/15'
                      : netBalance >= 0
                        ? 'bg-emerald-400/10 text-emerald-200 border-emerald-300/15'
                        : 'bg-rose-400/10 text-rose-200 border-rose-300/15'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${totalIn === 0 ? 'bg-amber-300' : netBalance >= 0 ? 'bg-emerald-300' : 'bg-rose-300'}`} />
                    {totalIn === 0 ? 'Aguardando entradas' : netBalance >= 0 ? 'Planejamento positivo' : 'Atenção ao saldo'}
                  </span>
                </div>
                <h2 id="month-overview-title" className="font-display font-bold text-2xl sm:text-3xl tracking-tight">
                  Charles, seu mês em um só olhar.
                </h2>
                <p className="text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
                  {totalIn === 0
                    ? 'Registre a primeira entrada para acompanhar a distribuição do dinheiro e o saldo real do mês.'
                    : netBalance >= 0
                      ? 'As entradas cobrem o planejamento atual. Continue acompanhando contas, gastos e metas.'
                      : 'As despesas previstas ainda superam as entradas. Use os indicadores para decidir os próximos ajustes.'}
                </p>

                <div className="flex flex-wrap gap-2.5 mt-5" aria-label="Ações rápidas do mês">
                  <button
                    type="button"
                    onClick={() => navigateToTab('incomes')}
                    className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-teal-50 px-4 py-2.5 text-xs font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    Registrar entrada
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenQuickAdd}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                  >
                    <ShoppingCart className="w-4 h-4 text-rose-300" aria-hidden="true" />
                    Registrar gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToTab('savings')}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                  >
                    <PiggyBank className="w-4 h-4 text-teal-300" aria-hidden="true" />
                    Ver Caixinhas
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 rounded-2xl bg-white/[0.08] border border-white/10 p-4 sm:p-5 backdrop-blur-sm">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Saldo final projetado</span>
                  <strong className={`block font-display font-mono tabular-nums text-2xl sm:text-3xl mt-1 ${netBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {netBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                  <span className="text-[11px] text-slate-400 mt-1 block">Depois de contas, gastos e Caixinhas</span>
                  <div className="mt-4 border-t border-white/10 pt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo após pagamentos registrados</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Sem descontar os compromissos ainda pendentes</span>
                    </div>
                    <div className="sm:text-right">
                      <strong className={`block font-mono text-sm whitespace-nowrap ${availableAfterPaid >= 0 ? 'text-white' : 'text-rose-300'}`}>
                        {availableAfterPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>
                      <span className="block text-[9px] text-amber-200/80 mt-0.5">
                        {pendingCommitments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} pendentes
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contas pagas</span>
                    <strong className="text-sm font-mono text-white">{fixedProgress}%</strong>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-3" role="progressbar" aria-label={`${fixedProgress}% das contas fixas pagas`} aria-valuenow={fixedProgress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-rose-400 rounded-full transition-all" style={{ width: `${fixedProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 block">{paidFixedCount} de {budget.fixedExpenses.length}</span>
                </div>
                <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Metas</span>
                    <strong className="text-sm font-mono text-white">{savingsProgress}%</strong>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-3" role="progressbar" aria-label={`${savingsProgress}% das metas de Caixinhas alcançadas`} aria-valuenow={savingsProgress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-teal-400 rounded-full transition-all" style={{ width: `${savingsProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 block">{budget.savingGoals.length} {budget.savingGoals.length === 1 ? 'Caixinha' : 'Caixinhas'}</span>
                </div>
              </div>
            </div>
          </section>
          
          {/* Responsive KPI Metrics Cards Block */}
          <section className="space-y-5" id="kpi_cards_section" aria-labelledby="cash-flow-title">
            <div className="space-y-3" id="operational_flow_section">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <h2 id="cash-flow-title" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fluxo financeiro do mês</h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 hidden md:inline">
                  Entradas → gastos → contas → metas → saldo
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5" id="operational_flow_grid">
                <MetricCard
                  id="metric-incomes"
                  step={1}
                  title="Entradas"
                  value={totalIn}
                  icon={DollarSign}
                  color="emerald"
                  subtitle="Receitas do mês"
                  details="Soma de todas as receitas e rendas extras registradas neste mês."
                  onClick={() => navigateToTab('incomes')}
                  isActive={activeTab === 'incomes'}
                />

                <MetricCard
                  id="metric-variables"
                  step={2}
                  title="GASTOS VARIÁVEIS"
                  value={variableTotal}
                  icon={ShoppingCart}
                  color="indigo"
                  subtitle={`${budget.variableExpenses.length} ${budget.variableExpenses.length === 1 ? 'lançamento' : 'lançamentos'}`}
                  details="Compras e despesas que podem variar de um mês para outro."
                  onClick={() => navigateToTab('variables')}
                  isActive={activeTab === 'variables'}
                />

                <MetricCard
                  id="metric-balance-for-accounts"
                  step={3}
                  title="Disponível para contas"
                  value={balanceForAccounts}
                  icon={Wallet}
                  color="amber"
                  subtitle="Após gastos variáveis"
                  details="Entradas menos gastos variáveis. Mostra quanto ainda pode ser usado para pagar contas fixas."
                  onClick={() => navigateToTab('overview')}
                  isActive={activeTab === 'overview'}
                />

                <MetricCard
                  id="metric-fixed"
                  step={4}
                  title="CONTAS FIXAS"
                  value={fixedTotal}
                  icon={CreditCard}
                  color="rose"
                  subtitle={`${budget.fixedExpenses.filter(e => e.isPaid).length} de ${budget.fixedExpenses.length} pagas`}
                  details="Total previsto de contas recorrentes, estejam pagas ou pendentes."
                  onClick={() => navigateToTab('fixed')}
                  isActive={activeTab === 'fixed'}
                />

                <MetricCard
                  id="metric-free-balance"
                  step={5}
                  title="Saldo antes das metas"
                  value={remainingBeforeSavings}
                  icon={TrendingUp}
                  color="teal"
                  subtitle="Antes das Caixinhas"
                  details="Entradas menos gastos variáveis e contas fixas, antes de guardar dinheiro nas Caixinhas."
                  onClick={() => navigateToTab('overview')}
                  isActive={false}
                />
              </div>
            </div>

            <div className="space-y-3" id="savings_leftover_section">
              <div className="flex items-center gap-1.5 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metas e resultado final</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" id="savings_leftover_grid">
                <MetricCard
                  id="metric-savings"
                  step={6}
                  title="Caixinhas"
                  value={caixinhasTotal}
                  icon={PiggyBank}
                  color="teal"
                  subtitle={`${budget.savingGoals.length} ${budget.savingGoals.length === 1 ? 'meta ativa' : 'metas ativas'}`}
                  details="Total que já foi guardado nas suas metas neste mês."
                  onClick={() => navigateToTab('savings')}
                  isActive={activeTab === 'savings'}
                />

                <button
                  type="button"
                  id="metric-balance"
                  onClick={() => navigateToTab('overview')}
                  aria-label={`Saldo final. ${netBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Resultado depois de contas, gastos e Caixinhas.`}
                  className={`min-h-32 p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between text-left transition-all cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${
                    activeTab === 'overview' ? 'ring-2 ring-slate-500/20' : ''
                  } ${
                    netBalance >= 0
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-600/10'
                      : 'bg-rose-600 text-white border-rose-700 shadow-sm shadow-rose-600/10'
                  }`}
                >
                  <div className="flex items-start justify-between w-full border-b border-white/10 pb-2 mb-2 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-extrabold bg-white/25 text-white rounded-full shrink-0">
                        7
                      </span>
                      <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">Saldo final</span>
                    </div>
                    <TrendingUp className={`w-4 h-4 text-white/90 shrink-0 ${netBalance >= 0 ? '' : 'rotate-180'}`} aria-hidden="true" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="font-display font-bold text-base xl:text-lg text-white tracking-tight font-mono tabular-nums whitespace-nowrap">
                      {netBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-white/80 font-medium block leading-snug">Depois de gastos, contas e metas</span>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {previousBudget && previousMonthSummary && (
            <MonthComparison
              currentLabel={formatBudgetLabel(budget)}
              previousLabel={formatBudgetLabel(previousBudget)}
              current={currentMonthSummary}
              previous={previousMonthSummary}
            />
          )}

        {/* Tab Navigation Menu */}
        <section className="hidden sm:flex sticky top-[76px] z-30 bg-white/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white shadow-lg shadow-slate-200/50 gap-1" id="tab_navigation">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab_trigger_${tab.id}`}
                onClick={() => navigateToTab(tab.id)}
                aria-current={isSelected ? 'page' : undefined}
                className={`flex-1 min-w-0 py-3 px-2 lg:px-4 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.mobileLabel}</span>
              </button>
            );
          })}
        </section>

        {/* Dynamic Panel Views */}
        <section className="min-h-[400px]" id="tab_contents_container">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={(
                <div className="min-h-72 rounded-3xl border border-slate-100 bg-white flex items-center justify-center" role="status">
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                    <span className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-teal-500 animate-spin" aria-hidden="true" />
                    Carregando esta área…
                  </div>
                </div>
              )}>
              {activeTab === 'overview' && (
                <FinancialCharts
                  totalIn={totalIn}
                  fixedTotal={fixedTotal}
                  variableTotal={variableTotal}
                  caixinhasTotal={caixinhasTotal}
                  fixedExpenses={budget.fixedExpenses}
                  variableExpenses={budget.variableExpenses}
                  savingGoals={budget.savingGoals}
                  currentMonthName={budget.month}
                  currentYear={budget.year}
                  incomes={budget.incomes}
                  observations={budget.observations || {}}
                  onAddIncome={handleAddIncome}
                  onDeleteIncome={handleDeleteIncome}
                  onAddVariableExpense={handleAddVariableExpense}
                  onDeleteVariableExpense={handleDeleteVariableExpense}
                  onUpdateObservations={handleUpdateObservations}
                  onToggleFixedExpensePaid={handleToggleFixedExpensePaid}
                  onToggleVariableExpensePaid={handleToggleVariableExpensePaid}
                />
              )}

              {activeTab === 'incomes' && (
                <IncomeTab
                  incomes={budget.incomes}
                  onAddIncome={handleAddIncome}
                  onUpdateIncome={handleUpdateIncome}
                  onDeleteIncome={handleDeleteIncome}
                  currentYear={budget.year}
                  currentMonthName={budget.month}
                />
              )}

              {activeTab === 'fixed' && (
                <FixedExpensesTab
                  fixedExpenses={budget.fixedExpenses}
                  onUpdateFixedExpense={handleUpdateFixedExpense}
                  onToggleFixedExpensePaid={handleToggleFixedExpensePaid}
                  onAddFixedExpense={handleAddFixedExpense}
                  onDeleteFixedExpense={handleDeleteFixedExpense}
                  onDuplicateFixedExpenseToNextMonth={handleDuplicateFixedExpenseToNextMonth}
                  currentMonthName={budget.month}
                  currentYear={budget.year}
                  accountCategories={budget.accountCategories || []}
                />
              )}

              {activeTab === 'savings' && (
                <SavingsTab
                  savingGoals={budget.savingGoals}
                  onAddTransactionToGoal={handleAddTransactionToGoal}
                  onCreateGoal={handleCreateGoal}
                  onUpdateGoal={handleUpdateGoal}
                  onDeleteGoal={handleDeleteGoal}
                />
              )}

              {activeTab === 'variables' && (
                <VariableExpensesTab
                  variableExpenses={budget.variableExpenses}
                  onAddVariableExpense={handleAddVariableExpense}
                  onDeleteVariableExpense={handleDeleteVariableExpense}
                  onToggleVariableExpensePaid={handleToggleVariableExpensePaid}
                  customCategories={budget.customCategories || []}
                  onAddCustomCategory={handleAddCustomCategory}
                  onDeleteCustomCategory={handleDeleteCustomCategory}
                  currentMonthName={budget.month}
                  currentYear={budget.year}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsTab
                  currentMonthName={budget.month}
                  currentYear={budget.year}
                  onClearCurrentMonth={handleClearCurrentMonth}
                  onClearAllData={handleClearAllData}
                  budgets={budgets}
                  onImportBackup={handleImportBackup}
                  isDbConfigured={isDbConfigured}
                  syncStatus={syncStatus}
                  dbError={dbError}
                  onRetrySync={handleRetryDb}
                  googleToken={googleToken}
                  onConnectGoogle={handleConnectGoogle}
                  onDisconnectGoogle={handleDisconnectGoogle}
                  isExportingSheets={isExportingSheets}
                  exportSuccessUrl={exportSuccessUrl}
                  exportError={exportError}
                  onExportSheets={handleExportSheets}
                  accountCategories={budget.accountCategories || []}
                  onAddAccountCategory={handleAddAccountCategory}
                  onDeleteAccountCategory={handleDeleteAccountCategory}
                />
              )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
      )}

      <nav
        className="sm:hidden fixed inset-x-2 bottom-2 z-40 grid grid-cols-6 gap-1 rounded-2xl border border-white/80 bg-white/95 backdrop-blur-xl p-1.5 shadow-2xl shadow-slate-900/20"
        aria-label="Navegação principal"
        id="mobile_tab_navigation"
      >
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigateToTab(tab.id)}
              aria-current={isSelected ? 'page' : undefined}
              className={`min-w-0 rounded-xl py-2 flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                isSelected ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span className="text-[8.5px] font-bold leading-none truncate w-full px-0.5">{tab.mobileLabel}</span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence>
        {showCommandPalette && (
          <div
            className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/55 px-4 pt-[12vh] backdrop-blur-sm"
            onMouseDown={() => setShowCommandPalette(false)}
            id="command_palette_overlay"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="command-palette-title"
              initial={{ opacity: 0, scale: 0.97, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -12 }}
              onMouseDown={(event) => event.stopPropagation()}
              className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl shadow-slate-950/30"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <Search className="w-5 h-5 shrink-0 text-teal-600" aria-hidden="true" />
                <label htmlFor="command-palette-input" className="sr-only" id="command-palette-title">Busca rápida</label>
                <input
                  id="command-palette-input"
                  autoFocus
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && filteredCommandItems[0]) {
                      event.preventDefault();
                      runCommand(filteredCommandItems[0].action);
                    }
                  }}
                  placeholder="Digite uma tela ou ação…"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                />
                <kbd className="privacy-exempt rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-mono font-bold text-slate-400">ESC</kbd>
              </div>

              <div className="max-h-[55vh] overflow-y-auto p-2" aria-label="Resultados da busca rápida">
                {filteredCommandItems.length > 0 ? filteredCommandItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => runCommand(item.action)}
                      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-700">
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-800">{item.label}</span>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.group}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 shrink-0 text-slate-300 group-hover:text-teal-600" aria-hidden="true" />
                    </button>
                  );
                }) : (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-bold text-slate-700">Nenhuma ação encontrada</p>
                    <p className="mt-1 text-xs text-slate-400">Tente buscar por entradas, gastos, Caixinhas ou ajustes.</p>
                  </div>
                )}
              </div>

              <div className="privacy-exempt border-t border-slate-100 bg-slate-50/80 px-5 py-3 text-[10px] font-medium text-slate-400">
                Use Tab para navegar · Enter abre o primeiro resultado · Ctrl K alterna
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Month Creation Modal */}
      {showNewMonthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" id="new_month_modal_overlay">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-month-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4"
            id="new_month_modal_box"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 id="new-month-title" className="font-display font-bold text-slate-800 text-base flex items-center gap-1.5">
                <Calendar className="w-5 h-5 text-teal-500" />
                Criar Novo Mês
              </h3>
              <button
                type="button"
                onClick={() => setShowNewMonthModal(false)}
                aria-label="Fechar criação de mês"
                className="min-w-11 min-h-11 inline-flex items-center justify-center text-slate-400 hover:text-slate-600 font-bold text-xs rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewMonth} className="space-y-4">
              <div>
                <label htmlFor="new-month-name" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Escolha o Mês</label>
                <select
                  id="new-month-name"
                  value={newMonthName}
                  onChange={(e) => setNewMonthName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 cursor-pointer"
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="new-month-year" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ano</label>
                <input
                  id="new-month-year"
                  type="number"
                  required
                  placeholder="Ex: 2026"
                  value={newMonthYear}
                  onChange={(e) => setNewMonthYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Configuração Inicial</label>
                
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="strat_copy"
                    name="strategy"
                    checked={newMonthStrategy === 'copy_fixed'}
                    onChange={() => setNewMonthStrategy('copy_fixed')}
                    className="text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="strat_copy" className="text-xs font-semibold text-slate-600 cursor-pointer">
                    Copiar Contas Fixas de {budget.month}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="strat_empty"
                    name="strategy"
                    checked={newMonthStrategy === 'empty'}
                    onChange={() => setNewMonthStrategy('empty')}
                    className="text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="strat_empty" className="text-xs font-semibold text-slate-600 cursor-pointer">
                    Iniciar vazio (sem contas fixas)
                  </label>
                </div>
              </div>

              {newMonthError && (
                <div className="flex items-center gap-1.5 text-rose-600 text-[10px] font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{newMonthError}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Criar Mês
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewMonthModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showDemoConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-sm">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="demo-confirm-title"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 id="demo-confirm-title" className="font-display font-bold text-slate-900 text-lg">Carregar dados de demonstração?</h3>
              <p className="text-sm text-slate-500 leading-relaxed mt-2">
                A demonstração substituirá os lançamentos do mês selecionado. Use esta opção somente para explorar o painel com dados fictícios.
              </p>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowDemoConfirm(false)} className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 text-xs font-bold">Cancelar</button>
                <button
                  type="button"
                  onClick={() => {
                    handleLoadDemoData();
                    setShowDemoConfirm(false);
                  }}
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-bold"
                >
                  Carregar demonstração
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" id="help_modal_overlay">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-modal-title"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto w-full p-6 shadow-xl border border-slate-100 flex flex-col justify-between"
              id="help_modal_box"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 id="help-modal-title" className="font-display font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-500" />
                    Como funciona o Dashboard?
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowHelp(false)}
                    aria-label="Fechar ajuda"
                    className="min-w-11 min-h-11 inline-flex items-center justify-center text-slate-400 hover:text-slate-600 text-sm font-bold rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
                  <p>
                    Charles, o painel organiza o mês em um fluxo simples: entradas, gastos, contas, Caixinhas e saldo final.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-600 font-semibold">
                    <li>
                      <strong className="text-slate-800">Meses:</strong> use “Novo Mês” para copiar contas, categorias e estrutura das Caixinhas, sempre com os saldos reiniciados.
                    </li>
                    <li>
                      <strong className="text-slate-800">Lançamentos:</strong> registre receitas e gastos; as datas ficam limitadas ao mês selecionado para evitar erros.
                    </li>
                    <li>
                      <strong className="text-slate-800">Planejamento:</strong> diferencie o saldo após pagamentos do saldo final projetado com os compromissos pendentes.
                    </li>
                    <li>
                      <strong className="text-slate-800">Caixinhas:</strong> crie metas personalizadas, deposite, resgate e acompanhe o progresso de cada objetivo.
                    </li>
                    <li>
                      <strong className="text-slate-800">Atalhos:</strong> pressione Ctrl K para localizar telas e ações; o ícone de olho ativa o modo discreto visual.
                    </li>
                  </ul>
                  <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-500 font-medium">
                    💡 <strong>Dica:</strong> a “Demo Completa” pede confirmação antes de substituir os lançamentos do mês atual.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Entendi, obrigado!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Add Variable Expense Modal */}
      <AnimatePresence>
        {showQuickAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" id="quick_add_modal_overlay">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-add-title"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4"
              id="quick_add_modal_box"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 id="quick-add-title" className="font-display font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <ShoppingCart className="w-5 h-5 text-rose-500" />
                  Gasto Rápido (Variável)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  aria-label="Fechar lançamento rápido"
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 rounded-md cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                <div>
                  <label htmlFor="quick-expense-description" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Descrição do Gasto
                  </label>
                  <input
                    id="quick-expense-description"
                    type="text"
                    required
                    placeholder="Ex: Padaria, Uber, Almoço..."
                    value={quickDesc}
                    onChange={(e) => setQuickDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="quick-expense-value" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Valor (R$)
                    </label>
                    <input
                      id="quick-expense-value"
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={quickValue}
                      onChange={(e) => setQuickValue(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="quick-expense-date" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Data
                    </label>
                    <input
                      id="quick-expense-date"
                      type="date"
                      required
                      min={getMonthDateBounds(currentMonthKey).min}
                      max={getMonthDateBounds(currentMonthKey).max}
                      value={quickDate}
                      onChange={(e) => setQuickDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="quick-expense-category" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Categoria
                  </label>
                  <select
                    id="quick-expense-category"
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 font-semibold outline-none text-slate-700 cursor-pointer"
                  >
                    {[
                      'Alimentação',
                      'Transporte / Gasolina',
                      'Lazer / Delivery',
                      'Saúde / Farmácia',
                      'Roupas / Compras',
                      'Educação / Cursos',
                      'Assinaturas / Serviços',
                      'Outros',
                      ...(budget.customCategories || []).map(cat => cat.name)
                    ].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Status do Pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickIsPaid(true)}
                      aria-pressed={quickIsPaid}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        quickIsPaid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${quickIsPaid ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickIsPaid(false)}
                      aria-pressed={!quickIsPaid}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        !quickIsPaid
                          ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${!quickIsPaid ? 'bg-amber-500' : 'bg-slate-300'}`} />
                      Pendente
                    </button>
                  </div>
                </div>

                {quickError && (
                  <div className="flex items-center gap-1.5 text-rose-600 text-[10px] font-semibold bg-rose-50 p-2 rounded-lg border border-rose-100">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{quickError}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    Adicionar Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
