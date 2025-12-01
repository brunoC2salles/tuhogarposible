import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useChannels } from '@/hooks/useChannels';
import { useAgentes } from '@/hooks/useAgentes';

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateChannelModal = ({ open, onOpenChange }: CreateChannelModalProps) => {
  const { createChannel } = useChannels();
  const { agentes } = useAgentes();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setCreating(true);
    try {
      const { error } = await createChannel(name, description || undefined, selectedMembers);
      if (!error) {
        setName('');
        setDescription('');
        setSelectedMembers([]);
        onOpenChange(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Canal</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="channel-name">Nombre del Canal *</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej: Marketing, Soporte"
            />
          </div>

          <div>
            <Label htmlFor="channel-description">Descripción (opcional)</Label>
            <Textarea
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué trata este canal?"
              rows={3}
            />
          </div>

          <div>
            <Label className="mb-2 block">Miembros</Label>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              {agentes.filter(a => a.role !== 'supervisor').map(agente => (
                <div key={agente.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedMembers.includes(agente.id)}
                    onCheckedChange={() => toggleMember(agente.id)}
                  />
                  <label className="text-sm cursor-pointer flex-1" onClick={() => toggleMember(agente.id)}>
                    {agente.nombre} ({agente.role})
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || creating}>
              {creating ? 'Creando...' : 'Crear Canal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};