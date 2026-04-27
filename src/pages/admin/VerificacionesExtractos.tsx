import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useStandaloneTokens } from "@/hooks/useLeadDocumentTokens";
import { Copy, ExternalLink, FileCheck, Eye, Link2, Loader2, Save, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AnalysisRow {
  id: string;
  lead_id: string | null;
  status: string;
  created_at: string;
  finished_at: string | null;
  holder_name: string | null;
  holder_dni: string | null;
  iban: string | null;
  bank_name: string | null;
  period_start: string | null;
  monthly_income: number | null;
  result: any;
  analysis_input?: any;
  viabilidade_sugerida: any;
  error_message: string | null;
  analysis_provider?: string | null;
  num_titulares?: number | null;
  extracted_financials?: any;
  confidence_score?: number | null;
  manual_review_required?: boolean | null;
  months_detected?: number | null;
  missing_months?: any;
  lead?: { id: string; nombre_completo: string } | null;
}

const cleanHolder = (n: string | null) =>
  !n || n.includes("[object Object]") ? null : n;

const money = (value: unknown, suffix = "€") => {
  const n = Number(value || 0);
  return n > 0 ? `${Math.round(n).toLocaleString("es-ES")} ${suffix}` : "—";
};

const maskIban = (iban: string | null) => {
  if (!iban) return "—";
  const trimmed = iban.replace(/\s+/g, "");
  if (trimmed.length < 8) return trimmed;
  return `${trimmed.slice(0, 4)} **** **** ${trimmed.slice(-4)}`;
};

const getFinancials = (row: AnalysisRow) =>
  row.extracted_financials || row.result?.ai_result || row.result?.result?.ai_result || {};

const getFirstFile = (row: AnalysisRow) => {
  const files = row.result?.analysis_input?.files || row.extracted_financials?.analysis_input?.files || row.analysis_input?.files;
  return Array.isArray(files) ? files[0] : null;
};

const StatusBadge = ({ row }: { row: AnalysisRow }) => {
  const v = row.viabilidade_sugerida || {};

  if (row.status === "ERROR") return <Badge variant="destructive">Error</Badge>;
  if (row.status !== "FINISHED") return <Badge variant="secondary">Procesando</Badge>;
  if (v.incomplete_months) return <Badge variant="destructive">12 meses incompletos</Badge>;
  if (row.manual_review_required || v.manual_review_required) {
    return <Badge variant="secondary">Revisión manual</Badge>;
  }
  if (v.aprobable === true) return <Badge>Aprobado</Badge>;
  if (v.aprobable === false) return <Badge variant="outline">No aprobado</Badge>;
  return <Badge variant="outline">Completado</Badge>;
};

const InfoBox = ({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) => (
  <div className="rounded-md bg-muted p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={mono ? "font-mono text-xs break-all" : "font-medium"}>{value || "—"}</p>
  </div>
);

const VerificacionesExtractos = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AnalysisRow | null>(null);
  const [editIncome, setEditIncome] = useState("");
  const [editDni, setEditDni] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const { tokens, createToken, buildPublicUrl } = useStandaloneTokens();

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lead_document_analysis")
      .select(
        "id, lead_id, status, created_at, finished_at, holder_name, holder_dni, iban, bank_name, period_start, monthly_income, result, analysis_input, viabilidade_sugerida, error_message, analysis_provider, num_titulares, extracted_financials, confidence_score, manual_review_required, months_detected, missing_months, lead:leads(id, nombre_completo)"
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error(error);
      toast.error("No se pudieron cargar las verificaciones");
    } else {
      setRows((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    const channel = supabase
      .channel("admin_doc_analysis_all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_document_analysis" },
        () => fetchRows()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const clientName = (r.lead?.nombre_completo || cleanHolder(r.holder_name) || "").toLowerCase();
      return (
        clientName.includes(q) ||
        (r.bank_name || "").toLowerCase().includes(q) ||
        (r.iban || "").toLowerCase().includes(q) ||
        (r.holder_dni || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const openDetails = (row: AnalysisRow) => {
    setSelected(row);
    setEditIncome(row.monthly_income != null ? String(row.monthly_income) : "");
    setEditDni(row.holder_dni || "");
  };

  const handleCreateStandaloneLink = async () => {
    setCreatingLink(true);
    const token = await createToken();
    setCreatingLink(false);
    if (!token) {
      toast.error("No se pudo crear el enlace");
      return;
    }
    const url = buildPublicUrl(token.token);
    setNewUrl(url);
    await navigator.clipboard.writeText(url);
    toast.success("Enlace creado y copiado");
  };

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const monthly = editIncome.trim() ? Number(editIncome.replace(",", ".")) : null;
    const { error } = await supabase
      .from("lead_document_analysis")
      .update({
        monthly_income: monthly,
        holder_dni: editDni.trim() || null,
      })
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudieron guardar los cambios");
      return;
    }
    toast.success("Datos actualizados");
    setSelected(null);
  };

  const getClientLabel = (r: AnalysisRow) => {
    if (r.lead?.nombre_completo) return r.lead.nombre_completo;
    const h = cleanHolder(r.holder_name);
    if (h) return h;
    return "—";
  };

  const activeTokens = tokens.filter((t) => new Date(t.expires_at) > new Date() && !t.used_at);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Verificación de Extractos</h1>
            <p className="text-sm text-muted-foreground">
              Verificaciones procesadas por el lector interno de extractos bancarios
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-5 w-5" /> Crear enlace de verificación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Genera un enlace para leads que aún no están en el CRM o para hacer pruebas del lector interno.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={handleCreateStandaloneLink} disabled={creatingLink}>
                {creatingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                Generar enlace
              </Button>
              {newUrl && (
                <div className="flex min-w-0 flex-1 gap-2">
                  <Input value={newUrl} readOnly className="text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copy(newUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {activeTokens.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Enlaces standalone activos</p>
                {activeTokens.slice(0, 5).map((token) => {
                  const url = buildPublicUrl(token.token);
                  return (
                    <div key={token.id} className="flex items-center gap-2">
                      <Input value={url} readOnly className="text-xs" />
                      <Button variant="outline" size="icon" onClick={() => copy(url)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        Exp: {format(new Date(token.expires_at), "dd/MM")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">
                {filtered.length} verificacion{filtered.length === 1 ? "" : "es"}
              </CardTitle>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, banco, IBAN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">
                No hay verificaciones que coincidan
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>Meses</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ingresos mensuales</TableHead>
                    <TableHead className="text-right">Créditos</TableHead>
                    <TableHead className="text-right">Ahorros</TableHead>
                    <TableHead className="text-right">Hipoteca máx.</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const v = r.viabilidade_sugerida || {};
                    const ingresos = r.monthly_income ?? v.ingresos_detectados ?? 0;
                    const months = r.months_detected ?? v.months_detected ?? null;
                    const firstFile = getFirstFile(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{getClientLabel(r)}</div>
                          {r.holder_dni && (
                            <div className="text-xs text-muted-foreground">DNI: {r.holder_dni}</div>
                          )}
                          {r.status === "ERROR" && firstFile?.name && (
                            <div className="text-xs text-muted-foreground">PDF: {firstFile.name}</div>
                          )}
                          {!r.lead_id && (
                            <Badge variant="outline" className="mt-1 text-xs">Sin lead vinculado</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{r.bank_name || "—"}</div>
                          {r.confidence_score != null && (
                            <div className="text-xs text-muted-foreground">
                              Confianza {Math.round(Number(r.confidence_score) * 100)}%
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{maskIban(r.iban)}</TableCell>
                        <TableCell className="text-xs">{months != null ? `${months}/12` : "—"}</TableCell>
                        <TableCell><StatusBadge row={r} /></TableCell>
                        <TableCell className="text-right">{money(ingresos)}</TableCell>
                        <TableCell className="text-right">{money(v.deudas_detectadas)}</TableCell>
                        <TableCell className="text-right">{money(v.ahorros_detectados)}</TableCell>
                        <TableCell className="text-right">{money(v.hipoteca_maxima)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openDetails(r)} title="Ver detalles">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {r.lead_id && (
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/inventario/admin/crm?lead=${r.lead_id}`)} title="Abrir lead">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la verificación</DialogTitle>
            <DialogDescription>{selected ? getClientLabel(selected) : ""}</DialogDescription>
          </DialogHeader>
          {selected && (() => {
            const v = selected.viabilidade_sugerida || {};
            const financials = getFinancials(selected);
            const titulares = Array.isArray(financials.titulares) ? financials.titulares : [];
            const warnings = [
              ...(Array.isArray(financials.warnings) ? financials.warnings : []),
              ...(Array.isArray(v.missing_months) && v.missing_months.length ? [`Meses faltantes: ${v.missing_months.join(", ")}`] : []),
            ];
            const ingresos = selected.monthly_income ?? v.ingresos_detectados ?? 0;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoBox label="Titular" value={cleanHolder(selected.holder_name)} />
                  <InfoBox label="Banco" value={selected.bank_name} />
                  <InfoBox label="IBAN" value={selected.iban} mono />
                  <InfoBox label="DNI / NIE" value={selected.holder_dni} />
                  <InfoBox label="Número de titulares" value={selected.num_titulares || titulares.length || 1} />
                  <InfoBox label="Meses detectados" value={`${selected.months_detected ?? v.months_detected ?? "—"}/12`} />
                  <InfoBox label="Ingresos mensuales" value={money(ingresos, "€/mes")} />
                  <InfoBox label="Créditos / deudas" value={money(v.deudas_detectadas, "€/mes")} />
                  <InfoBox label="Ahorros" value={money(v.ahorros_detectados)} />
                  <InfoBox label="Cuota máxima" value={money(v.cuota_max, "€/mes")} />
                  <InfoBox label="Hipoteca máxima" value={money(v.hipoteca_maxima)} />
                  <InfoBox label="Resultado" value={v.aprobable ? "Aprobado" : "No aprobado"} />
                </div>

                {selected.status === "ERROR" && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <p className="font-semibold">Error de procesamiento</p>
                    <p className="mt-1 text-xs text-muted-foreground">{selected.error_message || "No se pudo completar la lectura automática."}</p>
                    {(() => {
                      const firstFile = getFirstFile(selected);
                      if (!firstFile) return null;
                      return (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Archivo: {firstFile.name || "—"} · Páginas: {firstFile.pages || "—"}
                        </p>
                      );
                    })()}
                  </div>
                )}

                {titulares.length > 0 && (
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-sm font-semibold">Detalle por titular</p>
                    <div className="grid gap-2">
                      {titulares.map((h: any, index: number) => (
                        <div key={`${h.index || index}`} className="rounded-md bg-muted p-3 text-sm">
                          <p className="font-medium">Titular {h.index || index + 1}: {h.holder_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            Ingresos {money(h.monthly_recurring_income || h.average_monthly_income, "€/mes")} · Créditos {money(h.monthly_debts, "€/mes")} · Ahorros {money(h.savings_balance)} · Meses {h.months_detected ?? "—"}/12
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {warnings.length > 0 && (
                  <div className="rounded-md border bg-muted p-3">
                    <p className="text-sm font-semibold">Avisos del análisis</p>
                    <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                      {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="dni-edit" className="text-xs">DNI / NIE</Label>
                    <Input id="dni-edit" value={editDni} onChange={(e) => setEditDni(e.target.value)} placeholder="Ej: 12345678A" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="income-edit" className="text-xs">Ingresos mensuales (€)</Label>
                    <Input id="income-edit" type="number" inputMode="decimal" value={editIncome} onChange={(e) => setEditIncome(e.target.value)} placeholder="Ej: 1850" />
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>

                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Ver JSON crudo</summary>
                  <pre className="mt-2 bg-muted p-2 rounded overflow-auto max-h-60">
                    {JSON.stringify({ result: selected.result, analysis_input: selected.analysis_input, error_message: selected.error_message }, null, 2)}
                  </pre>
                </details>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default VerificacionesExtractos;
