
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, X, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';

const ProcessConfig = () => {
  const [selectedProcess, setSelectedProcess] = useState('conta-nova');
  const [config, setConfig] = useState({
    name: 'Arquivos Conta Nova',
    fileType: 'excel',
    sheetName: 'null',
    headerRow: 10,
    delimiter: ',',
    essentialColumns: ['CPF Cliente', 'Proposta', 'Cliente'],
    standardColumns: [
      { name: 'Agencia', type: 'texto' },
      { name: 'CPF Cliente', type: 'cpf' },
      { name: 'Base de Calculo', type: 'numero' },
      { name: 'Data Cadastro', type: 'data' }
    ],
    pivotTable: {
      create: true,
      sheetName: 'Resumo por Agente',
      values: ['Vlr. emprestimo'],
      rows: ['Nome do Agente'],
      columns: ['Estado'],
      aggregation: 'Sum'
    }
  });

  const [newColumn, setNewColumn] = useState({ name: '', type: 'texto' });
  const [newEssentialColumn, setNewEssentialColumn] = useState('');

  const columnTypes = [
    { value: 'texto', label: 'Texto' },
    { value: 'numero', label: 'Número' },
    { value: 'data', label: 'Data' },
    { value: 'cpf', label: 'CPF' },
  ];

  const addColumn = () => {
    if (newColumn.name.trim()) {
      setConfig(prev => ({
        ...prev,
        standardColumns: [...prev.standardColumns, { ...newColumn }]
      }));
      setNewColumn({ name: '', type: 'texto' });
      toast.success('Coluna adicionada');
    }
  };

  const removeColumn = (index: number) => {
    setConfig(prev => ({
      ...prev,
      standardColumns: prev.standardColumns.filter((_, i) => i !== index)
    }));
    toast.success('Coluna removida');
  };

  const addEssentialColumn = () => {
    if (newEssentialColumn.trim() && !config.essentialColumns.includes(newEssentialColumn)) {
      setConfig(prev => ({
        ...prev,
        essentialColumns: [...prev.essentialColumns, newEssentialColumn]
      }));
      setNewEssentialColumn('');
      toast.success('Coluna essencial adicionada');
    }
  };

  const removeEssentialColumn = (column: string) => {
    setConfig(prev => ({
      ...prev,
      essentialColumns: prev.essentialColumns.filter(col => col !== column)
    }));
    toast.success('Coluna essencial removida');
  };

  const saveConfig = () => {
    toast.success('Configuração salva com sucesso!');
    console.log('Config saved:', config);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração de Processos
          </CardTitle>
          <CardDescription>
            Configure as regras de processamento para cada tipo de arquivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Processo Selecionado</Label>
              <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conta-nova">Arquivos Conta Nova</SelectItem>
                  <SelectItem value="vendas-csv">Relatório de Vendas CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="process-name">Nome do Processo</Label>
                <Input
                  id="process-name"
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Arquivo</Label>
                <Select 
                  value={config.fileType} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, fileType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx, .xls)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.fileType === 'excel' && (
                <div className="space-y-2">
                  <Label htmlFor="sheet-name">Nome da Aba</Label>
                  <Input
                    id="sheet-name"
                    value={config.sheetName}
                    onChange={(e) => setConfig(prev => ({ ...prev, sheetName: e.target.value }))}
                    placeholder="null para primeira aba"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="header-row">Linha do Cabeçalho</Label>
                <Input
                  id="header-row"
                  type="number"
                  value={config.headerRow}
                  onChange={(e) => setConfig(prev => ({ ...prev, headerRow: parseInt(e.target.value) || 1 }))}
                />
              </div>

              {config.fileType === 'csv' && (
                <div className="space-y-2">
                  <Label htmlFor="delimiter">Delimitador</Label>
                  <Input
                    id="delimiter"
                    value={config.delimiter}
                    onChange={(e) => setConfig(prev => ({ ...prev, delimiter: e.target.value }))}
                    placeholder=","
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colunas Essenciais</CardTitle>
          <CardDescription>
            Colunas obrigatórias que devem estar presentes em todos os arquivos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {config.essentialColumns.map((column) => (
                <Badge key={column} variant="secondary" className="flex items-center gap-1">
                  {column}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeEssentialColumn(column)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newEssentialColumn}
                onChange={(e) => setNewEssentialColumn(e.target.value)}
                placeholder="Nome da coluna essencial"
                onKeyPress={(e) => e.key === 'Enter' && addEssentialColumn()}
              />
              <Button onClick={addEssentialColumn}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colunas Padrão</CardTitle>
          <CardDescription>
            Configure o tipo de dados esperado para cada coluna
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              {config.standardColumns.map((column, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Input
                      value={column.name}
                      onChange={(e) => {
                        const updatedColumns = [...config.standardColumns];
                        updatedColumns[index] = { ...column, name: e.target.value };
                        setConfig(prev => ({ ...prev, standardColumns: updatedColumns }));
                      }}
                      placeholder="Nome da coluna"
                    />
                  </div>
                  <div className="w-32">
                    <Select
                      value={column.type}
                      onValueChange={(value) => {
                        const updatedColumns = [...config.standardColumns];
                        updatedColumns[index] = { ...column, type: value };
                        setConfig(prev => ({ ...prev, standardColumns: updatedColumns }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columnTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeColumn(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newColumn.name}
                onChange={(e) => setNewColumn(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da nova coluna"
                className="flex-1"
              />
              <Select
                value={newColumn.type}
                onValueChange={(value) => setNewColumn(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columnTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addColumn}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabela Dinâmica</CardTitle>
          <CardDescription>
            Configure a criação automática de tabelas de resumo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="create-pivot"
                checked={config.pivotTable.create}
                onCheckedChange={(checked) => setConfig(prev => ({
                  ...prev,
                  pivotTable: { ...prev.pivotTable, create: checked }
                }))}
              />
              <Label htmlFor="create-pivot">Criar tabela dinâmica automaticamente</Label>
            </div>

            {config.pivotTable.create && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Aba</Label>
                  <Input
                    value={config.pivotTable.sheetName}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      pivotTable: { ...prev.pivotTable, sheetName: e.target.value }
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Agregação</Label>
                  <Select
                    value={config.pivotTable.aggregation}
                    onValueChange={(value) => setConfig(prev => ({
                      ...prev,
                      pivotTable: { ...prev.pivotTable, aggregation: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sum">Soma</SelectItem>
                      <SelectItem value="Count">Contagem</SelectItem>
                      <SelectItem value="Average">Média</SelectItem>
                      <SelectItem value="Max">Máximo</SelectItem>
                      <SelectItem value="Min">Mínimo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Colunas de Valor</Label>
                  <Textarea
                    value={config.pivotTable.values.join(', ')}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      pivotTable: { 
                        ...prev.pivotTable, 
                        values: e.target.value.split(',').map(v => v.trim()).filter(v => v)
                      }
                    }))}
                    placeholder="Vlr. emprestimo, Vlr. IOF"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Linhas</Label>
                  <Textarea
                    value={config.pivotTable.rows.join(', ')}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      pivotTable: { 
                        ...prev.pivotTable, 
                        rows: e.target.value.split(',').map(v => v.trim()).filter(v => v)
                      }
                    }))}
                    placeholder="Nome do Agente"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveConfig} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Salvar Configuração
        </Button>
      </div>
    </div>
  );
};

export default ProcessConfig;
