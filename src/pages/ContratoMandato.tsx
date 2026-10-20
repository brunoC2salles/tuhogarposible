import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, Download, FileText, Loader2, PenLine, ShieldCheck } from 'lucide-react';
import logo from '@/assets/logo-tu-hogar.png';

// Página pública del mandato de compra (enlace generado desde el CRM). Marca THP.
const FN_URL = 'https://tnzgpzablwfptagfbnvb.supabase.co/functions/v1/contrato-mandato';

type Estado = 'pendiente' | 'generando' | 'firmando' | 'firmado' | 'expirado';
interface Info {
  estado: Estado;
  honorarios: number;
  expires_at: string;
  prefill: { nombre: string; email: string };
  datos: { nombre: string; dni: string; domicilio: string; email: string } | null;
  pdf_url: string | null;
  firmar_url: string | null;
  firmado_url: string | null;
  firmado_at: string | null;
}
type Campos = { nombre: string; dni: string; domicilio: string; email: string };

// de-DE agrupa también los miles de 4 cifras (6.000 €); es-ES escribiría 6000 €
const eur = (n: number) => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n)} €`;

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#F5F7FA] text-[#1A1A1A] flex flex-col">
    <header className="bg-white border-b border-black/5 py-4 flex justify-center">
      <img src={logo} alt="Tu Hogar Posible" className="h-20 w-auto" />
    </header>
    <main className="flex-1 w-full max-w-xl mx-auto px-4 py-8 sm:py-12">{children}</main>
    <footer className="py-6 text-center text-xs text-[#888780]">
      Tu Hogar Posible · Apunto Growth Agency S.L. · contacto@tuhogarposible.com
    </footer>
  </div>
);

const Tarjeta = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white rounded-[24px] shadow-sm border border-black/5 p-6 sm:p-8">{children}</div>
);

const BotonPrimario = (
  { children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode },
) => (
  <button
    {...p}
    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#3D8BF7] hover:bg-[#2F7AE5] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold h-12 px-6 transition-colors"
  >
    {children}
  </button>
);

const Mensaje = ({ icon, titulo, texto }: { icon: React.ReactNode; titulo: string; texto: string }) => (
  <Tarjeta>
    <div className="text-center space-y-3 py-4">
      <div className="mx-auto h-14 w-14 rounded-full bg-[#3D8BF7]/10 flex items-center justify-center text-[#3D8BF7]">{icon}</div>
      <h1 className="text-xl font-bold">{titulo}</h1>
      <p className="text-[#555] leading-relaxed">{texto}</p>
    </div>
  </Tarjeta>
);

const Campo = ({ id, label, ayuda, error, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; ayuda?: string; error?: string }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
    <input
      id={id}
      {...p}
      className={`w-full h-12 rounded-xl border bg-white px-4 text-base outline-none transition-colors focus:border-[#3D8BF7] focus:ring-2 focus:ring-[#3D8BF7]/20 ${error ? 'border-red-400' : 'border-black/15'}`}
    />
    {error ? <p className="text-sm text-red-600">{error}</p> : ayuda ? <p className="text-xs text-[#888780]">{ayuda}</p> : null}
  </div>
);

