export interface Income {
  id: string;
  name: string; // Descrição
  value: number;
  category: string; // 'Salário' | 'Freelance' | 'Venda' | 'Extra' | 'Garçom' ou personalizada
  date: string;
  week: 1 | 2 | 3 | 4 | 5;
}

export interface FixedExpense {
  id: string;
  name: string;
  value: number;
  isPaid: boolean;
  dueDate?: string; // Format: "YYYY-MM-DD"
  category?: string; // Category of the account (fixed expense)
}

export interface SavingGoal {
  id: string;
  name: string;
  target: number; // monthly target to save
  current: number; // actual saved this month
  icon: string;
}

export interface VariableExpense {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string;
  isPaid: boolean; // true for Pago, false for Pendente
}

export interface CustomCategory {
  id: string;
  name: string;
  note?: string;
}

export interface MonthlyBudget {
  month: string; // e.g., "JULHO"
  year: number; // e.g., 2026
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  savingGoals: SavingGoal[];
  variableExpenses: VariableExpense[];
  observations?: Record<string, string>; // date (YYYY-MM-DD) -> text
  customCategories?: CustomCategory[];
  accountCategories?: CustomCategory[];
}
