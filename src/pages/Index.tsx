
import { useState } from 'react';
import { BarChart3, FileText, Database } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileProcessor from '@/components/FileProcessor';
import ProposalValidator from '@/components/ProposalValidator';

interface ProcessorStats {
  total: number;
  success: number;
  errors: number;
  rows: number;
  time: number;
  processedData?: any[];
}

const Index = () => {
  const [activeTab, setActiveTab] = useState('unificar');
  const [unifiedData, setUnifiedData] = useState<any[]>([]);
  const [processingStats, setProcessingStats] = useState<ProcessorStats | null>(null);

  const handleProcessingComplete = (stats: ProcessorStats, data: any[]) => {
    setProcessingStats(stats);
    setUnifiedData(data);
    // Automaticamente ir para a aba de validação após o processamento
    setTimeout(() => {
      setActiveTab('validar');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Central de Automação de Planilhas v15.0
          </h1>
          <p className="text-lg text-slate-600">
            Processamento e validação de propostas com sistema de extrator
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-fit">
            <TabsTrigger value="unificar" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              1. Unificar Relatórios
            </TabsTrigger>
            <TabsTrigger value="validar" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              2. Validar Contas Abertas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unificar" className="space-y-6">
            <FileProcessor onComplete={handleProcessingComplete} />
            
            {processingStats && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Resumo do Processamento
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {processingStats.total}
                    </div>
                    <div className="text-sm text-blue-700">Arquivos Encontrados</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {processingStats.success}
                    </div>
                    <div className="text-sm text-green-700">Processados</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {processingStats.errors}
                    </div>
                    <div className="text-sm text-orange-700">Com Erro</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {processingStats.rows.toLocaleString()}
                    </div>
                    <div className="text-sm text-purple-700">Linhas Unificadas</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600 text-center">
                  Processamento concluído em {processingStats.time.toFixed(2)} segundos
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="validar" className="space-y-6">
            <ProposalValidator unifiedData={unifiedData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
