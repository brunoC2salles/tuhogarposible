import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Download, X } from "lucide-react";
import { FormularioDescubiertaData, TitularData } from "@/schemas/formularioDescubiertaSchema";
import { generateDescubiertaPDF } from "@/lib/pdfGeneratorDescubierta";
import { formatEuro } from "@/lib/simuladorUtils";

interface ResultadosDescubiertaModalProps {
  open: boolean;
  onClose: () => void;
  data: FormularioDescubiertaData | null;
}

const ESTADO_CIVIL_LABELS: Record<string, string> = {
  soltero: 'Soltero/a',
  casado: 'Casado/a',
  divorciado: 'Divorciado/a',
  viudo: 'Viudo/a',
};

const TIPO_CONTRATO_LABELS: Record<string, string> = {
  funcionario: 'Funcionario',
  indefinido: 'Indefinido',
  interino: 'Interino',
  fijo_discontinuo: 'Fijo Discontinuo',
  temporal: 'Temporal',
  autonomo: 'Autónomo',
};

function TitularSection({ titular, numero }: { titular: TitularData; numero: number }) {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm text-primary">DATOS DE TITULAR {numero}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div><span className="text-muted-foreground">Nombre:</span> {titular.nombreApellidos}</div>
        <div><span className="text-muted-foreground">Fecha Nac.:</span> {titular.fechaNacimiento}</div>
        <div><span className="text-muted-foreground">DNI/NIE:</span> {titular.dniNie}</div>
        <div><span className="text-muted-foreground">Estado Civil:</span> {ESTADO_CIVIL_LABELS[titular.estadoCivil]}</div>
        <div><span className="text-muted-foreground">Hijos:</span> {titular.numHijos}</div>
        <div><span className="text-muted-foreground">Teléfono:</span> {titular.telefono}</div>
        <div><span className="text-muted-foreground">Profesión:</span> {titular.profesion}</div>
        <div><span className="text-muted-foreground">Contrato:</span> {TIPO_CONTRATO_LABELS[titular.tipoContrato]}</div>
        <div><span className="text-muted-foreground">Antigüedad:</span> {titular.antiguedad}</div>
        <div><span className="text-muted-foreground">Ingresos:</span> {formatEuro(titular.ingresosTotales)}</div>
        <div className="col-span-2"><span className="text-muted-foreground">Otros ingresos:</span> {titular.otrosIngresos || 'No'}</div>
        <div className="col-span-2"><span className="text-muted-foreground">Activos inmobiliarios:</span> {titular.activosInmobiliarios || 'No'}</div>
        <div><span className="text-muted-foreground">Préstamos:</span> {titular.tienePrestamosPersonales ? 'Sí' : 'No'}</div>
        <div><span className="text-muted-foreground">Deudas:</span> {titular.tieneDeudas ? 'Sí' : 'No'}</div>
      </div>
    </div>
  );
}

export function ResultadosDescubiertaModal({ open, onClose, data }: ResultadosDescubiertaModalProps) {
  if (!data) return null;

  const handleExportPDF = () => {
    generateDescubiertaPDF(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <DialogTitle className="text-xl">Lead Creado con Éxito</DialogTitle>
          </div>
          <Badge variant="secondary" className="w-fit">
            Etapa: Expediente Preaprobación
          </Badge>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Titular 1 */}
          <TitularSection titular={data.titular1} numero={1} />

          {/* Titular 2 */}
          {data.tieneSegundoTitular && data.titular2 && (
            <>
              <Separator />
              <TitularSection titular={data.titular2} numero={2} />
            </>
          )}

          <Separator />

          {/* Datos de la Operación */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-primary">DATOS DE LA OPERACIÓN</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div><span className="text-muted-foreground">Financiación:</span> {data.porcentajeFinanciacion}%</div>
              <div><span className="text-muted-foreground">Precio:</span> {formatEuro(data.precioCompraventa)}</div>
              <div><span className="text-muted-foreground">Tasación aprox.:</span> {formatEuro(data.valorTasacionAproximado)}</div>
              <div><span className="text-muted-foreground">Con préstamo:</span> {data.conPrestamoPersonal ? 'Sí' : 'No'}</div>
            </div>
          </div>

          <Separator />

          {/* RGPD */}
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            <CheckCircle className="h-4 w-4" />
            <span>Política de Privacidad aceptada conforme al RGPD</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          <Button onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
