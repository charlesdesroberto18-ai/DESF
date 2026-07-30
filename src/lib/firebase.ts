import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, getDocs, setDoc, deleteDoc, writeBatch, query, limit } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { MonthlyBudget } from '../types';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (firebaseConfigJson as any).firestoreDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
};
const firebaseDisabled = import.meta.env.VITE_DISABLE_FIREBASE === 'true';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter o token de acesso do Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Erro no Google Sign-in:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export const isFirebaseConfigured = () => {
  return !firebaseDisabled && !!firebaseConfig.projectId;
};

// Error handler exactly as mandated in the firebase-integration skill:
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const getFirestoreErrorCode = (error: unknown): string => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return 'unknown';
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && /^[a-z0-9/_-]+$/i.test(code) ? code : 'unknown';
};

const getSafeFirestoreMessage = (code: string): string => {
  if (code.includes('permission-denied') || code.includes('unauthenticated')) {
    return 'Entre com sua conta Google para sincronizar os dados na nuvem.';
  }
  if (code.includes('unavailable') || code.includes('network')) {
    return 'A sincronização está temporariamente indisponível. Seus dados locais foram preservados.';
  }
  return 'Não foi possível sincronizar os dados agora. Seus dados locais foram preservados.';
};

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const code = getFirestoreErrorCode(error);

  // Keep diagnostics useful without logging names, e-mails, user IDs or the
  // original server message, which may contain account or document details.
  console.error('Firestore operation failed', { code, operationType, path });

  const safeError = new Error(getSafeFirestoreMessage(code));
  safeError.name = 'FirestoreOperationError';
  throw safeError;
}

// Validate connection to Firestore on initialization
export async function testConnection() {
  try {
    await getDocs(query(collection(db, 'monthly_budgets'), limit(1)));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'monthly_budgets');
  }
}

// Load all budgets from Firebase
export async function loadBudgetsFromFirebase(): Promise<Record<string, MonthlyBudget> | null> {
  const path = 'monthly_budgets';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const budgetsMap: Record<string, MonthlyBudget> = {};
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      budgetsMap[docSnap.id] = {
        month: data.month_name,
        year: data.year,
        updatedAt: data.updated_at,
        incomes: data.incomes || [],
        fixedExpenses: data.fixed_expenses || [],
        savingGoals: data.saving_goals || [],
        variableExpenses: data.variable_expenses || [],
        observations: data.observations || {},
        customCategories: data.custom_categories || [],
        accountCategories: data.account_categories || []
      };
    });
    return budgetsMap;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Save or Update a single month's budget in Firebase
export async function saveBudgetToFirebase(monthKey: string, budget: MonthlyBudget): Promise<boolean> {
  const path = `monthly_budgets/${monthKey}`;
  try {
    await setDoc(doc(db, 'monthly_budgets', monthKey), {
      month_name: budget.month,
      year: budget.year,
      incomes: budget.incomes,
      fixed_expenses: budget.fixedExpenses,
      saving_goals: budget.savingGoals,
      variable_expenses: budget.variableExpenses,
      observations: budget.observations || {},
      custom_categories: budget.customCategories || [],
      account_categories: budget.accountCategories || [],
      updated_at: budget.updatedAt || new Date().toISOString()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete a single month's budget from Firebase
export async function deleteBudgetFromFirebase(monthKey: string): Promise<boolean> {
  const path = `monthly_budgets/${monthKey}`;
  try {
    await deleteDoc(doc(db, 'monthly_budgets', monthKey));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Bulk upsert all budgets (e.g. for restore / import / initialize)
export async function bulkSaveBudgetsToFirebase(budgets: Record<string, MonthlyBudget>): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    const entries = Object.entries(budgets);
    if (entries.length === 0) return true;

    for (const [monthKey, budget] of entries) {
      const docRef = doc(db, 'monthly_budgets', monthKey);
      batch.set(docRef, {
        month_name: budget.month,
        year: budget.year,
        incomes: budget.incomes,
        fixed_expenses: budget.fixedExpenses,
        saving_goals: budget.savingGoals,
        variable_expenses: budget.variableExpenses,
        observations: budget.observations || {},
        custom_categories: budget.customCategories || [],
        account_categories: budget.accountCategories || [],
        updated_at: budget.updatedAt || new Date().toISOString()
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'monthly_budgets (bulk)');
  }
}
