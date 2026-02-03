import { Building2 } from 'lucide-react';

interface InmovillaWidgetProps {
  url: string;
  height?: string;
}

export const InmovillaWidget = ({ url, height = "600px" }: InmovillaWidgetProps) => {
  if (!url || url.trim() === '') {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/50">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <p className="text-muted-foreground text-center px-4">
          URL de Inmovilla no configurada.
        </p>
        <p className="text-sm text-muted-foreground text-center px-4 mt-1">
          Configure en Admin Settings → Inmovilla URL
        </p>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      className="w-full border rounded-lg"
      style={{ height }}
      title="Inmovilla CRM"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
    />
  );
};
