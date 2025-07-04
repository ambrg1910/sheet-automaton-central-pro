
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, AlertCircle, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ProcessorStats {
  total: number;
  success: number;
  errors: number;
  rows: number;
  time: number;
  processedData?: any[];
}

interface FileProcessorProps {
  onComplete: (stats: ProcessorStats, data: any[]) => void;
}

const FileProcessor = ({ onComplete }: FileProcessorProps) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [outputFileName, setOutputFileName] = useState('Relatorio_Unificado.xlsx');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingLog, setProcessingLog] = useState<string[]>([]);

  const handleFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(selectedFiles);
      toast.success(`${selectedFiles.length} arquivos selecionados`);
    }
  };

  const addLog = (message: string) => {
    setProcessingLog(prev => [...prev, message]);
  };

  const processFiles = async () => {
    if (!files || files.length === 0) {
      toast.error('Selecione pelo menos um arquivo');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingLog([]);
    
    const startTime = Date.now();
    
    addLog('Iniciando processamento de arquivos...');
    
    const allData: any[] = [];
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      addLog(`Processando ${i + 1}/${files.length}: ${file.name}`);
      
      try {
        const data = await readFile(file);
        if (data && data.length > 0) {
          // Adicionar coluna de origem
          const dataWithOrigin = data.map(row => ({
            ...row,
            arquivo_origem: file.name
          }));
          allData.push(...dataWithOrigin);
          successCount++;
          addLog(`✓ ${file.name} processado com sucesso (${data.length} linhas)`);
        } else {
          errors.push(`${file.name}: Arquivo vazio`);
          addLog(`⚠ ${file.name}: Arquivo vazio`);
        }
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        addLog(`✗ ${file.name}: Erro ao processar`);
      }
      
      setProgress(((i + 1) / files.length) * 100);
      
      // Pequena pausa para mostrar o progresso
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;

    addLog('Unificando dados...');
    
    // Normalizar nomes de colunas
    const normalizedData = allData.map(row => {
      const normalizedRow: any = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = normalizeColumnName(key);
        normalizedRow[normalizedKey] = row[key];
      });
      return normalizedRow;
    });

    addLog('Salvando arquivo unificado...');
    
    // Criar e baixar arquivo Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(normalizedData);
    XLSX.utils.book_append_sheet(wb, ws, 'Dados Unificados');
    XLSX.writeFile(wb, outputFileName);

    const stats: ProcessorStats = {
      total: files.length,
      success: successCount,
      errors: errors.length,
      rows: normalizedData.length,
      time: processingTime,
      processedData: normalizedData
    };

    addLog(`✓ Processamento concluído! ${normalizedData.length} linhas unificadas`);
    setIsProcessing(false);
    
    toast.success('Processamento concluído com sucesso!');
    onComplete(stats, normalizedData);
  };

  const readFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('Não foi possível ler o arquivo'));
            return;
          }

          let workbook: XLSX.WorkBook;
          
          if (file.name.toLowerCase().endsWith('.csv')) {
            // Para arquivos CSV
            workbook = XLSX.read(data, { type: 'binary' });
          } else {
            // Para arquivos Excel
            workbook = XLSX.read(data, { type: 'array' });
          }

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Encontrar linha do cabeçalho (geralmente linha 10 para Conta Nova)
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(15, jsonData.length); i++) {
            const row = jsonData[i] as any[];
            if (row && row.some(cell => 
              cell && typeof cell === 'string' && 
              (cell.toLowerCase().includes('cpf') || 
               cell.toLowerCase().includes('proposta') ||
               cell.toLowerCase().includes('agente'))
            )) {
              headerRowIndex = i;
              break;
            }
          }

          const headers = jsonData[headerRowIndex] as string[];
          const dataRows = jsonData.slice(headerRowIndex + 1);
          
          const result = dataRows
            .filter(row => row && (row as any[]).some(cell => cell !== null && cell !== undefined && cell !== ''))
            .map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                if (header) {
                  obj[header] = (row as any[])[index] || '';
                }
              });
              return obj;
            });

          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));

      if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const normalizeColumnName = (name: string): string => {
    if (!name || typeof name !== 'string') return String(name || '');
    
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s\.]+/g, '_')
      .replace(/[^a-z0-9_]+/g, '')
      .replace(/__+/g, '_')
      .replace(/^_|_$/g, '');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Processamento de Arquivos
          </CardTitle>
          <CardDescription>
            Selecione múltiplos arquivos Excel ou CSV para unificar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="files">Selecionar Arquivos</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept=".xlsx,.xls,.csv"
              onChange={handleFilesSelect}
            />
            {files && (
              <div className="text-sm text-muted-foreground">
                {files.length} arquivo(s) selecionado(s)
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="output">Nome do Arquivo de Saída</Label>
            <Input
              id="output"
              value={outputFileName}
              onChange={(e) => setOutputFileName(e.target.value)}
              placeholder="Relatorio_Unificado.xlsx"
            />
          </div>

          <Button
            onClick={processFiles}
            disabled={isProcessing || !files}
            className="w-full h-12"
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
              <p className="text-sm text-center text-muted-foreground">
                {progress.toFixed(0)}% concluído
              </p>
            </div>
          )}

          {processingLog.length > 0 && (
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-60 overflow-y-auto">
              {processingLog.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5 flex-shrink-0">›</span>
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

export default FileProcessor;
