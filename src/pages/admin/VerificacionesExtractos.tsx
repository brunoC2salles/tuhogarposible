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
import { FileCheck, ExternalLink, Search, Save, Loader2, Eye } from "lucide-react";
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
  viabilidade_sugerida: any;
  error_message: string | null;
  lead?: { id: string; nombre_completo: string } | null;
}

const cleanHolder = (n: string | null) =>
  !n || n.includes("[object Object]") ? null : n;

const maskIban = (iban: string | null) => {
  if (!iban) return "—";
  const trimmed = iban.replace(/\s+/g, "");
  if (trimmed.length < 8) return trimmed;
  return `${trimmed.slice(0, 4)} **** **** ${trimmed.slice(-4)}`;
};

const StatusBadge = ({ row }: { row: AnalysisRow }) => {
  const v = row.viabilidade_sugerida || {};
  const beworStatus = (v.bewor_status || "").toString().toUpperCase();
  const needsManual = !!v.needs_manual_review;

  if (row.status !== "FINISHED") {
    return <Badge variant="secondary">{row.status}</Badge>;
  }
  if (beworStatus === "KO") return <Badge variant="destructive">KO</Badge>;
  if (needsManual)
    return (
      <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
        Revisión manual
      </Badge>
    );
  if (beworStatus === "WARNING")
    return <Badge variant="outline">Warning</Badge>;
  if (beworStatus === "OK") return <Badge>OK</Badge>;
  return <Badge variant="outline">{beworStatus || "—"}</Badge>;
};

const VerificacionesExtractos = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AnalysisRow | null>(null);
  const [editIncome, setEditIncome] = useState("");
  const [editDni, setEditDni] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lead_document_analysis")
      .select(
        "id, lead_id, status, created_at, finished_at, holder_name, holder_dni, iban, bank_name, period_start, monthly_income, result, viabilidade_sugerida, error_message, lead:leads(id, nombre_completo)"
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Verificación de Extractos</h1>
            <p className="text-sm text-muted-foreground">
              Todas las verificaciones de extractos bancarios procesadas por Bewor
            </p>
          </div>
        </div>

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
                    <TableHead>Período</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const v = r.viabilidade_sugerida || {};
                    const ingresos =
                      r.monthly_income ?? v.ingresos_detectados ?? 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{getClientLabel(r)}</div>
                          {r.holder_dni && (
                            <div className="text-xs text-muted-foreground">
                              DNI: {r.holder_dni}
                            </div>
                          )}
                          {!r.lead_id && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Sin lead vinculado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{r.bank_name || "—"}</div>
                          {v.pages > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {v.pages} pág.{" "}
                              {v.confidence != null
                                ? `• ${Math.round(Number(v.confidence))}%`
                                : ""}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {maskIban(r.iban)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.period_start
                            ? format(new Date(r.period_start), "dd/MM/yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge row={r} />
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(ingresos) > 0
                            ? `${Math.round(Number(ingresos)).toLocaleString("es-ES")} €`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDetails(r)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {r.lead_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  navigate(`/inventario/admin/crm?lead=${r.lead_id}`)
                                }
                                title="Abrir lead"
                              >
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la verificación</DialogTitle>
            <DialogDescription>
              {selected ? getClientLabel(selected) : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Titular</p>
                  <p className="font-medium">
                    {cleanHolder(selected.holder_name) || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Banco</p>
                  <p className="font-medium">{selected.bank_name || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">IBAN</p>
                  <p className="font-mono text-xs break-all">
                    {selected.iban || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dni-edit" className="text-xs">
                    DNI / NIE
                  </Label>
                  <Input
                    id="dni-edit"
                    value={editDni}
                    onChange={(e) => setEditDni(e.target.value)}
                    placeholder="Ej: 12345678A"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="income-edit" className="text-xs">
                    Ingresos mensuales (€)
                  </Label>
                  <Input
                    id="income-edit"
                    type="number"
                    inputMode="decimal"
                    value={editIncome}
                    onChange={(e) => setEditIncome(e.target.value)}
                    placeholder="Ej: 1850"
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar
              </Button>

              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Ver JSON crudo
                </summary>
                <pre className="mt-2 bg-muted p-2 rounded overflow-auto max-h-60">
                  {JSON.stringify(selected.result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default VerificacionesExtractos;
