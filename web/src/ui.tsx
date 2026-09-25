import { useEffect, useId, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { m, useDragControls } from "motion/react";
import {
  CircleAlert, CircleCheck, HandCoins, LoaderCircle, NotebookPen, ReceiptText, ShoppingBag,
  Smartphone, TriangleAlert, Trophy, Wallet, X, type LucideIcon,
} from "lucide-react";
import type { MovimientoOut } from "./api/tipos";
import { useEscritorio } from "./util";

export const AVATAR = "grid size-10 shrink-0 place-items-center rounded-full bg-borde text-sm font-semibold text-tinta";
export const EASE_SALIDA = [0.23, 1, 0.32, 1] as const;
const EASE_HOJA = [0.32, 0.72, 0, 1] as const;

// Nombre, ícono y color de cada tipo de movimiento (SPECS §5.2), para listas y botones.
const T = (etiqueta: string, icono: LucideIcon = ReceiptText, tono = "bg-superficie-2 text-tinta-suave") => ({ etiqueta, icono, tono });
export const TIPOS: Record<MovimientoOut["tipo"], ReturnType<typeof T>> = {
  fiado: T("Fiado", NotebookPen, "bg-aviso-suave text-aviso"),
  cobro_fiado: T("Cobro de fiado", HandCoins, "bg-exito-suave text-exito"),
  cobro_mercado_pago: T("MP / transferencia", Smartphone, "bg-peligro-suave text-peligro"),
  retiro_dueno: T("Retiro del dueño", Wallet, "bg-peligro-suave text-peligro"),
  gasto: T("Gasto", ShoppingBag, "bg-peligro-suave text-peligro"),
  pago_premio: T("Premio", Trophy, "bg-noche text-en-noche"),
  apuesta_quiniela: T("Apuesta de quiniela"),
  venta_otro_juego: T("Venta de otro juego"),
  cobro_subagente: T("Cobro de subagente"),
  ingreso_del_dueno: T("Ingreso del dueño"),
  pago_banco: T("Pago al banco"),
  sueldo: T("Sueldo"),
  traspaso: T("Traspaso"),
  traspaso_boletas: T("Traspaso de boletas"),
  rendicion_boletas: T("Rendición de boletas"),
};

// Botón de toda la app: primario en azul (una acción principal por vista) y secundario.
const VARIANTES = {
  primario: "bg-acento text-en-acento hover:bg-acento-fuerte disabled:bg-superficie-2 disabled:text-tinta-suave",
  secundario: "bg-superficie-2 text-tinta hover:bg-borde disabled:opacity-50",
};
export function Boton({
  variante = "primario", cargando = false, className = "", children, disabled, ...props
}: { variante?: keyof typeof VARIANTES; cargando?: boolean } & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      {...props}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`presiona inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold whitespace-nowrap ${VARIANTES[variante]} ${className}`}
    >
      {cargando && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// Mensaje en línea: error (alerta), éxito o aviso, siempre con ícono y anunciado al lector.
const TONOS = {
  error: [CircleAlert, "bg-peligro-suave text-peligro"],
  exito: [CircleCheck, "bg-exito-suave text-exito"],
  aviso: [TriangleAlert, "bg-aviso-suave text-aviso"],
} as const;
export function Aviso({ tono, children, accion }: { tono: keyof typeof TONOS; children: ReactNode; accion?: ReactNode }) {
  const [Icono, clases] = TONOS[tono];
  return (
    <m.div
      role={tono === "error" ? "alert" : "status"}
      initial={{ opacity: 0, transform: "translateY(-4px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.2, ease: EASE_SALIDA }}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${clases}`}
    >
      <Icono className="size-5 shrink-0" aria-hidden />
      <div className="flex-1">{children}</div>
      {accion}
    </m.div>
  );
}

// Monto en pesos enteros: teclado numérico, solo dígitos, separador de miles mientras se escribe.
export function CampoMonto({
  etiqueta, valor, onValor, grande = false, ...props
}: { etiqueta: string; valor: string; onValor: (v: string) => void; grande?: boolean } & Omit<ComponentPropsWithoutRef<"input">, "value" | "onChange">) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-tinta-suave">{etiqueta}</label>
      <div className="flex items-center gap-1.5 rounded-xl bg-superficie-2 px-4 ring-acento-texto transition-shadow focus-within:ring-2">
        <span className={`font-semibold text-tinta-suave ${grande ? "text-3xl" : "text-xl"}`} aria-hidden>$</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          {...props}
          value={valor ? Number(valor).toLocaleString("es-AR") : ""}
          onChange={(e) => onValor(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))}
          className={`w-full min-w-0 bg-transparent font-semibold tracking-tight text-tinta focus-visible:outline-none ${grande ? "h-20 text-4xl" : "h-14 text-2xl"}`}
        />
      </div>
    </div>
  );
}

// Control segmentado (turno del arqueo, orden de la cuenta corriente): la pastilla viaja a la opción elegida.
export function Segmentado<V extends string | number>({
  etiqueta, opciones, valor, onCambio,
}: { etiqueta: string; opciones: { valor: V; texto: string; detalle?: string; deshabilitada?: boolean }[]; valor: V | null; onCambio: (v: V) => void }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex gap-1 rounded-xl bg-superficie-2 p-1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={o.valor === valor}
          disabled={o.deshabilitada}
          onClick={() => onCambio(o.valor)}
          className="presiona relative flex min-h-11 flex-1 flex-col items-center justify-center rounded-lg px-3 py-1 text-sm font-semibold disabled:opacity-45"
        >
          {o.valor === valor && (
            <m.span layoutId={id} className="absolute inset-0 rounded-lg bg-superficie shadow-tarjeta dark:bg-white/12" transition={{ type: "spring", duration: 0.3, bounce: 0 }} />
          )}
          <span className={`relative ${o.valor === valor ? "text-tinta" : "text-tinta-suave"}`}>{o.texto}</span>
          {o.detalle && <span className="relative text-xs font-medium text-tinta-suave">{o.detalle}</span>}
        </button>
      ))}
    </div>
  );
}

