import assert from 'node:assert/strict';
import { POST } from '../api/monthly-insights';

const summary = {
  month: 'JULHO',
  year: 2026,
  totalIncome: 4_000,
  fixedExpensesTotal: 1_600,
  variableExpensesTotal: 700,
  savingsTotal: 500,
  finalBalance: 1_200,
  incomeCount: 3,
  fixedExpenseCount: 7,
  paidFixedExpenseCount: 4,
  variableExpenseCount: 8,
  savingsGoalCount: 2,
  savingsTargetTotal: 1_000,
  variableCategories: [
    { name: 'Alimentação', value: 450, count: 5 },
    { name: 'Transporte', value: 250, count: 3 },
  ],
};

const createRequest = (body: unknown) => new Request(
  'http://localhost/api/monthly-insights',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  },
);

delete process.env.OPENCODE_ZEN_API_KEY;
const unconfiguredResponse = await POST(createRequest(summary));
assert.equal(unconfiguredResponse.status, 503);

process.env.OPENCODE_ZEN_API_KEY = 'test-key-not-a-real-secret';
const originalFetch = globalThis.fetch;
let capturedRequestBody: Record<string, unknown> | null = null;

globalThis.fetch = async (_input, init) => {
  capturedRequestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
  return new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: [
            '1. Mantenha as contas fixas dentro do valor planejado.',
            '2. Revise a categoria de alimentação antes do próximo fechamento.',
            '3. Preserve a reserva mensal e acompanhe o saldo final.',
          ].join('\n'),
        },
      },
    ],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

try {
  const response = await POST(createRequest(summary));
  assert.equal(response.status, 200);

  const result = await response.json() as { insights: string[]; model: string; dataScope: string };
  assert.equal(result.model, 'deepseek-v4-flash-free');
  assert.equal(result.dataScope, 'aggregated');
  assert.equal(result.insights.length, 3);

  assert.ok(capturedRequestBody);
  assert.equal(capturedRequestBody.model, 'deepseek-v4-flash-free');

  const serializedRequest = JSON.stringify(capturedRequestBody);
  assert.match(serializedRequest, /Alimentação/);
  assert.doesNotMatch(serializedRequest, /description|observations|account|email|incomeName/);
} finally {
  globalThis.fetch = originalFetch;
  delete process.env.OPENCODE_ZEN_API_KEY;
}

console.log('monthly-insights: ok');
