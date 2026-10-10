// Lo que las tres direcciones comparten: el shell (celular y escritorio), el campo de monto con borde >=3:1,
// la lógica del arqueo y las piezas de datos. El sistema es fijo; cada variante cambia la estructura.
import { useEffect, useId, useState, type ReactNode } from "react";
import { m } from "motion/react";
import {
  Archive, Banknote, BookUser, Calculator, ChartColumn, CircleUser, House, LogOut, LucideProvider, MessageSquareText, Moon,
  ReceiptText, Sparkles, Star, Sun, TriangleAlert, Zap, type LucideIcon,
} from "lucide-react";
import { EASE_SALIDA, INSIGNIA, TIPOS, TONOS } from "../src/ui";
import { fechaLarga, pesos } from "../src/util";
import { CAJAS, DEMOS, ENTRA, ESPERADOS, FECHA, MOVIMIENTOS, NEGOCIO, PENDIENTES, RENDICION_PENDIENTE, SIN_EFECTIVO, TURNOS, USUARIO } from "./datos";

export const vActual = () => Number(new URLSearchParams(location.search).get("v")) || 1;
export const H1 = "text-[22px] font-semibold tracking-tight lg:text-2xl";

// ---------- Shell ----------
const NAV: { id: string; texto: string; corto: string; icono: LucideIcon }[] = [
  { id: "inicio", texto: "Inicio", corto: "Inicio", icono: House },
  { id: "carga", texto: "Carga rápida", corto: "Cargar", icono: Zap },
  { id: "arqueo", texto: "Arqueo", corto: "Arqueo", icono: Calculator },
  { id: "fiados", texto: "Cuenta corriente", corto: "Fiados", icono: BookUser },
  { id: "reportes", texto: "Reportes", corto: "Reportes", icono: ChartColumn },
  { id: "asistente", texto: "Asistente", corto: "Asistente", icono: Sparkles },
];
// Solo Inicio y Arqueo existen en los prototipos; los otros destinos no van a ningún lado.
export const destino = (id: string) => (id === "inicio" || id === "arqueo" ? `${id}.html?v=${vActual()}` : "#");
const ICONO_BOTON = "presiona grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:size-8";
const ITEM = "presiona relative flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm";
const Marca = () => (
  <span className="flex min-w-0 items-center gap-2.5">
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden><Star className="size-4" /></span>
    <span className="truncate text-[15px] font-semibold tracking-tight">{NEGOCIO}</span>
  </span>
);

