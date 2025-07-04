
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Database, CheckCircle, XCircle, TrendingUp, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ValidationStats {
  totalArquivos: number;
  arquivosProcessados: number;
  arquivosComErro: number;
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
  const [inputFolder, setInputFolder] = useState<string>('');
  const [extractorFile, setExtractorFile] = useState<File | null>(null);
  const [outputFileName, setOutputFileName] = useState('Relatorio_Validacao_Completo.xlsx');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationStats | null>(null);
  const [validationLog, setValidationLog] = useState<string[]>([]);

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Simular seleção de pasta através de múltiplos arquivos
      setInputFolder(`${files.length} arquivos selecionados`);
      toast.success(`${files.length} arquivos selecionados para processamento`);
    }
  };

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
            workbook = XLSX.read(data, { type: 'binary' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Encontrar linha do cabeçalho (linha 10 por padrão para Conta Nova)
          let headerRowIndex = 9; // Linha 10 (índice 9)
          
          // Verificar se existe cabeçalho na linha 10
          if (jsonData.length > headerRowIndex) {
            const potentialHeader = jsonData[headerRowIndex] as any[];
            if (!potentialHeader || !potentialHeader.some(cell => 
              cell && typeof cell === 'string' && 
              (cell.toLowerCase().includes('cpf') || 
               cell.toLowerCase().includes('proposta'))
            )) {
              // Se não encontrar na linha 10, procurar nas primeiras 15 linhas
              for (let i = 0; i < Math.min(15, jsonData.length); i++) {
                const row = jsonData[i] as any[];
                if (row && row.some(cell => 
                  cell && typeof cell === 'string' && 
                  (cell.toLowerCase().includes('cpf') || 
                   cell.toLowerCase().includes('proposta'))
                )) {
                  headerRowIndex = i;
                  break;
                }
              }
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
                  const normalizedKey = normalizeColumnName(header);
                  obj[normalizedKey] = (row as any[])[index] || '';
                  // Manter também a chave original para compatibilidade
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

  const runValidation = async () => {
    const fileInput = document.getElementById('input-files') as HTMLInputElement;
    const files = fileInput?.files;
    
    if (!files || files.length === 0) {
      toast.error('Selecione pelo menos um arquivo para processar');
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
      addLog('=== INICIANDO VALIDAÇÃO OTIMIZADA ===');
      addLog('Etapa 1: Unificação em memória dos arquivos de entrada...');
      
      // Unificar todos os arquivos em memória
      const allData: any[] = [];
      const errors: string[] = [];
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        addLog(`Processando arquivo ${i + 1}/${files.length}: ${file.name}`);
        
        try {
          const data = await readFile(file);
          if (data && data.length > 0) {
            // Verificar se contém coluna Proposta
            const hasPropostaColumn = data.some(row => 
              Object.keys(row).some(key => 
                key.toLowerCase().includes('proposta')
              )
            );
            
            if (!hasPropostaColumn) {
              errors.push(`${file.name}: Coluna 'Proposta' não encontrada`);
              addLog(`⚠ ${file.name}: Coluna 'Proposta' não encontrada`);
              continue;
            }

            // Adicionar coluna de origem
            const dataWithOrigin = data.map(row => ({
              ...row,
              arquivo_origem: file.name
            }));
            allData.push(...dataWithOrigin);
            successCount++;
            addLog(`✓ ${file.name}: ${data.length} linhas processadas`);
          } else {
            errors.push(`${file.name}: Arquivo vazio`);
            addLog(`⚠ ${file.name}: Arquivo vazio`);
          }
        } catch (error) {
          errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          addLog(`✗ ${file.name}: Erro ao processar`);
        }
      }

      if (allData.length === 0) {
        addLog('✗ Nenhum dado válido encontrado nos arquivos');
        toast.error('Nenhum dado válido encontrado nos arquivos');
        return;
      }

      addLog(`Etapa 2: ${allData.length} linhas unificadas com sucesso`);
      addLog('Etapa 3: Carregando arquivo extrator...');
      
      // Carregar arquivo extrator
      const extractorData = await readFile(extractorFile);
      
      // Extrair propostas do extrator
      addLog('Etapa 4: Extraindo propostas do arquivo mestre...');
      const extractorProposals = new Set<string>();
      
      extractorData.forEach(row => {
        Object.keys(row).forEach(key => {
          if (key.toLowerCase().includes('proposta')) {
            const proposta = row[key];
            if (proposta && proposta.toString().trim() !== '') {
              extractorProposals.add(proposta.toString().trim());
            }
          }
        });
      });

      addLog(`${extractorProposals.size} propostas encontradas no extrator`);
      addLog('Etapa 5: Executando validação e reconciliação...');

      // Validar cada proposta
      const validatedData = allData.map(row => {
        let proposta = '';
        
        // Encontrar a coluna Proposta (flexível para diferentes nomes)
        Object.keys(row).forEach(key => {
          if (key.toLowerCase().includes('proposta')) {
            proposta = (row[key] || '').toString().trim();
          }
        });
        
        const status = extractorProposals.has(proposta) ? 'CONTA ABERTA' : 'PENDENTE';
        
        return {
          ...row,
          Status_Conta: status,
          Proposta_Validada: proposta
        };
      });

      // Calcular estatísticas
      const contasAbertas = validatedData.filter(row => row.Status_Conta === 'CONTA ABERTA').length;
      const contasPendentes = validatedData.length - contasAbertas;
      const taxaSucesso = (contasAbertas / validatedData.length) * 100;

      addLog('Etapa 6: Salvando relatório de validação...');
      
      // Criar arquivo Excel com resultados
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(validatedData);
      XLSX.utils.book_append_sheet(wb, ws, 'Validação Completa');
      
      // Adicionar aba de resumo executivo
      const summaryData = [
        { Métrica: 'Total de Arquivos Processados', Valor: files.length },
        { Métrica: 'Arquivos Processados com Sucesso', Valor: successCount },
        { Métrica: 'Arquivos com Erro', Valor: errors.length },
        { Métrica: 'Total de Propostas Analisadas', Valor: validatedData.length },
        { Métrica: 'Contas Abertas', Valor: contasAbertas },
        { Métrica: 'Contas Pendentes', Valor: contasPendentes },
        { Métrica: 'Taxa de Sucesso (%)', Valor: taxaSucesso.toFixed(1) }
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo Executivo');
      
      // Adicionar aba de erros se houver
      if (errors.length > 0) {
        const errorData = errors.map(error => ({ Erro: error }));
        const errorWs = XLSX.utils.json_to_sheet(errorData);
        XLSX.utils.book_append_sheet(wb, errorWs, 'Erros de Processamento');
      }
      
      XLSX.writeFile(wb, outputFileName);

      const endTime = Date.now();
      const tempo = (endTime - startTime) / 1000;

      const stats: ValidationStats = {
        totalArquivos: files.length,
        arquivosProcessados: successCount,
        arquivosComErro: errors.length,
        totalPropostas: validatedData.length,
        contasAbertas,
        contasPendentes,
        taxaSucesso,
        tempo
      };

      setValidationResults(stats);
      addLog(`✓ VALIDAÇÃO CONCLUÍDA COM SUCESSO!`);
      addLog(`Taxa de sucesso: ${taxaSucesso.toFixed(1)}% | Tempo: ${tempo.toFixed(2)}s`);
      
      toast.success('Validação completa concluída com sucesso!');
      
    } catch (error) {
      console.error('Erro na validação:', error);
      addLog(`✗ Erro crítico na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast.error('Erro durante a validação');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Validação Otimizada de Propostas
          </CardTitle>
          <CardDescription>
            Processe múltiplos arquivos diretamente e valide contra o extrator em uma única operação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input-files">Selecionar Arquivos da Pasta de Entrada</Label>
            <Input
              id="input-files"
              type="file"
              multiple
              accept=".xlsx,.xls,.csv"
              onChange={handleFolderSelect}
            />
            {inputFolder && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {inputFolder}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="extractor">Arquivo Extrator (Base Mestre)</Label>
            <Input
              id="extractor"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExtractorSelect}
            />
            {extractorFile && (
              <div className="text-sm text-muted-foreground">
                Extrator: {extractorFile.name}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="validation-output">Nome do Relatório Final</Label>
            <Input
              id="validation-output"
              value={outputFileName}
              onChange={(e) => setOutputFileName(e.target.value)}
              placeholder="Relatorio_Validacao_Completo.xlsx"
            />
          </div>

          <Button
            onClick={runValidation}
            disabled={isValidating || !inputFolder || !extractorFile}
            className="w-full h-12"
          >
            {isValidating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processando e Validando...
              </>
            ) : (
              <>
                <Database className="h-5 w-5 mr-2" />
                INICIAR VALIDAÇÃO COMPLETA
              </>
            )}
          </Button>

          {validationLog.length > 0 && (
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-40 overflow-y-auto">
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
              Relatório Executivo de Validação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResults.totalArquivos}
                </div>
                <div className="text-sm text-blue-700">Arquivos Processados</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {validationResults.totalPropostas.toLocaleString()}
                </div>
                <div className="text-sm text-purple-700">Total de Propostas</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {validationResults.contasAbertas.toLocaleString()}
                </div>
                <div className="text-sm text-green-700">Contas Abertas</div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {validationResults.taxaSucesso.toFixed(1)}%
                </div>
                <div className="text-sm text-orange-700">Taxa de Sucesso</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3" />
                  {validationResults.contasAbertas.toLocaleString()} Validadas
                </Badge>
                <Badge className="flex items-center gap-1 bg-orange-100 text-orange-800">
                  <XCircle className="h-3 w-3" />
                  {validationResults.contasPendentes.toLocaleString()} Pendentes
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
