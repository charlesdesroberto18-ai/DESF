import 'dotenv/config';
import express from 'express';

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, openaiConfigured: Boolean(process.env.OPENAI_API_KEY) });
});

app.post('/api/ai/financial-assistant', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });
    }

    const { message, budget } = req.body ?? {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem obrigatória.' });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        instructions:
          'Você é um assistente financeiro pessoal dentro de um dashboard. Responda em português do Brasil, de forma objetiva. Analise apenas os dados fornecidos. Não invente valores. Não execute transações e não altere registros. Quando sugerir ações, priorize fluxo de caixa, despesas essenciais, reserva e redução de desperdícios.',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `PERGUNTA DO USUÁRIO:\n${message}\n\nDADOS DO ORÇAMENTO ATUAL:\n${JSON.stringify(budget ?? {}, null, 2)}`,
              },
            ],
          },
        ],
        max_output_tokens: 700,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return res.status(response.status).json({
        error: data?.error?.message || 'Falha ao consultar a OpenAI.',
      });
    }

    const text =
      data?.output_text ||
      data?.output
        ?.flatMap((item: any) => item?.content ?? [])
        ?.find((item: any) => item?.type === 'output_text')?.text ||
      'Não foi possível gerar uma resposta.';

    return res.json({ text });
  } catch (error: any) {
    console.error('Financial assistant error:', error);
    return res.status(500).json({ error: error?.message || 'Erro interno do servidor.' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`DESF API ativa em http://localhost:${port}`);
});