export function Shell({ activa, trazo, children }: { activa: string; trazo: number; children: ReactNode }) {
  const [oscuro, setOscuro] = useState(() => document.documentElement.classList.contains("dark"));
  const alternar = () => {
    document.documentElement.classList.toggle("dark", !oscuro);
    try { localStorage.setItem("proto-tema", oscuro ? "claro" : "oscuro"); } catch { /* sin guardado */ }
    setOscuro(!oscuro);
  };
  const Tema = oscuro ? Sun : Moon;
  return (
    <LucideProvider strokeWidth={trazo}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
        <aside className="hidden border-r bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
          <div className="flex h-14 items-center px-4"><Marca /></div>
          <nav aria-label="Principal" className="flex flex-col gap-0.5 p-2">
            {NAV.map((n) => (
              <a key={n.id} href={destino(n.id)} aria-current={n.id === activa ? "page" : undefined}
                className={`${ITEM} ${n.id === activa ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
                <n.icono className="size-4" aria-hidden />{n.texto}
              </a>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-0.5 border-t p-2">
            <p className={`${ITEM} font-medium`}><CircleUser className="size-4 text-muted-foreground" aria-hidden />{USUARIO} Ibarra</p>
            <button type="button" className={`${ITEM} text-muted-foreground hover:bg-muted/60 hover:text-foreground`}><LogOut className="size-4" aria-hidden />Cerrar sesión</button>
          </div>
        </aside>

        <div className="min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          <header className="sticky top-0 z-20 border-b bg-background pt-[env(safe-area-inset-top)]">
            <div className="flex h-14 items-center gap-1 pl-4 pr-2 lg:pl-8 lg:pr-6">
              <span className="min-w-0 flex-1 lg:hidden"><Marca /></span>
              <span className="hidden min-w-0 flex-1 items-center gap-3 text-sm lg:flex">
                <span className="font-medium first-letter:uppercase">{fechaLarga(FECHA)}</span>
                <span className={`${INSIGNIA} ${TONOS.exito}`}>Día abierto</span>
              </span>
              <button type="button" onClick={alternar} aria-label={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} className={ICONO_BOTON}>
                <Tema className="size-4" aria-hidden />
              </button>
            </div>
          </header>
          <main className="px-4 pb-8 pt-5 lg:max-w-[1600px] lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
        </div>

        <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-6">
            {NAV.map((n) => (
              <a key={n.id} href={destino(n.id)} aria-current={n.id === activa ? "page" : undefined}
                className={`presiona relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${n.id === activa ? "text-foreground" : "text-muted-foreground"}`}>
                {n.id === activa && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-foreground" />}
                <n.icono className="size-5" strokeWidth={n.id === activa ? trazo + 0.5 : trazo} aria-hidden />{n.corto}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </LucideProvider>
  );
}

// ---------- Datos de Inicio ----------
export const diasDesde = (d: number) => (d === 0 ? "Desde hoy" : `Hace ${d} ${d === 1 ? "día" : "días"}`);
export const CARGAR = [
  { etiqueta: "Fiado", icono: TIPOS.fiado.icono, tono: TIPOS.fiado.tono },
  { etiqueta: "Cobro", icono: TIPOS.cobro_fiado.icono, tono: TIPOS.cobro_fiado.tono },
  { etiqueta: "Pago", icono: Banknote, tono: TIPOS.gasto.tono },
  { etiqueta: "Premio", icono: TIPOS.pago_premio.icono, tono: TIPOS.pago_premio.tono },
];
export const hayTurnoAbierto = TURNOS.some((t) => t.estado === "abierto");
// Lo que hay que hacer hoy, con las palabras del local (nada de "caja_grande_mañana").
export function hacer() {
  const sin = TURNOS.find((t) => t.estado === "abierto" && !t.tiene_ticket);
  const lista: { clave: string; icono: LucideIcon; titulo: string; detalle: string; boton: string; href?: string }[] = [];
  if (sin) lista.push({ clave: "ticket", icono: ReceiptText, titulo: `Cargar el ticket del turno ${sin.nombre}`, detalle: "Sin ticket, la caja chica no se puede arquear.", boton: "Cargar ticket" });
  for (const p of PENDIENTES) {
    lista.push({ clave: `arqueo-${p.caja_id}`, icono: Calculator, titulo: `Arquear la ${CAJAS.find((c) => c.id === p.caja_id)!.nombre.toLowerCase()}, turno ${TURNOS.find((t) => t.id === p.turno_id)!.nombre}`, detalle: "Pendiente desde que cerró el turno.", boton: "Arquear", href: destino("arqueo") });
  }
  if (RENDICION_PENDIENTE) lista.push({ clave: "rendicion", icono: Archive, titulo: "Rendir las boletas de ayer", detalle: "Contarlas y archivarlas.", boton: "Rendir" });
  return lista;
}
export const motivoCierre = () => {
  const partes = [hayTurnoAbierto && `cerrar el turno ${TURNOS.find((t) => t.estado === "abierto")!.nombre}`, PENDIENTES.length > 0 && `hacer ${PENDIENTES.length} arqueo${PENDIENTES.length > 1 ? "s" : ""}`].filter(Boolean);
  return `Falta ${partes.join(" y ")}.`;
};
// Con signo según hacia dónde va la plata; el fiado no mueve efectivo y va sin signo.
export const firmado = (mov: (typeof MOVIMIENTOS)[number]) => (SIN_EFECTIVO.has(mov.tipo) ? pesos(mov.monto) : pesos(ENTRA.has(mov.tipo) ? mov.monto : -mov.monto, true));

// ---------- Arqueo ----------
export type Resultado = { efectivo_esperado: number; boletas_esperadas: number; diferencia_efectivo: number; diferencia_boletas: number; cuadra: boolean };

export function useArqueo() {
  const [cajaId, setCajaId] = useState<number | null>(PENDIENTES[0]?.caja_id ?? null);
  const [turnoElegido, setTurnoElegido] = useState<number | null>(null);
  const [efectivo, setEfectivoRaw] = useState("");
  const [boletas, setBoletasRaw] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const caja = CAJAS.find((c) => c.id === cajaId);
  const esChica = caja?.tipo === "operativa";
  const abiertos = TURNOS.filter((t) => t.estado === "abierto");
  // El turno sale del arqueo pendiente de la caja (o del único turno abierto, en la chica); si no hay, ninguno marcado.
  const turnoId = turnoElegido ?? (esChica ? (abiertos.length === 1 ? abiertos[0].id : null) : (PENDIENTES.find((p) => p.caja_id === cajaId)?.turno_id ?? null));
  const turno = TURNOS.find((t) => t.id === turnoId);
  const esperado = ESPERADOS[`${cajaId}-${turnoId}`];
  const sinTicket = !!esChica && !!turno && !turno.tiene_ticket;
  const falta = [!efectivo && "el efectivo contado", !boletas && "las boletas (0 si no hay)"].filter(Boolean).join(" y ");
  const bloqueo = !caja ? "Elegí la caja." : !turno ? "Elegí el turno." : sinTicket ? `El turno ${turno.nombre} no tiene ticket: cargalo para arquear la caja chica.`
    : falta ? `Falta cargar ${falta}.` : resultado ? "Cambiá un dato para arquear de nuevo." : null;

  // Todo cambio borra el resultado a la vista: nunca queda uno viejo con datos nuevos.
  const cambiar = <T,>(set: (v: T) => void) => (v: T) => { set(v); setResultado(null); };
  const demo = (k: keyof typeof DEMOS) => { setCajaId(2); setTurnoElegido(null); setEfectivoRaw(String(DEMOS[k][0])); setBoletasRaw(String(DEMOS[k][1])); setResultado(null); };
  useEffect(() => { // ?demo=cuadra | no precarga conteos de prueba
    const k = new URLSearchParams(location.search).get("demo");
    if (k === "cuadra" || k === "no") demo(k);
  }, []);

  return {
    caja, cajaId, turno, turnoId, efectivo, boletas, resultado, sinTicket, bloqueo,
    total: resultado ? resultado.diferencia_efectivo + resultado.diferencia_boletas : 0, // la única suma que muestra la web (D2)
    elegirCaja: (id: number) => { cambiar(setCajaId)(id); setTurnoElegido(null); },
    elegirTurno: cambiar(setTurnoElegido),
    elegir: (c: number, t: number) => { cambiar(setCajaId)(c); setTurnoElegido(t); },
    setEfectivo: cambiar(setEfectivoRaw), setBoletas: cambiar(setBoletasRaw),
    arquear: () => {
      if (bloqueo || !esperado) return;
      const de = Number(efectivo) - esperado.efectivo, db = Number(boletas) - esperado.boletas;
      setResultado({ efectivo_esperado: esperado.efectivo, boletas_esperadas: esperado.boletas, diferencia_efectivo: de, diferencia_boletas: db, cuadra: !de && !db });
    },
  };
}

// Monto en pesos enteros, como el de la app pero con el borde del campo a >=3:1 (claro #8a8a8a, oscuro #6b6b6b) y sin "0" de relleno.
export function CampoMonto({ etiqueta, ayuda, valor, onValor, className = "" }: { etiqueta: string; ayuda?: string; valor: string; onValor: (v: string) => void; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">{etiqueta}</label>
      <div className="flex items-center gap-2 rounded-md border border-[#8a8a8a] bg-background px-3 shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 dark:border-[#6b6b6b] dark:bg-input/30">
        <span className="monto text-lg text-muted-foreground" aria-hidden>$</span>
        <input id={id} type="text" inputMode="numeric" autoComplete="off" value={valor ? Number(valor).toLocaleString("es-AR") : ""}
          onChange={(e) => onValor(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))}
          className="monto h-12 w-full min-w-0 bg-transparent text-xl font-semibold focus-visible:outline-none lg:h-11" />
      </div>
      {ayuda && <p className="mt-2 text-sm text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

// Las filas del resultado entran en cascada corta (DESIGN §8): el arqueo se ve cuatro veces por día.
export const fila = (i: number) => ({
  initial: { opacity: 0, transform: "translateY(4px)" },
  animate: { opacity: 1, transform: "translateY(0px)" },
  transition: { duration: 0.22, delay: 0.12 + i * 0.04, ease: EASE_SALIDA },
});
export const entra = {
  initial: { opacity: 0, transform: "translateY(8px) scale(0.98)" },
  animate: { opacity: 1, transform: "translateY(0px) scale(1)" },
  exit: { opacity: 0, transition: { duration: 0.12 } },
  transition: { type: "spring" as const, duration: 0.4, bounce: 0 },
};
export const verse = (el: HTMLElement | null) => { el?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };

// El círculo del resultado: el tilde es un trazo que se dibuja; el alerta, un ícono quieto.
export const Sello = ({ cuadra }: { cuadra: boolean }) => (
  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${cuadra ? "bg-exito/10 text-exito" : "bg-peligro/10 text-peligro"}`}>
    {cuadra ? (
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <m.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.15, ease: EASE_SALIDA }} />
      </svg>
    ) : <TriangleAlert className="size-[18px]" aria-hidden />}
  </span>
);
// Una diferencia distinta de cero va en rojo: es lo que hay que mirar.
export const Dif = ({ v, className = "" }: { v: number; className?: string }) => (
  <span className={`monto ${v ? "font-medium text-peligro" : "text-muted-foreground"} ${className}`}>{pesos(v, true)}</span>
);
export const Asistente = ({ className = "" }: { className?: string }) => (
  <a href="#" className={`presiona inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted lg:min-h-9 ${className}`}>
    <MessageSquareText className="size-4" aria-hidden />Preguntarle al asistente
  </a>
);
