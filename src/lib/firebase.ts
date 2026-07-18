import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, getDocs, setDoc, deleteDoc, writeBatch, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { MonthlyBudget } from '../types';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);

export const isFirebaseConfigured = () => {
  return !!firebaseConfig.projectId;
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

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on initialization
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
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
        incomes: data.incomes || [],
        fixedExpenses: data.fixed_expenses || [],
        savingGoals: data.saving_goals || [],
        variableExpenses: data.variable_expenses || [],
        observations: data.observations || {}
      };
    });
    return budgetsMap;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
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
      updated_at: new Date().toISOString()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
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
    return false;
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
        updated_at: new Date().toISOString()
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'monthly_budgets (bulk)');
    return false;
  }
}
