import { request } from './apiClient';

export type FinanceCurrency = 'UZS' | 'USD';
export type FinanceType = 'INCOME' | 'EXPENSE';
export type FinanceAccount = { id: string; name: string; type: 'CASH' | 'CARD' | 'BANK' | 'OTHER'; currency: FinanceCurrency; openingBalance: string; balance: string; isDefault: boolean };
export type FinanceCategory = { id: string; name: string; type: 'INCOME' | 'EXPENSE' | 'BOTH'; icon?: string | null; color?: string | null };
export type FinanceTransaction = { id: string; type: FinanceType; amount: string; currency: FinanceCurrency; title: string; description?: string | null; transactionDate: string; category?: FinanceCategory | null; account?: Pick<FinanceAccount, 'id' | 'name' | 'type' | 'currency'> | null };
export type FinanceSummary = { from: string; to: string; currency: FinanceCurrency | null; totalIncome: string; totalExpense: string; netProfit: string; transactionCount: number; topExpenseCategories: Array<{ category: FinanceCategory | null; total: string; percentage: string }> };

export const financeApi = {
  summary: (from: string, to: string, currency: FinanceCurrency) => request<FinanceSummary>(`/finance/summary?${new URLSearchParams({ from, to, currency })}`),
  transactions: (currency: FinanceCurrency, limit = 100) => request<{ items: FinanceTransaction[] }>(`/finance/transactions?${new URLSearchParams({ currency, limit: String(limit) })}`),
  categories: () => request<FinanceCategory[]>('/finance/categories'),
  accounts: (currency: FinanceCurrency) => request<FinanceAccount[]>(`/finance/accounts?currency=${currency}`),
  createTransaction: (input: { type: FinanceType; amount: string; currency: FinanceCurrency; title: string; description?: string; transactionDate: string; categoryId?: string; accountId?: string }) => request<FinanceTransaction>('/finance/transactions', { method: 'POST', body: JSON.stringify(input) }),
  deleteTransaction: (id: string) => request<{ message: string }>(`/finance/transactions/${id}`, { method: 'DELETE' }),
};
