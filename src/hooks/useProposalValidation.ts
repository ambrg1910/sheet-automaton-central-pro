import { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { readFile } from '@/utils/fileUtils';

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

export const useProposalValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationStats | null>(null);
  const [validationLog, setValidationLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setValidationLog(prev => [...prev, message]);
  };

  const runValidation = async (files: FileList, extractorFile: File, outputFileName: string) => {
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
      
      // Extrair números de cartão do extrator (base mestre)
      addLog('Etapa 4: Extraindo números de cartão do arquivo mestre...');
      const extractorCartoes = new Set<string>();
      
      extractorData.forEach(row => {
        Object.keys(row).forEach(key => {
          if (key.toLowerCase().includes('número') && key.toLowerCase().includes('cartão')) {
            const cartao = row[key];
            if (cartao && cartao.toString().trim() !== '') {
              extractorCartoes.add(cartao.toString().trim());
            }
          }
        });
      });

      addLog(`${extractorCartoes.size} números de cartão encontrados no extrator`);
      addLog('Etapa 5: Executando validação e reconciliação...');

      // Validar cada proposta contra números de cartão do extrator
      const validatedData = allData.map(row => {
        let proposta = '';
        
        // Encontrar a coluna Proposta no relatório (flexível para diferentes nomes)
        Object.keys(row).forEach(key => {
          if (key.toLowerCase().includes('proposta')) {
            proposta = (row[key] || '').toString().trim();
          }
        });
        
        // Verificar se a proposta existe como número de cartão no extrator
        const status = extractorCartoes.has(proposta) ? 'CONTA ABERTA' : 'CONTA NÃO ABERTA';
        
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

  return {
    isValidating,
    validationResults,
    validationLog,
    runValidation
  };
};