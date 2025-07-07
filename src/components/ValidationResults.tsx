import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, TrendingUp } from 'lucide-react';

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

interface ValidationResultsProps {
  results: ValidationStats;
}

const ValidationResults = ({ results }: ValidationResultsProps) => {
  return (
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
              {results.totalArquivos}
            </div>
            <div className="text-sm text-blue-700">Arquivos Processados</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {results.totalPropostas.toLocaleString()}
            </div>
            <div className="text-sm text-purple-700">Total de Propostas</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {results.contasAbertas.toLocaleString()}
            </div>
            <div className="text-sm text-green-700">Contas Abertas</div>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {results.taxaSucesso.toFixed(1)}%
            </div>
            <div className="text-sm text-orange-700">Taxa de Sucesso</div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3" />
              {results.contasAbertas.toLocaleString()} Validadas
            </Badge>
            <Badge className="flex items-center gap-1 bg-orange-100 text-orange-800">
              <XCircle className="h-3 w-3" />
              {results.contasPendentes.toLocaleString()} Pendentes
            </Badge>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Processado em {results.tempo.toFixed(2)}s
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ValidationResults;