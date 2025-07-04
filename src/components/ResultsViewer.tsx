
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Search, Filter, Calendar, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ResultsViewer = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const results = [
    {
      id: '1',
      fileName: 'Relatorio_Unificado_2024-07-03.xlsx',
      process: 'Arquivos Conta Nova',
      date: '2024-07-03 23:05',
      status: 'success',
      filesProcessed: 15,
      totalRows: 2847,
      fileSize: '2.1 MB',
      downloadUrl: '#'
    },
    {
      id: '2',
      fileName: 'Vendas_Consolidado_2024-07-02.xlsx',
      process: 'Relatório de Vendas CSV',
      date: '2024-07-02 09:20',
      status: 'success',
      filesProcessed: 8,
      totalRows: 1234,
      fileSize: '856 KB',
      downloadUrl: '#'
    },
    {
      id: '3',
      fileName: 'Relatorio_Unificado_2024-07-01.xlsx',
      process: 'Arquivos Conta Nova',
      date: '2024-07-01 23:05',
      status: 'error',
      filesProcessed: 0,
      totalRows: 0,
      fileSize: '0 KB',
      downloadUrl: null
    },
    {
      id: '4',
      fileName: 'Relatorio_Unificado_2024-06-30.xlsx',
      process: 'Arquivos Conta Nova',
      date: '2024-06-30 23:05',
      status: 'success',
      filesProcessed: 22,
      totalRows: 4156,
      fileSize: '3.2 MB',
      downloadUrl: '#'
    }
  ];

  const filteredResults = results.filter(result => {
    const matchesSearch = result.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.process.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || result.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'default' : 'destructive';
  };

  const getStatusLabel = (status: string) => {
    return status === 'success' ? 'Sucesso' : 'Erro';
  };

  const totalFiles = results.reduce((acc, result) => acc + result.filesProcessed, 0);
  const totalRows = results.reduce((acc, result) => acc + result.totalRows, 0);
  const successRate = (results.filter(r => r.status === 'success').length / results.length) * 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total de Arquivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFiles}</div>
            <p className="text-xs opacity-75">Processados com sucesso</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRows.toLocaleString()}</div>
            <p className="text-xs opacity-75">Linhas unificadas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <p className="text-xs opacity-75">Últimos processamentos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Resultados
          </CardTitle>
          <CardDescription>
            Visualize e baixe os arquivos processados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome do arquivo ou processo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  Nenhum resultado encontrado
                </h3>
                <p className="text-slate-500">
                  Ajuste os filtros ou execute um novo processamento
                </p>
              </div>
            ) : (
              filteredResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      result.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{result.fileName}</h3>
                      <p className="text-sm text-slate-600">{result.process}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {result.date}
                        </span>
                        {result.status === 'success' && (
                          <>
                            <span>{result.filesProcessed} arquivos</span>
                            <span>{result.totalRows.toLocaleString()} registros</span>
                            <span>{result.fileSize}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={getStatusColor(result.status)}>
                      {getStatusLabel(result.status)}
                    </Badge>
                    {result.downloadUrl && (
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Análise de Performance
          </CardTitle>
          <CardDescription>
            Estatísticas detalhadas dos processamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Processos mais utilizados</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Arquivos Conta Nova</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <span className="text-xs text-slate-600">75%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Relatório de Vendas CSV</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                    <span className="text-xs text-slate-600">25%</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Tendência de crescimento</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Esta semana</span>
                  <span className="text-sm font-semibold text-green-600">+23%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Este mês</span>
                  <span className="text-sm font-semibold text-green-600">+45%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tempo médio</span>
                  <span className="text-sm">2.3 min</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsViewer;
