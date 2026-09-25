import { useEffect, useState } from "react";

const formato = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
// Las diferencias llevan signo: "+$ 2.000" sobra, "-$ 2.000" falta, "$ 0" cuadra.
const conSigno = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0, signDisplay: "exceptZero" });

export function pesos(monto: number, signo = false): string {
  // Intl mete un espacio duro (U+00A0) entre "$" y el número; lo sacamos para "$48.000".
  return (signo ? conSigno : formato).format(monto).replace(/ /g, "");
}

// "2026-09-23" → "martes 23 de septiembre". Mediodía para que la zona horaria no corra el día.
const formatoFecha = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
const formatoCorto = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
export const fechaLarga = (f: string) => formatoFecha.format(new Date(`${f}T12:00:00`)).replace(",", "");
export const fechaCorta = (f: string) => formatoCorto.format(new Date(`${f}T12:00:00`)).replace(".", "");

const CLAVE_TEMA = "quiniela-tema";
export type Tema = "claro" | "oscuro";

export function temaInicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === "claro" || guardado === "oscuro") return guardado;
  } catch {
    // localStorage no disponible: seguimos con la preferencia del sistema.
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.classList.toggle("dark", tema === "oscuro");
  // La barra del navegador en el celular sigue al tema elegido, aunque no coincida con el del sistema.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.setAttribute("content", tema === "oscuro" ? "#0a0a0a" : "#f5f5f5");
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // sin guardado persistente, el tema vuelve a la preferencia del sistema al recargar.
  }
}

// Escritorio: barra lateral, hojas como diálogo centrado y detalle al costado de la lista.
const CONSULTA_ESCRITORIO = "(min-width: 1024px)";
export function useEscritorio(): boolean {
  const [es, setEs] = useState(() => matchMedia(CONSULTA_ESCRITORIO).matches);
  useEffect(() => {
    const mq = matchMedia(CONSULTA_ESCRITORIO);
    const cambio = () => setEs(mq.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);
  return es;
}

// crypto.randomUUID solo existe en contextos seguros (HTTPS o localhost); fuera de eso, armamos un UUID v4 a mano.
export function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}
