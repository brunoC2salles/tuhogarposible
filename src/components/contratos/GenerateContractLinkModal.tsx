import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useContractTemplates } from '@/hooks/useContractTemplates';
import { usePublicContractLinks } from '@/hooks/usePublicContractLinks';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateContractLinkModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}

export const GenerateContractLinkModal = ({
  open,
  onClose,
  leadId,
  leadName
}: GenerateContractLinkModalProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [generatedLink, setGeneratedLink] = useState<string>('');

  const { templates, isLoading: templatesLoading } = useContractTemplates();
  const { generateLink, getPublicLink } = usePublicContractLinks(leadId);

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error('Selecione um template');
      return;
    }

    try {
      const result = await generateLink.mutateAsync({
        leadId,
        templateId: selectedTemplate,
        expiresInDays
      });

      const link = getPublicLink(result.token);
      setGeneratedLink(link);
      toast.success('Link gerado com sucesso!');
    } catch (error) {
      console.error('Error generating link:', error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success('Link copiado!');
  };

  const handleOpenLink = () => {
    window.open(generatedLink, '_blank');
  };

  const handleClose = () => {
    setSelectedTemplate('');
    setGeneratedLink('');
    setExpiresInDays(7);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerar Link de Contrato para {leadName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!generatedLink ? (
            <>
              <div className="space-y-2">
                <Label>Template de Contrato</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templatesLoading ? (
                      <SelectItem value="loading" disabled>
                        Carregando...
                      </SelectItem>
                    ) : templates.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        Nenhum template disponível
                      </SelectItem>
                    ) : (
                      templates
                        .filter(t => t.activo)
                        .map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.nombre}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Validade (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!selectedTemplate || generateLink.isPending}
                className="w-full"
              >
                {generateLink.isPending ? 'Gerando...' : 'Gerar Link'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Link Gerado</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly className="flex-1" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleOpenLink}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-accent/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Envie este link para o lead preencher o formulário de contrato.
                  O link expira em {expiresInDays} dias.
                </p>
              </div>

              <Button onClick={handleClose} variant="outline" className="w-full">
                Fechar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
