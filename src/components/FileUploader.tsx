
import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FolderOpen, Play, FileText, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Process {
  id: string;
  name: string;
  description: string;
}

interface FileUploaderProps {
  processes: Process[];
}

const FileUploader = ({ processes }: FileUploaderProps) => {
  const [selectedProcess, setSelectedProcess] = useState('');
  const [inputPath, setInputPath] = useState('');
  const [outputPath, setOutputPath] = useState('Relatorio_Unificado.xlsx');
  const [extractorPath, setExtractorPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [folderStats, setFolderStats] = useState<{count: number, types: string[]} | null>(null);
  const [processingLog, setProcessingLog] = useState<string[]>([]);

  const handleFolderSelect = useCallback(() => {
    // Simular seleção de pasta
    const mockPath = 'C:\\Documentos\\Planilhas_Entrada';
    setInputPath(mockPath);
    
    // Simular contagem de arquivos na pasta
    const mockStats = {
      count: 15,
      types: ['xlsx', 'xls', 'csv']
    };
    setFolderStats(mockStats);
    toast.success(`Pasta selecionada: ${mockStats.count} arquivos encontrados`);
  }, []);

  const handleExtractorSelect = useCallback(() => {
    // Simular seleção do arquivo extrator
    const mockPath = 'C:\\Documentos\\extrator_base.xlsx';
    setExtractorPath(mockPath);
    toast.success('Arquivo extrator carregado com sucesso');
  }, []);

  const simulateProcessing = async () => {
    if (!selectedProcess) {
      toast.error('Selecione um processo');
      return;
    }

    if (!inputPath) {
      toast.error('Selecione a pasta de entrada');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingLog([]);

    const isExtractorProcess = selectedProcess === 'extrator-conta';
    
    const logMessages = isExtractorProcess ? [
      'Iniciando processamento com validação do extrator...',
      'Carregando arquivo extrator de referência...',
      'Lendo arquivos da pasta de entrada...',
      `Processando ${folderStats?.count || 0} arquivo(s)...`,
      'Unificando dados das planilhas...',
      'Validando propostas contra base do extrator...',
      'Identificando contas: Abertas vs A Abrir...',
      'Calculando métricas de validação...',
      'Criando relatório de status das contas...',
      'Gerando estatísticas de taxa de sucesso...',
      'Salvando relatório final...',
      'Processo de validação concluído!'
    ] : [
      'Iniciando processamento...',
      'Lendo arquivos da pasta de entrada...',
      `Processando ${folderStats?.count || 0} arquivo(s)...`,
      'Unificando dados...',
      'Aplicando validações...',
      'Criando tabela de resumo...',
      'Ajustando formatação...',
      'Salvando arquivo final...',
      'Processo concluído com sucesso!'
    ];

    for (let i = 0; i < logMessages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProcessingLog(prev => [...prev, logMessages[i]]);
      setProgress((i + 1) / logMessages.length * 100);
    }

    setIsProcessing(false);
    
    if (isExtractorProcess) {
      toast.success('Validação com extrator concluída! Relatório gerado com métricas de contas abertas/a abrir.');
    } else {
      toast.success('Processamento concluído!');
    }
  };

  const isExtractorProcess = selectedProcess === 'extrator-conta';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Configuração do Processamento
          </CardTitle>
          <CardDescription>
            Configure os parâmetros para processamento em lote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="process-select">Processo</Label>
              <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um processo" />
                </SelectTrigger>
                <SelectContent>
                  {processes.map((process) => (
                    <SelectItem key={process.id} value={process.id}>
                      {process.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="output-path">Arquivo de Saída</Label>
              <Input
                id="output-path"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                placeholder="Relatorio_Unificado.xlsx"
              />
            </div>
          </div>

          {isExtractorProcess && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Validação com Extrator</h3>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                Este processo validará as propostas contra a base do extrator para identificar contas abertas vs contas a abrir.
              </p>
              <div className="space-y-2">
                <Label>Arquivo Extrator (Base de Referência)</Label>
                <div className="flex gap-2">
                  <Input
                    value={extractorPath}
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
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Pasta de Entrada
          </CardTitle>
          <CardDescription>
            Selecione a pasta contendo os arquivos para processamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={inputPath}
                placeholder="Caminho da pasta de entrada..."
                readOnly
                className="flex-1"
              />
              <Button onClick={handleFolderSelect} variant="outline">
                <FolderOpen className="h-4 w-4 mr-2" />
                Selecionar Pasta
              </Button>
            </div>

            {folderStats && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-green-800">Arquivos Encontrados</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {folderStats.count} arquivos
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <span className="text-sm text-green-700">Tipos: </span>
                  {folderStats.types.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      .{type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Execução
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={simulateProcessing}
            disabled={isProcessing || !inputPath || (isExtractorProcess && !extractorPath)}
            className="w-full h-12 text-lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processando...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                {isExtractorProcess ? 'Iniciar Validação com Extrator' : 'Iniciar Processamento'}
              </>
            )}
          </Button>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-slate-600">
                {progress.toFixed(0)}% concluído
              </p>
            </div>
          )}

          {processingLog.length > 0 && (
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-40 overflow-y-auto">
              {processingLog.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  {index === processingLog.length - 1 && !isProcessing ? (
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
    </div>
  );
};

export default FileUploader;
