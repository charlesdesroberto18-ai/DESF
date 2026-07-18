import React, { useRef, useState } from 'react';
import { Trash2, Download, Upload, AlertTriangle, CheckCircle, RefreshCw, Info } from 'lucide-react';
import { MonthlyBudget } from '../types';

interface SettingsTabProps {
  currentMonthName: string;
  currentYear: number;
  onClearCurrentMonth: () => void;
  onClearAllData: () => void;
  budgets: Record<string, MonthlyBudget>;
  onImportBackup: (importedData: Record<string, MonthlyBudget>) => void;
  isDbConfigured?: boolean;
  syncStatus?: 'synced' | 'syncing' | 'error';
  dbError?: string | null;
  onRetrySync?: () => void;
}

export default function SettingsTab({
  currentMonthName,
  currentYear,
  onClearCurrentMonth,
  onClearAllData,
  budgets,
  onImportBackup,
  isDbConfigured = false,
  syncStatus = 'synced',
  dbError = null,
  onRetrySync
}: SettingsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmClearMonth, setShowConfirmClearMonth] = useState(false);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);

  // Export JSON Backup
  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(budgets, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Controle_Financeiro_Charles_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMessage('Backup exportado com sucesso! Salve o arquivo em local seguro.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (e) {
      setErrorMessage('Ocorreu um erro ao exportar o backup.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') return;

        const parsed = JSON.parse(result);

        // Basic validation of schema
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Formato inválido de JSON');
        }

        const keys = Object.keys(parsed);
        if (keys.length === 0) {
          throw new Error('Backup vazio');
        }

        // Validate structure of first entry
        const firstKey = keys[0];
        const item = parsed[firstKey];
        if (!item.month || typeof item.year !== 'number' || !Array.isArray(item.incomes)) {
          throw new Error('Campos obrigatórios ausentes no backup');
        }

        onImportBackup(parsed);
        setSuccessMessage('Backup importado com sucesso! Todos os dados foram atualizados.');
        setErrorMessage('');
        setTimeout(() => setSuccessMessage(''), 5000);
      } catch (err: any) {
        setErrorMessage(`Falha na importação: ${err.message || 'Arquivo JSON inválido ou corrompido.'}`);
        setSuccessMessage('');
        setTimeout(() => setErrorMessage(''), 6000);
      }
    };

    fileReader.readAsText(files[0]);
    // Reset file input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6" id="settings_tab_container">
      {/* Settings Header Banner */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6" id="settings_banner">
        <div>
          <span className="text-slate-300 text-xs font-bold uppercase tracking-widest block mb-1">Configurações e Segurança</span>
          <h2 className="font-display text-3xl font-bold">Painel do Sistema</h2>
          <p className="text-slate-300 text-xs mt-1.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Gerencie backups, exporte seus dados para segurança ou limpe as planilhas.
          </p>
        </div>
        <div className="bg-slate-800 px-4 py-3 rounded-xl border border-slate-700 text-right flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 block uppercase font-bold mb-0.5">Status dos Dados</span>
          {isDbConfigured ? (
            <span className={`font-display text-xs font-bold font-mono ${
              syncStatus === 'syncing' ? 'text-amber-400 animate-pulse' :
              syncStatus === 'synced' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {syncStatus === 'syncing' ? '⏳ Sincronizando...' :
               syncStatus === 'synced' ? '✓ Firebase Nuvem Ativa' : '✗ Erro de Conexão'}
            </span>
          ) : (
            <span className="font-display text-xs font-semibold font-mono text-emerald-400">
              ✓ LocalStorage ({Object.keys(budgets).length} meses)
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm animate-fadeIn" id="settings_success_msg">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm animate-fadeIn" id="settings_error_msg">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4" id="backup_settings_card">
          <h3 className="font-display font-semibold text-slate-800 text-base flex items-center gap-2">
            <Download className="w-5 h-5 text-teal-600" />
            Backup e Recuperação
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Exporte todos os seus dados cadastrados no sistema (receitas, despesas, caixinhas e saldos de todos os meses) para um arquivo JSON em seu computador. Você pode importar este arquivo a qualquer momento para restaurar suas informações.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleExportBackup}
              className="flex-1 bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar Backup (JSON)
            </button>

            <button
              onClick={triggerFileInput}
              className="flex-1 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-xs py-3 px-4 rounded-xl border border-teal-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Importar Backup (JSON)
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Maintenance Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4" id="maintenance_settings_card">
          <h3 className="font-display font-semibold text-slate-800 text-base flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            Limpeza de Dados
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Selecione uma das opções abaixo para limpar as informações registradas. Recomendamos exportar um backup antes de realizar qualquer limpeza profunda.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                setShowConfirmClearMonth(true);
                setShowConfirmClearAll(false);
              }}
              className="flex-1 bg-rose-50 hover:bg-rose-100/80 text-rose-700 font-semibold text-xs py-3 px-4 rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Limpar Mês Atual
            </button>

            <button
              onClick={() => {
                setShowConfirmClearAll(true);
                setShowConfirmClearMonth(false);
              }}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-rose-600/10"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Tudo (Reset Geral)
            </button>
          </div>
        </div>
      </div>

      {/* Firebase Database Setup */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4" id="firebase_integration_card">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-slate-800 text-base flex items-center gap-2">
            <span className="p-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold font-mono">FB</span>
            Sincronização em Nuvem (Firebase)
          </h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isDbConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
          }`}>
            {isDbConfigured ? 'Configurado' : 'Aguardando Configuração'}
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          O aplicativo salva automaticamente todas as suas receitas, despesas, caixinhas e observações na nuvem através do <strong>Google Firebase Firestore</strong>. Caso mude de navegador ou limpe os cookies, suas informações estarão seguras e serão carregadas instantaneamente.
        </p>

        {isDbConfigured && dbError && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-2.5" id="firebase_db_error_box">
            <div className="flex gap-2.5 text-rose-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold font-display uppercase tracking-wider">Falha de Sincronização</h4>
                <p className="text-xs leading-relaxed text-rose-700">{dbError}</p>
              </div>
            </div>
            {onRetrySync && (
              <button
                onClick={onRetrySync}
                className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs py-2 px-3 rounded-lg shadow-sm transition-all cursor-pointer font-sans"
                id="btn_retry_firebase_sync"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: syncStatus === 'syncing' ? '1s' : '0s' }} />
                {syncStatus === 'syncing' ? 'Sincronizando...' : 'Tentar Conectar Novamente'}
              </button>
            )}
          </div>
        )}

        {isDbConfigured && !dbError && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-2.5 text-emerald-800" id="firebase_db_success_box">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500 animate-bounce" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold font-display uppercase tracking-wider">Banco de Dados Conectado</h4>
              <p className="text-xs leading-relaxed text-emerald-700">Tudo pronto! Suas receitas, despesas e caixinhas estão sendo salvas com segurança no Firebase Firestore.</p>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Segurança e Armazenamento</span>
          <p className="text-[11px] text-slate-500">
            A infraestrutura de banco de dados utiliza a coleção <code>monthly_budgets</code> no Firestore. Todas as operações de leitura e gravação são protegidas e validadas conforme as regras de segurança do Firebase definidas no arquivo de configuração do projeto.
          </p>
        </div>
      </div>

      {/* Confirmation Modal for Current Month */}
      {showConfirmClearMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" id="confirm_clear_month_modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-slate-800 text-lg">
                Confirmar Limpeza do Mês?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Você está prestes a limpar todos os dados do mês de <strong className="text-slate-800">{currentMonthName} / {currentYear}</strong>. Todas as receitas, despesas variáveis e históricos deste mês específico serão excluídos permanentemente.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl text-[10px] text-slate-500 font-mono">
              Obs: As metas (caixinhas) e contas fixas deste mês serão redefinidas para os valores padrão iniciais, com saldo economizado zerado.
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  onClearCurrentMonth();
                  setShowConfirmClearMonth(false);
                  setSuccessMessage(`Mês de ${currentMonthName} limpo com sucesso.`);
                  setTimeout(() => setSuccessMessage(''), 4000);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Sim, Limpar Mês
              </button>
              <button
                onClick={() => setShowConfirmClearMonth(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for All Data */}
      {showConfirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" id="confirm_clear_all_modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl border border-rose-200">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="font-display font-bold text-slate-800 text-lg">
                ATENÇÃO: Limpeza Geral!
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Esta ação irá <strong className="text-rose-600 uppercase">apagar permanentemente</strong> todos os meses cadastrados no sistema, histórico, metas acumuladas e configurações. O sistema voltará ao estado original em branco.
            </p>
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-[10px] text-rose-700 font-semibold">
              Esta ação NÃO pode ser desfeita. Recomendamos salvar um arquivo de backup antes de confirmar.
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  onClearAllData();
                  setShowConfirmClearAll(false);
                  setSuccessMessage('Todos os dados foram resetados com sucesso.');
                  setTimeout(() => setSuccessMessage(''), 4000);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Apagar Tudo Definitivamente
              </button>
              <button
                onClick={() => setShowConfirmClearAll(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
