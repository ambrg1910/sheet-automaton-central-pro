
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Database, CheckCircle, XCircle, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ValidationStats {
  totalPropostas: number;
  contasAbertas: number;
  contasPendentes: number;
  taxaSucesso: number;
  tempo: number;
}

interface ProposalValidatorProps {
  unifiedData?: any[];
}

const ProposalValidator = ({ unifiedData }: ProposalValidatorProps) => {
  const [extractorFile, setExtractorFile] = useState<File | null>(null);
  const [outputFileName, setOutputFileName] = useState('Relatorio_Validacao.xlsx');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationStats | null>(null);
  const [validationLog, setValidationLog] = useState<string[]>([]);

  const handleExtractorSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setExtractorFile(file);
      toast.success('Arquivo extrator selecionado');
    }
  };

  const addLog = (message: string) => {
    setValidationLog(prev => [...prev, message]);
  };

  const runValidation = async () => {
    if (!unifiedData || unifiedData.length === 0) {
      toast.error('Primeiro execute o processamento de arquivos');
      return;
    }

    if (!extractorFile) {
      toast.error('Selecione o arquivo extrator');
      return;
    }

    setIsValidating(true);
    setValidationLog([]);
    
    const startTime = Date.now();

    try {
      addLog('Carregando arquivo extrator...');
      const extractorData = await readExtractorFile(extractorFile);
      
      addLog('Extraindo propostas do extrator...');
      const extractorProposals = new Set(
        extractorData
          .map(row => row.Proposta || row.proposta)
          .filter(prop => prop && prop.toString().trim() !== '')
          .map(prop => prop.toString().trim())
      );

      addLog(`${extractorProposals.size} propostas encontradas no extrator`);
      addLog('Validando propostas...');

      // Validar cada proposta
      const validatedData = unifiedData.map(row => {
        const proposta = (row.Proposta || row.proposta || '').toString().trim();
        const status = extractorProposals.has(proposta) ? 'CONTA ABERTA' : 'PENDENTE';
        
        return {
          ...row,
          Status_Conta: status
        };
      });

      // Calcular estatísticas
      const contasAbertas = validatedData.filter(row => row.Status_Conta === 'CONTA ABERTA').length;
      const contasPendentes = validatedData.length - contasAbertas;
      const taxaSucesso = (contasAbertas / validatedData.length) * 100;

      addLog('Salvando relatório de validação...');
      
      // Criar arquivo Excel com resultados
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(validatedData);
      XLSX.utils.book_append_sheet(wb, ws, 'Validação de Propostas');
      
      // Adicionar aba de resumo
      const summaryData = [
        { Métrica: 'Total de Propostas', Valor: validatedData.length },
        { Métrica: 'Contas Abertas', Valor: contasAbertas },
        { Métrica: 'Contas Pendentes', Valor: contasPendentes },
        { Métrica: 'Taxa de Sucesso (%)', Valor: taxaSucesso.toFixed(1) }
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo');
      
      XLSX.writeFile(wb, outputFileName);

      const endTime = Date.now();
      const tempo = (endTime - startTime) / 1000;

      const stats: ValidationStats = {
        totalPropostas: validatedData.length,
        contasAbertas,
        contasPendentes,
        taxaSucesso,
        tempo
      };

      setValidationResults(stats);
      addLog(`✓ Validação concluída! Taxa de sucesso: ${taxaSucesso.toFixed(1)}%`);
      
      toast.success('Validação concluída com sucesso!');
      
    } catch (error) {
      console.error('Erro na validação:', error);
      addLog(`✗ Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast.error('Erro durante a validação');
    } finally {
      setIsValidating(false);
    }
  };

  const readExtractorFile = (file: File): Promise<any[]> => {
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
            workbook = XLSX.read(data, { type: 'binary' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          resolve(jsonData);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Validação de Propostas
          </CardTitle>
          <CardDescription>
            Compare propostas unificadas com o arquivo extrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="extractor">Arquivo Extrator (Base de Referência)</Label>
            <Input
              id="extractor"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExtractorSelect}
            />
            {extractorFile && (
              <div className="text-sm text-muted-foreground">
                Arquivo selecionado: {extractorFile.name}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="validation-output">Nome do Relatório de Validação</Label>
            <Input
              id="validation-output"
              value={outputFileName}
              onChange={(e) => setOutputFileName(e.target.value)}
              placeholder="Relatorio_Validacao.xlsx"
            />
          </div>

          <Button
            onClick={runValidation}
            disabled={isValidating || !extractorFile || !unifiedData}
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
                  {validationResults.totalPropostas.toLocaleString()}
                </div>
                <div className="text-sm text-blue-700">Total de Propostas</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {validationResults.contasAbertas.toLocaleString()}
                </div>
                <div className="text-sm text-green-700">Contas Abertas</div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {validationResults.contasPendentes.toLocaleString()}
                </div>
                <div className="text-sm text-orange-700">Contas Pendentes</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {validationResults.taxaSucesso.toFixed(1)}%
                </div>
                <div className="text-sm text-purple-700">Taxa de Sucesso</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3" />
                  {validationResults.contasAbertas.toLocaleString()} Encontradas no Extrator
                </Badge>
                <Badge className="flex items-center gap-1 bg-orange-100 text-orange-800">
                  <XCircle className="h-3 w-3" />
                  {validationResults.contasPendentes.toLocaleString()} Não Encontradas
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Processado em {validationResults.tempo.toFixed(2)}s
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProposalValidator;