const ContratoMandato = () => {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [campos, setCampos] = useState<Campos>({ nombre: '', dni: '', domicilio: '', email: '' });
  const [errores, setErrores] = useState<Partial<Campos>>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${FN_URL}?token=${encodeURIComponent(token || '')}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Enlace no válido');
        setInfo(d);
        setCampos((c) => ({ ...c, nombre: d.prefill?.nombre || '', email: d.prefill?.email || '' }));
      } catch (e) {
        setErrorGeneral((e as Error).message || 'No se pudo abrir el enlace');
      } finally {
        setCargando(false);
      }
    })();
  }, [token]);

  const set = (k: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCampos((c) => ({ ...c, [k]: e.target.value }));
    setErrores((x) => ({ ...x, [k]: undefined }));
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErrorGeneral(null);
    try {
      const r = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...campos }),
      });
      const d = await r.json();
      if (r.status === 422 && d.errores) { setErrores(d.errores); return; }
      if (!r.ok) throw new Error(d.error || 'No se pudo enviar');
      setInfo(d);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorGeneral((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return <Shell><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#3D8BF7]" /></div></Shell>;
  }

  if (!info) {
    return <Shell><Mensaje icon={<AlertCircle className="h-7 w-7" />} titulo="Enlace no válido" texto={errorGeneral || 'Este enlace no existe. Pide uno nuevo a tu asesor de Tu Hogar Posible.'} /></Shell>;
  }

  if (info.estado === 'expirado') {
    return <Shell><Mensaje icon={<Clock className="h-7 w-7" />} titulo="Este enlace ha caducado" texto="Por seguridad, el enlace solo es válido 7 días. Pide uno nuevo a tu asesor de Tu Hogar Posible." /></Shell>;
  }

  if (info.estado === 'generando') {
    return <Shell><Mensaje icon={<Loader2 className="h-7 w-7 animate-spin" />} titulo="Preparando tu contrato" texto="Estamos generando tu contrato. Vuelve a abrir este enlace en un minuto." /></Shell>;
  }

  if (info.estado === 'firmado') {
    return (
      <Shell>
        <Tarjeta>
          <div className="text-center space-y-3 pb-6">
            <div className="mx-auto h-14 w-14 rounded-full bg-green-50 flex items-center justify-center text-green-600"><CheckCircle2 className="h-7 w-7" /></div>
            <h1 className="text-xl font-bold">Contrato firmado</h1>
            <p className="text-[#555] leading-relaxed">Gracias, {info.datos?.nombre.split(' ')[0]}. Ya tenemos tu mandato de compra firmado y tu asesor seguirá contigo con los próximos pasos.</p>
          </div>
          {info.firmado_url && (
            <a href={info.firmado_url} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#3D8BF7] hover:bg-[#2F7AE5] text-white font-semibold h-12 px-6 transition-colors">
              <Download className="h-5 w-5" />Descargar contrato firmado
            </a>
          )}
        </Tarjeta>
      </Shell>
    );
  }

  if (info.estado === 'firmando') {
    return (
      <Shell>
        <Tarjeta>
          <div className="space-y-2 pb-6">
            <p className="text-sm font-semibold text-[#3D8BF7]">Paso 2 de 2</p>
            <h1 className="text-2xl font-bold">Tu contrato está listo</h1>
            <p className="text-[#555] leading-relaxed">Revisa el mandato de compra con tus datos y fírmalo online. Solo te llevará un minuto.</p>
          </div>
          <div className="rounded-2xl bg-[#F5F7FA] p-4 mb-6 flex items-start gap-3">
            <FileText className="h-5 w-5 text-[#3D8BF7] mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Contrato de mandato de compra con exclusividad</p>
              <p className="text-[#555]">{info.datos?.nombre} · DNI/NIE {info.datos?.dni}</p>
            </div>
          </div>
          <div className="space-y-3">
            {info.pdf_url && (
              <a href={info.pdf_url} className="w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#3D8BF7] text-[#3D8BF7] hover:bg-[#3D8BF7]/5 font-semibold h-12 px-6 transition-colors">
                <Download className="h-5 w-5" />Descargar contrato
              </a>
            )}
            {info.firmar_url ? (
              <a href={info.firmar_url} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#3D8BF7] hover:bg-[#2F7AE5] text-white font-semibold h-12 px-6 transition-colors">
                <PenLine className="h-5 w-5" />Firmar con Lumin
              </a>
            ) : (
              <BotonPrimario onClick={() => window.location.reload()}>
                <Loader2 className="h-5 w-5 animate-spin" />Preparando la firma, recarga en unos segundos
              </BotonPrimario>
            )}
          </div>
          <p className="mt-6 text-xs text-[#888780] flex items-start gap-2 leading-relaxed">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            La firma se hace en Lumin Sign, una plataforma de firma electrónica. Cuando firmes, el contrato firmado llegará automáticamente a Tu Hogar Posible y podrás descargarlo desde este mismo enlace.
          </p>
        </Tarjeta>
      </Shell>
    );
  }

  // pendiente: formulario
  return (
    <Shell>
      <Tarjeta>
        <div className="space-y-2 pb-6">
          <p className="text-sm font-semibold text-[#3D8BF7]">Paso 1 de 2</p>
          <h1 className="text-2xl font-bold">Tus datos para el contrato</h1>
          <p className="text-[#555] leading-relaxed">Con estos datos preparamos tu mandato de compra con Tu Hogar Posible. Después podrás descargarlo y firmarlo online.</p>
        </div>
        <form onSubmit={enviar} className="space-y-4" noValidate>
          <Campo id="nombre" label="Nombre y apellidos" autoComplete="name" value={campos.nombre} onChange={set('nombre')} error={errores.nombre} required />
          <Campo id="dni" label="DNI / NIE" autoComplete="off" value={campos.dni} onChange={set('dni')} error={errores.dni} ayuda="Ejemplo: 12345678Z o X1234567L" required />
          <Campo id="domicilio" label="Domicilio" autoComplete="street-address" value={campos.domicilio} onChange={set('domicilio')} error={errores.domicilio} ayuda="Calle, número, piso, código postal y ciudad" required />
          <Campo id="email" type="email" label="Email" autoComplete="email" value={campos.email} onChange={set('email')} error={errores.email} ayuda="Lo usamos para la firma electrónica del contrato" required />

          <div className="rounded-2xl bg-[#F5F7FA] p-4 text-sm flex justify-between gap-3">
            <span className="text-[#555]">Honorarios (exentos de IVA)</span>
            <span className="font-semibold">{eur(info.honorarios)}</span>
          </div>

          {errorGeneral && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{errorGeneral}
            </div>
          )}

          <BotonPrimario type="submit" disabled={enviando}>
            {enviando ? <><Loader2 className="h-5 w-5 animate-spin" />Generando tu contrato...</> : 'Generar mi contrato'}
          </BotonPrimario>
          <p className="text-xs text-[#888780] text-center">Una vez enviado, los datos no se pueden modificar. Si necesitas corregirlos, pide un nuevo enlace a tu asesor.</p>
        </form>
      </Tarjeta>
    </Shell>
  );
};

export default ContratoMandato;
