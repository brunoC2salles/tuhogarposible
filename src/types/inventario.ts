export interface Inmueble {
  id: string;
  ciudad: string;
  region: string;
  tipo: 'apartamento' | 'casa' | 'local_comercial' | 'terreno' | 'oficina';
  precio: number;
  direccion: string;
  proveedor: string;
  disponible: boolean;
  fechaCreacion: Date;
  agenteAsignado?: string;
  codigoInventario?: string;
  titulo?: string;
  quartos?: number;
  banheiros?: number;
  areaM2?: number;
  urlExterna?: string;
  imageUrl?: string;
}

export interface Agente {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  fechaCreacion: Date;
  activo: boolean;
}

export interface Reserva {
  id: string;
  inmuebleId: string;
  agenteId: string;
  fechaSolicitud: Date;
  fechaVisita?: Date;
  horaVisita?: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
  notas?: string;
}

export interface FiltrosBusqueda {
  ciudad?: string;
  tipo?: string;
  precioMin?: number;
  precioMax?: number;
  quartos?: number;
}

export interface CSVInmueble {
  Ciudad: string;
  Region: string;
  Tipo: string;
  Precio: string;
  Direccion: string;
  Proveedor: string;
  CodigoInventario: string;
}