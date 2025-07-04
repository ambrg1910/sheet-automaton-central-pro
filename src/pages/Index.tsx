
import { useState } from 'react';
import { Upload, Play, Settings, Calendar, FileText, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProcessingDashboard from '@/components/ProcessingDashboard';
import FileUploader from '@/components/FileUploader';
import ProcessConfig from '@/components/ProcessConfig';
import ScheduleManager from '@/components/ScheduleManager';
import ResultsViewer from '@/components/ResultsViewer';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [processes] = useState([
    {
      id: 'conta-nova',
      name: 'Arquivos Conta Nova',
      description: 'Processamento com validação e resumo automático',
      status: 'ready',
      lastRun: '2024-07-03 14:30',
      filesProcessed: 247,
      successRate: 98.5
    },
    {
      id: 'vendas-csv',
      name: 'Relatório de Vendas CSV',
      description: 'Consolidação de arquivos CSV de vendas',
      status: 'ready',
      lastRun: '2024-07-02 09:15',
      filesProcessed: 89,
      successRate: 100
    }
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Central de Automação de Planilhas
          </h1>
          <p className="text-lg text-slate-600">
            Plataforma profissional para processamento e unificação de dados
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-fit lg:grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="process" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Processar
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurar
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Agendar
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resultados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <ProcessingDashboard processes={processes} />
          </TabsContent>

          <TabsContent value="process" className="space-y-6">
            <FileUploader processes={processes} />
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <ProcessConfig />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <ScheduleManager processes={processes} />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <ResultsViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
