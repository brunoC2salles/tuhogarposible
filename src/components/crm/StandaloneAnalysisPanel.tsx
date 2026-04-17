import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, CheckCircle2, AlertCircle, Link2, Search } from "lucide-react";
import { useStandaloneAnalysis } from "@/hooks/useStandaloneAnalysis";
import { useLeads } from "@/hooks/useLeads";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusBadge = (status: string) => {
  switch (status) {
    case "FINISHED":
      return <Badge className="bg-primary text-primary-foreground">Completado</Badge>;
    case "PROCESSING":
    case "CREATED":
      return <Badge variant="secondary">Procesando</Badge>;
    case "ERROR":
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const ViabilityIndicator = ({ aprobable }: { aprobable: boolean }) => (
  <div className="flex items-center gap-2">
    <div
      className={`h-3 w-3 rounded-full ${
        aprobable ? "bg-green-500" : "bg-red-500"
      }`}
      aria-label={aprobable ? "Viable" : "No viable"}
    />
    <span className="text-sm font-medium">
      {aprobable ? "Hipoteca viable" : "Capacidad insuficiente"}
    </span>
  </div>
);

const StandaloneAnalysisPanel = () => {
  const { analyses, loading, linkToLead } = useStandaloneAnalysis();
  const { leads } = useLeads();
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const s = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.nombre_completo.toLowerCase().includes(s) ||
        l.email?.toLowerCase().includes(s) ||
        l.telefono?.toLowerCase().includes(s)
    );
  }, [leads, search]);

  const handleLink = async (analysisId: string) => {
    const leadId = selectedLead[analysisId];
    if (!leadId) {
      toast.error("Selecciona un lead");
      return;
    }
    setLinkingId(analysisId);
    const ok = await linkToLead(analysisId, leadId);
    setLinkingId(null);
    if (ok) {
      toast.success("Análisis vinculado al lead");
    } else {
      toast.error("No se pudo vincular");
    }
  };

  if (loading && analyses.length === 0) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No hay análisis sin asignar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5" />
          Análisis sin asignar ({analyses.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lead por nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {analyses.map((a) => {
          const v = a.viabilidade_sugerida as any;
          return (
            <Card key={a.id} className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Movimientos bancarios (sin lead)</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  {statusBadge(a.status)}
                </div>

                {(a.status === "PROCESSING" || a.status === "CREATED") && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> En proceso...
                  </div>
                )}

                {a.status === "ERROR" && (
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>{a.error_message || "Error en el análisis"}</span>
                  </div>
                )}

                {a.status === "FINISHED" && v && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <ViabilityIndicator aprobable={!!v.aprobable} />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted rounded p-2">
                        <p className="text-muted-foreground">Ingresos</p>
                        <p className="font-semibold">
                          {Number(v.ingresos_detectados || 0).toLocaleString("es-ES")} €
                        </p>
                      </div>
                      <div className="bg-muted rounded p-2">
                        <p className="text-muted-foreground">Hipoteca máx.</p>
                        <p className="font-semibold">
                          {Number(v.hipoteca_maxima || 0).toLocaleString("es-ES")} €
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vincular a lead */}
                <div className="border-t border-border pt-3 flex gap-2">
                  <Select
                    value={selectedLead[a.id] || ""}
                    onValueChange={(v) => setSelectedLead({ ...selectedLead, [a.id]: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Vincular a lead..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filtered.slice(0, 30).map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nombre_completo} — {l.telefono}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => handleLink(a.id)}
                    disabled={linkingId === a.id || !selectedLead[a.id]}
                  >
                    {linkingId === a.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-1" />
                        Vincular
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default StandaloneAnalysisPanel;
