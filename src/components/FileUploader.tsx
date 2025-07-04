
import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FolderOpen, Play, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [processingLog, setProcessingLog] = useState<string[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
    toast.success(`${droppedFiles.length} arquivo(s) adicionado(s)`);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      toast.success(`${selectedFiles.length} arquivo(s) selecionado(s)`);
    }
  }, []);

  const simulateProcessing = async () => {
    if (!selectedProcess) {
      toast.error('Selecione um processo');
      return;
    }

    if (files.length === 0) {
      toast.error('Adicione pelo menos um arquivo');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingLog([]);

    const logMessages = [
      'Iniciando processamento...',
      'Validando arquivos de entrada...',
      'Lendo configurações do processo...',
      `Processando ${files.length} arquivo(s)...`,
      'Unificando dados...',
      'Aplicando validações...',
      'Criando tabela de resumo...',
      'Ajustando formatação...',
      'Salvando arquivo final...',
      'Processo concluído com sucesso!'
    ];

    for (let i = 0; i < logMessages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setProcessingLog(prev => [...prev, logMessages[i]]);
      setProgress((i + 1) / logMessages.length * 100);
    }

    setIsProcessing(false);
    toast.success('Processamento concluído!');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Configuração do Processamento
          </CardTitle>
          <CardDescription>
            Configure os parâmetros e arquivos para processamento
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Upload de Arquivos
          </CardTitle>
          <CardDescription>
            Adicione os arquivos que serão processados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Arraste arquivos aqui ou clique para selecionar
            </h3>
            <p className="text-slate-500">
              Suporte para arquivos Excel (.xlsx, .xls) e CSV
            </p>
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
            />
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Arquivos Selecionados ({files.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-slate-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            disabled={isProcessing}
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
                Iniciar Processamento
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
