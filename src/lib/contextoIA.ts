import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export interface EntidadContexto {
  tipo: "cliente" | "oportunidad" | "oferta" | "accion";
  id: string;
  nombre: string;
}

interface Guardado {
  entidad?: EntidadContexto;
  ruta: string;
}

let guardado: Guardado | undefined;

// Las páginas de detalle publican lo visible; al salir, la ruta deja de
// coincidir y la entidad se ignora sola (sin necesidad de limpiar).
export function useFijarContextoIA(tipo: EntidadContexto["tipo"] | undefined, id?: string, nombre?: string) {
  const location = useLocation();
  const ruta = `${location.pathname}${location.search}`;
  useEffect(() => {
    guardado =
      tipo && id
        ? { entidad: { tipo, id, nombre: nombre ?? id }, ruta }
        : undefined;
    return () => {
      guardado = undefined;
    };
  }, [tipo, id, nombre, ruta]);
}

export function leerContexto(rutaActual: string): { ruta: string; entidad?: EntidadContexto } {
  if (guardado && guardado.ruta === rutaActual && guardado.entidad) {
    return { ruta: rutaActual, entidad: guardado.entidad };
  }
  return { ruta: rutaActual };
}
