import { MonthlyBudget } from '../types';

/**
 * Creates a brand new Google Spreadsheet with structured sheets
 * and writes all budget data from a MonthlyBudget object.
 */
export async function exportBudgetToGoogleSheets(
  budget: MonthlyBudget,
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create Spreadsheet with Tabs matching budget sections
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `Controle Financeiro Charles — ${budget.month}/${budget.year}`,
      },
      sheets: [
        { properties: { title: 'Resumo Geral' } },
        { properties: { title: 'Entradas (Receitas)' } },
        { properties: { title: 'Contas Fixas' } },
        { properties: { title: 'Caixinhas (Metas)' } },
        { properties: { title: 'Gastos Variáveis' } }
      ],
    }),
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    console.error('Error creating spreadsheet:', errText);
    throw new Error(`Falha ao criar planilha: ${createResponse.statusText}`);
  }

  const spreadsheet = await createResponse.json();
  const { spreadsheetId, spreadsheetUrl } = spreadsheet;

  // 2. Prepare data for each tab
  // Calculate totals
  const totalIncomes = budget.incomes.reduce((sum, item) => sum + item.value, 0);
  const totalFixed = budget.fixedExpenses.reduce((sum, item) => sum + item.value, 0);
  const totalFixedPaid = budget.fixedExpenses.filter(e => e.isPaid).reduce((sum, item) => sum + item.value, 0);
  const totalFixedUnpaid = totalFixed - totalFixedPaid;
  const totalSavings = budget.savingGoals.reduce((sum, item) => sum + item.target, 0);
  const totalSavingsSaved = budget.savingGoals.reduce((sum, item) => sum + item.current, 0);
  const totalVariables = budget.variableExpenses.reduce((sum, item) => sum + item.value, 0);
  const totalVariablesPaid = budget.variableExpenses.filter(e => e.isPaid).reduce((sum, item) => sum + item.value, 0);
  const totalVariablesUnpaid = totalVariables - totalVariablesPaid;
  const netBalance = totalIncomes - totalFixed - totalSavings - totalVariables;

  // Format Helper
  const fmt = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Tab: Resumo Geral
  const resumoValues = [
    ['CONTROLE FINANCEIRO — CHARLES', ''],
    ['Competência:', `${budget.month} / ${budget.year}`],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
    [],
    ['DASHBOARD DE RESUMO', ''],
    ['Indicador / Categoria', 'Valor (R$)'],
    ['(+) Receitas Totais', totalIncomes],
    ['(-) Contas Fixas (Mensais)', totalFixed],
    ['(-) Caixinhas (Metas de Poupança)', totalSavings],
    ['(-) Gastos Variáveis (Diários)', totalVariables],
    ['(=) SOBRA LÍQUIDA (Poupança)', netBalance],
    [],
    ['ANÁLISE DE CONTAS FIXAS', ''],
    ['Total Pago', totalFixedPaid],
    ['Total Pendente', totalFixedUnpaid],
    [],
    ['ANÁLISE DE GASTOS VARIÁVEIS', ''],
    ['Total Pago (Realizado)', totalVariablesPaid],
    ['Total Pendente (Agendado)', totalVariablesUnpaid]
  ];

  // Tab: Entradas (Receitas)
  const receitasValues = [
    ['ENTRADAS (RECEITAS) DO MÊS', '', '', '', ''],
    ['Semana', 'Descrição', 'Categoria', 'Data de Recebimento', 'Valor (R$)'],
    ...budget.incomes.map(inc => [
      `Semana ${inc.week}`,
      inc.name,
      inc.category,
      inc.date || '-',
      inc.value
    ]),
    [],
    ['Total de Entradas', '', '', '', totalIncomes]
  ];

  // Tab: Contas Fixas
  const contasFixasValues = [
    ['CONTAS FIXAS DA RESIDÊNCIA', '', '', ''],
    ['Nome da Despesa', 'Valor (R$)', 'Data / Dia de Vencimento', 'Status'],
    ...budget.fixedExpenses.map(fe => {
      let dueStr = 'Sem data';
      if (fe.dueDate) {
        const parts = fe.dueDate.split('-');
        dueStr = parts.length === 3 ? `Dia ${parts[2]}` : fe.dueDate;
      }
      return [
        fe.name,
        fe.value,
        dueStr,
        fe.isPaid ? 'Pago ✓' : 'Pendente ✗'
      ];
    }),
    [],
    ['Total Contas Fixas', totalFixed, '', '']
  ];

  // Tab: Caixinhas (Metas)
  const caixinhasValues = [
    ['METAS E CAIXINHAS DE POUPANÇA', '', ''],
    ['Meta / Objetivo', 'Aporte Mensal Alvo (R$)', 'Total Economizado (R$)'],
    ...budget.savingGoals.map(sg => [
      sg.name,
      sg.target,
      sg.current
    ]),
    [],
    ['Total Planejado', totalSavings, totalSavingsSaved]
  ];

  // Tab: Gastos Variáveis
  const variaveisValues = [
    ['GASTOS VARIÁVEIS E LANÇAMENTOS DIÁRIOS', '', '', '', ''],
    ['Descrição', 'Categoria', 'Valor (R$)', 'Data', 'Status'],
    ...budget.variableExpenses.map(ve => [
      ve.description,
      ve.category,
      ve.value,
      ve.date,
      ve.isPaid ? 'Pago ✓' : 'Pendente ✗'
    ]),
    [],
    ['Total de Gastos Variáveis', '', totalVariables, '', '']
  ];

  // 3. Send batch update values to all sheets
  const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'Resumo Geral!A1', values: resumoValues },
        { range: 'Entradas (Receitas)!A1', values: receitasValues },
        { range: 'Contas Fixas!A1', values: contasFixasValues },
        { range: 'Caixinhas (Metas)!A1', values: caixinhasValues },
        { range: 'Gastos Variáveis!A1', values: variaveisValues }
      ]
    })
  });

  if (!updateResponse.ok) {
    const errText = await updateResponse.text();
    console.error('Error writing spreadsheet values:', errText);
    throw new Error(`Falha ao preencher planilha: ${updateResponse.statusText}`);
  }

  // 4. Style the sheets to look beautiful and professional using batchUpdate formatting!
  // Let's add some pretty formatting like backgrounds, bold headers, gridlines, and border styling.
  try {
    const sheetsMeta = spreadsheet.sheets;
    const requests = [];

    for (const sheet of sheetsMeta) {
      const sheetId = sheet.properties.sheetId;
      const title = sheet.properties.title;

      // Ensure grid lines are visible
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: { showGridLines: true }
          },
          fields: 'gridProperties.showGridLines'
        }
      });

      // Style Header Title Block (Row 1)
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 5
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.08, green: 0.45, blue: 0.45 }, // Dark Teal
              textFormat: {
                foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                fontSize: 12,
                bold: true
              },
              horizontalAlignment: 'LEFT',
              verticalAlignment: 'MIDDLE'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
      });

      // Style Column Header Row (Row 2, or Row 5 in Resumo Geral)
      const headerRow = title === 'Resumo Geral' ? 5 : 1;
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: headerRow,
            endRowIndex: headerRow + 1,
            startColumnIndex: 0,
            endColumnIndex: 6
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.94, green: 0.97, blue: 0.97 }, // Very Light Teal
              textFormat: {
                foregroundColor: { red: 0.08, green: 0.35, blue: 0.35 },
                fontSize: 10,
                bold: true
              },
              horizontalAlignment: 'LEFT',
              verticalAlignment: 'MIDDLE',
              borders: {
                bottom: { style: 'MEDIUM', color: { red: 0.08, green: 0.45, blue: 0.45 } }
              }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)'
        }
      });

      // Auto-fit column widths
      requests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 6
          }
        }
      });
    }

    // Call spreadsheets.batchUpdate to apply formatting
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests })
    });
  } catch (styleErr) {
    // If styling fails, we log it but don't crash, since data is already successfully exported!
    console.warn('Could not apply visual styles to Google Sheets:', styleErr);
  }

  return { spreadsheetId, spreadsheetUrl };
}
