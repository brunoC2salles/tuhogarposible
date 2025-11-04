import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Inmueble } from "@/types/inventario";
import Logo from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { BedDouble, Bath, Ruler, MapPin, Home, MessageCircle } from "lucide-react";

export default function ProdutoPublico() {
  const { id } = useParams<{ id: string }>();
  const [inmueble, setInmueble] = useState<Inmueble | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchInmueble = async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('inmuebles')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          setNotFound(true);
        } else {
          // Converter dados do banco para o tipo Inmueble
          const converted: Inmueble = {
            id: data.id,
            ciudad: data.ciudad,
            region: data.region,
            tipo: data.tipo,
            precio: Number(data.precio),
            direccion: data.direccion,
            proveedor: data.proveedor,
            disponible: data.disponible,
            fechaCreacion: new Date(data.created_at),
            codigoInventario: data.codigo_inventario || undefined,
            titulo: data.titulo || undefined,
            quartos: data.quartos || undefined,
            banheiros: data.banheiros || undefined,
            areaM2: data.area_m2 ? Number(data.area_m2) : undefined,
            urlExterna: data.url_externa || undefined,
            imageUrl: data.image_url || undefined,
            images: (data.images as string[]) || undefined,
          };
          setInmueble(converted);
        }
      } catch (err) {
        console.error('Error fetching inmueble:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchInmueble();
  }, [id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      apartamento: 'Apartamento',
      casa: 'Casa',
      local_comercial: 'Local Comercial',
      terreno: 'Terreno',
      oficina: 'Oficina'
    };
    return labels[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (notFound || !inmueble) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center">Producto no encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              El producto que buscas no existe o no está disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inmueble.disponible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center">Producto no disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Este producto ya no está disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Preparar imagens para o carrossel
  const images = inmueble.images && inmueble.images.length > 0 
    ? inmueble.images 
    : inmueble.imageUrl 
    ? [inmueble.imageUrl] 
    : [];

  const hasMultipleImages = images.length > 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header com Logo */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-center">
          <Logo size="lg" />
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Carrossel de Imagens */}
        {images.length > 0 ? (
          <div className="mb-8">
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((imageUrl, index) => (
                  <CarouselItem key={index}>
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={imageUrl}
                        alt={`${inmueble.titulo || inmueble.ciudad} - Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {hasMultipleImages && (
                <>
                  <CarouselPrevious className="left-4" />
                  <CarouselNext className="right-4" />
                </>
              )}
            </Carousel>
            {hasMultipleImages && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                {images.length} {images.length === 1 ? 'foto' : 'fotos'}
              </p>
            )}
          </div>
        ) : (
          <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center mb-8">
            <Home className="w-16 h-16 text-muted-foreground" />
          </div>
        )}

        {/* Informações do Produto */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 mb-2">
              <CardTitle className="text-3xl">
                {inmueble.titulo || `${inmueble.ciudad} (${inmueble.region})`}
              </CardTitle>
              <Badge variant="secondary" className="text-sm whitespace-nowrap">
                {getTipoLabel(inmueble.tipo)}
              </Badge>
            </div>
            <div className="text-4xl font-bold text-primary">
              {formatPrice(inmueble.precio)}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Características */}
            {(inmueble.quartos || inmueble.banheiros || inmueble.areaM2) && (
              <div className="flex flex-wrap gap-6">
                {inmueble.quartos && (
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Habitaciones</p>
                      <p className="font-semibold">{inmueble.quartos}</p>
                    </div>
                  </div>
                )}
                {inmueble.banheiros && (
                  <div className="flex items-center gap-2">
                    <Bath className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Baños</p>
                      <p className="font-semibold">{inmueble.banheiros}</p>
                    </div>
                  </div>
                )}
                {inmueble.areaM2 && (
                  <div className="flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Área</p>
                      <p className="font-semibold">{inmueble.areaM2}m²</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Endereço */}
            <div>
              <div className="flex items-start gap-2 mb-2">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Ubicación</p>
                  <p className="font-medium">{inmueble.direccion}</p>
                  <p className="text-sm text-muted-foreground">{inmueble.ciudad}, {inmueble.region}</p>
                </div>
              </div>
            </div>

            {/* Código de Inventário */}
            {inmueble.codigoInventario && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Código de inventario</p>
                <Badge variant="outline">{inmueble.codigoInventario}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer Fixo com Botão WhatsApp */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <Button 
            asChild
            size="lg" 
            className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white"
          >
            <a 
              href="https://wa.me/34621495705" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              ¡Contáctanos!
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
