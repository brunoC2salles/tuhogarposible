import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS_DESPESA, METODOS_PAGAMENTO, type DespesaOperacional } from "@/types/financeiro";
import { useAuth } from "@/contexts/AuthContext";
import { useAgentes } from "@/hooks/useAgentes";

interface DespesaModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (despesa: Partial<DespesaOperacional>) => void;
  despesa?: DespesaOperacional | null;
}

export const DespesaModal = ({ open, onClose, onSave, despesa }: DespesaModalProps) => {
  const { profile } = useAuth();
  const { agentes } = useAgentes();
  const isAdmin = profile?.role === 'admin';
  
  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    data_despesa: "",
    categoria: "",
    metodo_pagamento: "",
    agente_id: "",
    notas: ""
  });

  useEffect(() => {
    if (despesa) {
      setFormData({
        descricao: despesa.descricao,
        valor: despesa.valor.toString(),
        data_despesa: despesa.data_despesa,
        categoria: despesa.categoria,
        metodo_pagamento: despesa.metodo_pagamento || "",
        agente_id: despesa.agente_id || "",
        notas: despesa.notas || ""
      });
    } else {
      setFormData({
        descricao: "",
        valor: "",
        data_despesa: new Date().toISOString().split('T')[0],
        categoria: "",
        metodo_pagamento: "",
        agente_id: "",
        notas: ""
      });
    }
  }, [despesa, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(despesa && { id: despesa.id }),
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      data_despesa: formData.data_despesa,
      categoria: formData.categoria,
      metodo_pagamento: formData.metodo_pagamento || undefined,
      agente_id: formData.agente_id || undefined,
      notas: formData.notas || undefined
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{despesa ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
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
              <Label htmlFor="data_despesa">Data *</Label>
              <Input
                id="data_despesa"
                type="date"
                value={formData.data_despesa}
                onChange={(e) => setFormData({ ...formData, data_despesa: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoria">Categoria *</Label>
              <Select value={formData.categoria} onValueChange={(val) => setFormData({ ...formData, categoria: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DESPESA.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="metodo_pagamento">Método de Pagamento</Label>
              <Select value={formData.metodo_pagamento} onValueChange={(val) => setFormData({ ...formData, metodo_pagamento: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGAMENTO.map((metodo) => (
                    <SelectItem key={metodo} value={metodo}>{metodo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              {despesa ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};