// Hoja: sube desde abajo en el celular (se cierra arrastrándola hacia abajo) y es un diálogo centrado en escritorio.
// Se monta dentro de <AnimatePresence> para que la salida se anime.
export function Hoja({ titulo, icono, onCerrar, children }: { titulo: string; icono?: ReactNode; onCerrar: () => void; children: ReactNode }) {
  const escritorio = useEscritorio();
  const arrastre = useDragControls();
  const idTitulo = useId();
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar.current();
    document.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
      previo?.focus();
    };
  }, []);

  // En el celular la hoja se mueve con "y" porque el arrastre necesita ese valor; en escritorio, transform.
  const fuera = escritorio ? { opacity: 0, transform: "scale(0.96)" } : { y: "100%" };
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center lg:p-6">
      <m.div
        className="absolute inset-0 bg-noche/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        onClick={onCerrar}
        aria-hidden
      />
      <m.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-[20px] bg-superficie shadow-flotante lg:max-w-md lg:rounded-2xl lg:ring-1 lg:ring-borde"
        initial={fuera}
        animate={escritorio ? { opacity: 1, transform: "scale(1)" } : { y: 0 }}
        // Al soltarla, la salida es un resorte: hereda la velocidad del dedo y no hay costura entre arrastre y animación.
        exit={{ ...fuera, transition: escritorio ? { duration: 0.15, ease: EASE_HOJA } : { type: "spring", bounce: 0, duration: 0.25 } }}
        transition={{ duration: escritorio ? 0.2 : 0.28, ease: EASE_HOJA }}
        drag={escritorio ? false : "y"}
        dragControls={arrastre}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.8 }}
        onDragEnd={(_, i) => (i.offset.y > 110 || i.velocity.y > 300) && onCerrar()}
      >
        <div className="touch-none px-5 pb-2 pt-2.5 lg:pt-5" onPointerDown={(e) => arrastre.start(e)}>
          <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-borde lg:hidden" aria-hidden />
          <div className="flex items-center gap-3">
            {icono}
            <h2 id={idTitulo} className="flex-1 text-lg font-semibold tracking-tight">{titulo}</h2>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="presiona -mr-2 grid size-11 place-items-center rounded-full text-tinta-suave hover:bg-superficie-2">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">{children}</div>
      </m.div>
    </div>
  );
}
