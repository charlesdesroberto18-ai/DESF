# Security Specification for Monthly Budgets App

## 1. Data Invariants
- A monthly budget has a unique key representing the month in YYYY-MM format.
- A monthly budget must have a month name (string) and a year (integer).
- `incomes`, `fixed_expenses`, `saving_goals`, and `variable_expenses` are arrays.
- `observations` is an object.
- A cópia local continua disponível sem login, mas qualquer leitura ou escrita no Firestore exige uma sessão autenticada pelo Firebase.
- A coleção atual é compartilhada por compatibilidade com os registros existentes. A próxima migração de esquema deve mover os documentos para `users/{uid}/monthly_budgets/{monthKey}` antes de permitir múltiplos usuários.
- O arquivo `firestore.rules` só entra em vigor após um deploy específico do Firebase; publicar a interface na Vercel não altera as regras remotas.

## 2. The "Dirty Dozen" Payloads
Here are 12 specific payloads that should fail static or relational validation:
1. Missing `month_name` field.
2. Missing `year` field.
3. Missing `incomes` list.
4. `month_name` is not a string (e.g. an integer).
5. `year` is not an integer (e.g. a string).
6. `incomes` is not a list.
7. `fixed_expenses` is not a list.
8. `saving_goals` is not a list.
9. `variable_expenses` is not a list.
10. `observations` is not a map.
11. Extra forbidden "Ghost field" like `is_verified`.
12. Invalid `month_key` path variable injection (too large, length > 128).

## 3. Test Runner
Below is the draft structure. Since we run standard Firestore, we will write strict rule validations directly.
