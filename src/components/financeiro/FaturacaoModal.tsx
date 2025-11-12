import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Faturacao } from "@/types/financeiro";
import { useAuth } from "@/contexts/AuthContext";
import { useAgentes } from "@/hooks/useAgentes";

interface FaturacaoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (faturacao: Partial<Faturacao>) => void;
  faturacao?: Faturacao | null;
}

export const FaturacaoModal = ({ open, onClose, onSave, faturacao }: FaturacaoModalProps) => {
  const { profile } = useAuth();
  const { agentes } = useAgentes();
  const isAdmin = profile?.role === 'admin';
  
  const [formData, setFormData] = useState<{
    descricao: string;
    valor: string;
    data_faturacao: string;
    cliente_nome: string;
    numero_fatura: string;
    status: 'pendente' | 'pago' | 'cancelado';
    agente_id: string;
    notas: string;
  }>({
    descricao: "",
    valor: "",
    data_faturacao: "",
    cliente_nome: "",
    numero_fatura: "",
    status: "pendente",
    agente_id: "",
    notas: ""
  });

  useEffect(() => {
    if (faturacao) {
      setFormData({
        descricao: faturacao.descricao,
        valor: faturacao.valor.toString(),
        data_faturacao: faturacao.data_faturacao,
        cliente_nome: faturacao.cliente_nome || "",
        numero_fatura: faturacao.numero_fatura || "",
        status: faturacao.status,
        agente_id: faturacao.agente_id || "",
        notas: faturacao.notas || ""
      });
    } else {
      setFormData({
        descricao: "",
        valor: "",
        data_faturacao: new Date().toISOString().split('T')[0],
        cliente_nome: "",
        numero_fatura: "",
        status: "pendente",
        agente_id: "",
        notas: ""
      });
    }
  }, [faturacao, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(faturacao && { id: faturacao.id }),
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      data_faturacao: formData.data_faturacao,
      cliente_nome: formData.cliente_nome || undefined,
      numero_fatura: formData.numero_fatura || undefined,
      status: formData.status,
      agente_id: formData.agente_id || undefined,
      notas: formData.notas || undefined
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{faturacao ? "Editar Faturação" : "Nova Faturação"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor">Valor (€) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="data_faturacao">Data *</Label>
              <Input
                id="data_faturacao"
                type="date"
                value={formData.data_faturacao}
                onChange={(e) => setFormData({ ...formData, data_faturacao: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cliente_nome">Nome do Cliente</Label>
              <Input
                id="cliente_nome"
                value={formData.cliente_nome}
                onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="numero_fatura">Número da Fatura</Label>
              <Input
                id="numero_fatura"
                value={formData.numero_fatura}
                onChange={(e) => setFormData({ ...formData, numero_fatura: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select value={formData.status} onValueChange={(val: any) => setFormData({ ...formData, status: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isAdmin && (
            <div>
              <Label htmlFor="agente_id">Agente Responsável</Label>
              <Select value={formData.agente_id} onValueChange={(val) => setFormData({ ...formData, agente_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {agentes.map((agente) => (
                    <SelectItem key={agente.id} value={agente.id}>{agente.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {faturacao ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};