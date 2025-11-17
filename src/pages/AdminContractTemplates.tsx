import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContractTemplates } from '@/hooks/useContractTemplates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { ContractTemplate, CampoFormulario } from '@/types/contratos';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function AdminContractTemplates() {
  const navigate = useNavigate();
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useContractTemplates();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [formData, setFormData] = useState<Partial<ContractTemplate>>({
    nombre: '',
    descripcion: '',
    campos_formulario: [],
    template_content: '',
    activo: true
  });
  const [newField, setNewField] = useState<Partial<CampoFormulario>>({
    name: '',
    label: '',
    type: 'text',
    required: false
  });

  const handleOpenModal = (template?: ContractTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData(template);
    } else {
      setEditingTemplate(null);
      setFormData({
        nombre: '',
        descripcion: '',
        campos_formulario: [],
        template_content: '',
        activo: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setNewField({ name: '', label: '', type: 'text', required: false });
  };

  const handleAddField = () => {
    if (!newField.name || !newField.label) return;

    const field: CampoFormulario = {
      name: newField.name,
      label: newField.label,
      type: newField.type as any,
      required: newField.required || false,
      placeholder: newField.placeholder,
      options: newField.options
    };

    setFormData(prev => ({
      ...prev,
      campos_formulario: [...(prev.campos_formulario || []), field]
    }));

    setNewField({ name: '', label: '', type: 'text', required: false });
  };

  const handleRemoveField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      campos_formulario: prev.campos_formulario?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSubmit = async () => {
    if (editingTemplate) {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, ...formData });
    } else {
      await createTemplate.mutateAsync(formData);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      await deleteTemplate.mutateAsync(id);
    }
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Templates de Contratos</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Gerencie os templates para contratos públicos
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p>Carregando...</p>
        ) : templates.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-8">
            Nenhum template criado ainda
          </p>
        ) : (
          templates.map(template => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {template.nombre}
                      {template.activo ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {template.descripcion || 'Sem descrição'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Campos do Formulário:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.campos_formulario.map((campo, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {campo.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(template)}
                    className="flex-1"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Template</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ex: Contrato de Compra e Venda"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descrição do template..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activo: checked }))}
              />
              <Label>Template ativo</Label>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Campos do Formulário</h3>
              
              {formData.campos_formulario && formData.campos_formulario.length > 0 && (
                <div className="space-y-2 mb-4">
                  {formData.campos_formulario.map((campo, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-accent rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{campo.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {campo.name} ({campo.type})
                          {campo.required && ' - Obrigatório'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3 p-3 border rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Nome do campo</Label>
                    <Input
                      size={1}
                      value={newField.name}
                      onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="nome_completo"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={newField.label}
                      onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="Nome Completo"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={newField.type}
                      onValueChange={(value) => setNewField(prev => ({ ...prev, type: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="select">Seleção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newField.required}
                        onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                      />
                      Obrigatório
                    </label>
                  </div>
                </div>

                <Button type="button" variant="secondary" size="sm" onClick={handleAddField}>
                  Adicionar Campo
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {editingTemplate ? 'Atualizar' : 'Criar'} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
