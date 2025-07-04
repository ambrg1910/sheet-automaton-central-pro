
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Play, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Process {
  id: string;
  name: string;
  description: string;
  status: 'ready' | 'running' | 'completed' | 'error';
  lastRun: string;
  filesProcessed: number;
  successRate: number;
}

interface ProcessingDashboardProps {
  processes: Process[];
}

const ProcessingDashboard = ({ processes }: ProcessingDashboardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-blue-500';
      case 'running': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <Clock className="h-4 w-4" />;
      case 'running': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total de Processos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processes.length}</div>
            <p className="text-xs opacity-75">Configurados e ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Arquivos Processados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processes.reduce((acc, p) => acc + p.filesProcessed, 0)}
            </div>
            <p className="text-xs opacity-75">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(processes.reduce((acc, p) => acc + p.successRate, 0) / processes.length).toFixed(1)}%
            </div>
            <p className="text-xs opacity-75">Média geral</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Processos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processes.filter(p => p.status === 'ready').length}
            </div>
            <p className="text-xs opacity-75">Prontos para execução</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Processos Configurados
          </CardTitle>
          <CardDescription>
            Gerencie e monitore seus processos de automação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {processes.map((process) => (
              <div key={process.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(process.status)}`}></div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{process.name}</h3>
                    <p className="text-sm text-slate-600">{process.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>Última execução: {process.lastRun}</span>
                      <span>{process.filesProcessed} arquivos processados</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {getStatusIcon(process.status)}
                      {process.status}
                    </Badge>
                    <div className="mt-1">
                      <Progress value={process.successRate} className="w-20 h-2" />
                      <span className="text-xs text-slate-500">{process.successRate}%</span>
                    </div>
                  </div>
                  <Button size="sm">
                    <Play className="h-4 w-4 mr-1" />
                    Executar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessingDashboard;
