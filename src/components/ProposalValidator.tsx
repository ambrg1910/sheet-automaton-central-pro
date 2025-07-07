
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database, CheckCircle, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useProposalValidation } from '@/hooks/useProposalValidation';
import ValidationResults from './ValidationResults';

interface ProposalValidatorProps {
  unifiedData?: any[];
}

const ProposalValidator = ({ unifiedData }: ProposalValidatorProps) => {
  const [inputFolder, setInputFolder] = useState<string>('');
  const [extractorFile, setExtractorFile] = useState<File | null>(null);
  const [outputFileName, setOutputFileName] = useState('Relatorio_Validacao_Completo.xlsx');

  const { isValidating, validationResults, validationLog, runValidation } = useProposalValidation();

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
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

  const handleValidation = () => {
    const fileInput = document.getElementById('input-files') as HTMLInputElement;
    const files = fileInput?.files;
    
    if (files && extractorFile) {
      runValidation(files, extractorFile, outputFileName);
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
            onClick={handleValidation}
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

      {validationResults && <ValidationResults results={validationResults} />}
    </div>
  );
};

export default ProposalValidator;
