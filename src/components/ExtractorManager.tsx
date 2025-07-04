
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, CheckCircle, XCircle, TrendingUp, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ExtractorStats {
  totalProposals: number;
  accountsOpen: number;
  accountsToOpen: number;
  successRate: number;
  validationErrors: number;
}

const ExtractorManager = () => {
  const [extractorFile, setExtractorFile] = useState('');
  const [unifiedFile, setUnifiedFile] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<ExtractorStats | null>(null);
  const [validationLog, setValidationLog] = useState<string[]>([]);

  const handleExtractorSelect = () => {
    const mockPath = 'C:\\Documentos\\extrator_base.xlsx';
    setExtractorFile(mockPath);
    toast.success('Arquivo extrator selecionado');
  };

  const handleUnifiedSelect = () => {
    const mockPath = 'C:\\Documentos\\planilha_unificada.xlsx';
    setUnifiedFile(mockPath);
    toast.success('Planilha unificada selecionada');
  };

  const runValidation = async () => {
    if (!extractorFile || !unifiedFile) {
      toast.error('Selecione ambos os arquivos');
      return;
    }

    setIsValidating(true);
    setProgress(0);
    setValidationLog([]);

    const steps = [
      'Carregando arquivo extrator...',
      'Carregando planilha unificada...',
      'Comparando propostas...',
      'Identificando contas já abertas...',
      'Listando contas a abrir...',
      'Calculando métricas de validação...',
      'Gerando relatório de status...',
      'Salvando resultados...'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setValidationLog(prev => [...prev, steps[i]]);
      setProgress((i + 1) / steps.length * 100);
    }

    // Simular resultados da validação
    const mockResults: ExtractorStats = {
      totalProposals: 247,
      accountsOpen: 178,
      accountsToOpen: 69,
      successRate: 94.2,
      validationErrors: 5
    };

    setValidationResults(mockResults);
    setIsValidating(false);
    toast.success('Validação concluída! Relatório gerado.');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Validação com Extrator
          </CardTitle>
          <CardDescription>
            Compare propostas da planilha unificada com a base do extrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Arquivo Extrator (Base de Referência)</Label>
              <div className="flex gap-2">
                <Input
                  value={extractorFile}
                  placeholder="Selecione o arquivo extrator..."
                  readOnly
                  className="flex-1"
                />
                <Button onClick={handleExtractorSelect} variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  Selecionar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Planilha Unificada</Label>
              <div className="flex gap-2">
                <Input
                  value={unifiedFile}
                  placeholder="Selecione a planilha unificada..."
                  readOnly
                  className="flex-1"
                />
                <Button onClick={handleUnifiedSelect} variant="outline">
                  <FileCheck className="h-4 w-4 mr-2" />
                  Selecionar
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={runValidation}
            disabled={isValidating || !extractorFile || !unifiedFile}
            className="w-full h-12"
          >
            {isValidating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Validando...
              </>
            ) : (
              <>
                <Database className="h-5 w-5 mr-2" />
                Iniciar Validação
              </>
            )}
          </Button>

          {isValidating && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-slate-600">
                {progress.toFixed(0)}% concluído
              </p>
            </div>
          )}

          {validationLog.length > 0 && (
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-32 overflow-y-auto">
              {validationLog.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  {index === validationLog.length - 1 && !isValidating ? (
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <span className="text-green-400 mt-0.5 flex-shrink-0">›</span>
                  )}
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resultados da Validação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResults.totalProposals}
                </div>
                <div className="text-sm text-blue-700">Total de Propostas</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {validationResults.accountsOpen}
                </div>
                <div className="text-sm text-green-700">Contas Abertas</div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {validationResults.accountsToOpen}
                </div>
                <div className="text-sm text-orange-700">Contas a Abrir</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {validationResults.successRate}%
                </div>
                <div className="text-sm text-purple-700">Taxa de Sucesso</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3" />
                  {validationResults.accountsOpen} Encontradas no Extrator
                </Badge>
                <Badge className="flex items-center gap-1 bg-orange-100 text-orange-800">
                  <XCircle className="h-3 w-3" />
                  {validationResults.accountsToOpen} Não Encontradas
                </Badge>
              </div>
              
              <Button variant="outline">
                <FileCheck className="h-4 w-4 mr-2" />
                Baixar Relatório
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExtractorManager;
