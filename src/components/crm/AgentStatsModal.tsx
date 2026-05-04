import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, CalendarRange, Calendar } from 'lucide-react';

interface AgentStat {
  id: string;
  nombre: string;
  email: string;
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  active: number;
  conversionRate: number;
}

interface AgentStatsModalProps {
  open: boolean;
  onClose: () => void;
  agentes: AgentStat[];
  onSelectAgent: (agent: { id: string; nombre: string }) => void;
}

export const AgentStatsModal = ({ open, onClose, agentes, onSelectAgent }: AgentStatsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Leads por Agente</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agente</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    Hoy
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CalendarRange className="h-4 w-4" />
                    Semana
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Mes
                  </div>
                </TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Activos</TableHead>
                <TableHead className="text-center">Conversión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentes.map(agente => (
                <TableRow
                  key={agente.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    onSelectAgent({ id: agente.id, nombre: agente.nombre });
                    onClose();
                  }}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{agente.nombre}</p>
                      <p className="text-sm text-muted-foreground">{agente.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-primary">{agente.today}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-foreground">{agente.thisWeek}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-foreground">{agente.thisMonth}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold">{agente.total}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground">{agente.active}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={agente.conversionRate > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                      {agente.conversionRate.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {agentes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay agentes registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
