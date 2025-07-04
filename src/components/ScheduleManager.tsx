
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, Trash2, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

interface Process {
  id: string;
  name: string;
}

interface ScheduleManagerProps {
  processes: Process[];
}

interface ScheduledTask {
  id: string;
  name: string;
  process: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  status: 'active' | 'paused';
  lastRun?: string;
  nextRun: string;
}

const ScheduleManager = ({ processes }: ScheduleManagerProps) => {
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([
    {
      id: '1',
      name: 'Processamento Diário - Conta Nova',
      process: 'conta-nova',
      frequency: 'daily',
      time: '23:00',
      status: 'active',
      lastRun: '2024-07-03 23:00',
      nextRun: '2024-07-04 23:00'
    },
    {
      id: '2',
      name: 'Relatório Semanal - Vendas',
      process: 'vendas-csv',
      frequency: 'weekly',
      time: '08:00',
      status: 'paused',
      lastRun: '2024-06-30 08:00',
      nextRun: '2024-07-07 08:00'
    }
  ]);

  const [newTask, setNewTask] = useState({
    name: '',
    process: '',
    frequency: 'daily' as const,
    time: '23:00'
  });

  const [showCreateForm, setShowCreateForm] = useState(false);

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensal';
      default: return frequency;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-500' : 'bg-yellow-500';
  };

  const createTask = () => {
    if (!newTask.name || !newTask.process) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const task: ScheduledTask = {
      id: Date.now().toString(),
      ...newTask,
      status: 'active',
      nextRun: `2024-07-05 ${newTask.time}`
    };

    setScheduledTasks(prev => [...prev, task]);
    setNewTask({ name: '', process: '', frequency: 'daily', time: '23:00' });
    setShowCreateForm(false);
    toast.success('Tarefa agendada criada com sucesso!');
  };

  const toggleTaskStatus = (taskId: string) => {
    setScheduledTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: task.status === 'active' ? 'paused' : 'active' } : task
    ));
    toast.success('Status da tarefa atualizado');
  };

  const deleteTask = (taskId: string) => {
    setScheduledTasks(prev => prev.filter(task => task.id !== taskId));
    toast.success('Tarefa removida');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Gerenciador de Tarefas Agendadas
              </CardTitle>
              <CardDescription>
                Configure execuções automáticas dos seus processos
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm && (
            <div className="mb-6 p-4 border rounded-lg bg-slate-50">
              <h3 className="font-semibold mb-4">Criar Nova Tarefa Agendada</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Tarefa</Label>
                  <Input
                    value={newTask.name}
                    onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome identificador da tarefa"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Processo</Label>
                  <Select 
                    value={newTask.process} 
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, process: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um processo" />
                    </SelectTrigger>
                    <SelectContent>
                      {processes.map((process) => (
                        <SelectItem key={process.id} value={process.id}>
                          {process.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select 
                    value={newTask.frequency} 
                    onValueChange={(value: any) => setNewTask(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={newTask.time}
                    onChange={(e) => setNewTask(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={createTask}>Criar Tarefa</Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {scheduledTasks.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  Nenhuma tarefa agendada
                </h3>
                <p className="text-slate-500">
                  Crie sua primeira tarefa automática clicando em "Nova Tarefa"
                </p>
              </div>
            ) : (
              scheduledTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`}></div>
                    <div>
                      <h3 className="font-semibold">{task.name}</h3>
                      <div className="text-sm text-slate-600">
                        <p>Processo: {processes.find(p => p.id === task.process)?.name}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getFrequencyLabel(task.frequency)} às {task.time}
                          </span>
                          <span>Próxima execução: {task.nextRun}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={task.status === 'active' ? 'default' : 'secondary'}>
                      {task.status === 'active' ? 'Ativa' : 'Pausada'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTaskStatus(task.id)}
                    >
                      {task.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Execuções</CardTitle>
          <CardDescription>
            Acompanhe o histórico das execuções automáticas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: '2024-07-03 23:00', task: 'Processamento Diário - Conta Nova', status: 'success', files: 15 },
              { date: '2024-07-02 23:00', task: 'Processamento Diário - Conta Nova', status: 'success', files: 12 },
              { date: '2024-07-01 23:00', task: 'Processamento Diário - Conta Nova', status: 'error', files: 0 },
              { date: '2024-06-30 08:00', task: 'Relatório Semanal - Vendas', status: 'success', files: 8 }
            ].map((execution, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    execution.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <span className="font-medium">{execution.task}</span>
                    <div className="text-sm text-slate-600">
                      {execution.date} • {execution.files} arquivos processados
                    </div>
                  </div>
                </div>
                <Badge variant={execution.status === 'success' ? 'default' : 'destructive'}>
                  {execution.status === 'success' ? 'Sucesso' : 'Erro'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleManager;
