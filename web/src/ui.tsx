import { useEffect, useId, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { m } from "motion/react";
import {
  Banknote, CircleAlert, CircleCheck, HandCoins, Landmark, LoaderCircle, NotebookPen, PiggyBank,
  ReceiptText, ShoppingBag, Smartphone, TriangleAlert, Trophy, Users, Wallet, X, type LucideIcon,
} from "lucide-react";
import type { MovimientoOut } from "./api/tipos";

export const EASE_SALIDA = [0.23, 1, 0.32, 1] as const;

// Superficies y piezas que se repiten entre pantallas: clases, no componentes (el máximo de compartidos es seis).
export const TARJETA = "rounded-xl border bg-card shadow-xs";
export const INSIGNIA = "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap";
export const TONOS = {
  exito: "bg-exito/8 text-exito",
  aviso: "bg-aviso/8 text-aviso",
  neutro: "bg-muted text-muted-foreground",
} as const;
// Opción elegible (tipo de pago, caja del arqueo): borde de 1 px que pasa a 2 px en el color del texto al elegirla.
export const OPCION =
  "presiona group flex cursor-pointer items-center gap-3 rounded-lg border bg-card shadow-xs hover:bg-muted/60 has-[:checked]:border-foreground has-[:checked]:ring-1 has-[:checked]:ring-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring";
export const PUNTO_RADIO = (
  <span className="grid size-4 shrink-0 place-items-center rounded-full border border-input transition-colors group-has-[:checked]:border-foreground" aria-hidden>
    <span className="size-2 scale-50 rounded-full bg-foreground opacity-0 transition-[opacity,transform] duration-150 ease-salida group-has-[:checked]:scale-100 group-has-[:checked]:opacity-100" />
  </span>
);

// Nombre, ícono y color de cada tipo de movimiento (SPECS §5.2). El color es el del ícono: dice qué pasó con la plata.
const T = (etiqueta: string, icono: LucideIcon = ReceiptText, tono = "text-muted-foreground") => ({ etiqueta, icono, tono });
export const TIPOS: Record<MovimientoOut["tipo"], ReturnType<typeof T>> = {
  fiado: T("Fiado", NotebookPen, "text-aviso"),
  cobro_fiado: T("Fiado de cliente", HandCoins, "text-exito"),
  cobro_mercado_pago: T("MP / transferencia", Smartphone, "text-peligro"),
  retiro_dueno: T("Retiro del dueño", Wallet, "text-peligro"),
  gasto: T("Gasto", ShoppingBag, "text-peligro"),
  pago_premio: T("Premio", Trophy, "text-premio"),
  apuesta_quiniela: T("Apuesta de quiniela"),
  venta_otro_juego: T("Venta de otro juego"),
  // D42: cobro_subagente e ingreso_del_dueno van a la caja grande, junto con pago_banco y sueldo.
  cobro_subagente: T("Subagente", Users, "text-exito"),
  ingreso_del_dueno: T("Lo trae el dueño", PiggyBank, "text-exito"),
  pago_banco: T("Banco", Landmark, "text-peligro"),
  sueldo: T("Sueldo", Banknote, "text-peligro"),
  traspaso: T("Traspaso"),
  traspaso_boletas: T("Traspaso de boletas"),
  rendicion_boletas: T("Rendición de boletas"),
};

// Botón: primario claro sobre oscuro (una acción principal por vista), secundario con borde.
// 44 px en el celular, la escala de escritorio (36 px) desde 1024 px.
const VARIANTES = {
  primario: "bg-primary text-primary-foreground hover:bg-primary/90",
  secundario: "border bg-card shadow-xs hover:bg-muted",
};
export function Boton({
  variante = "primario", cargando = false, className = "", children, disabled, ...props
}: { variante?: keyof typeof VARIANTES; cargando?: boolean } & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      {...props}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`presiona inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium whitespace-nowrap disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground lg:h-9 ${VARIANTES[variante]} ${className}`}
    >
      {cargando && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// Mensaje en línea: error, éxito o aviso. El color vive en el ícono y en un tinte; el texto queda en el de lectura.
const AVISOS = {
  error: [CircleAlert, "border-peligro/25 bg-peligro/5 [&>svg]:text-peligro"],
  exito: [CircleCheck, "border-exito/25 bg-exito/5 [&>svg]:text-exito"],
  aviso: [TriangleAlert, "border-aviso/30 bg-aviso/5 [&>svg]:text-aviso"],
} as const;
export function Aviso({ tono, children, accion }: { tono: keyof typeof AVISOS; children: ReactNode; accion?: ReactNode }) {
  const [Icono, clases] = AVISOS[tono];
  return (
    <m.div
      role={tono === "error" ? "alert" : "status"}
      initial={{ opacity: 0, transform: "translateY(-4px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.2, ease: EASE_SALIDA }}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${clases}`}
    >
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex-1">{children}</div>
      {accion}
    </m.div>
  );
}

// Monto en pesos enteros: teclado numérico, solo dígitos, separador de miles mientras se escribe, en mono.
export function CampoMonto({
  etiqueta, valor, onValor, grande = false, autoFocus, ...props
}: { etiqueta: string; valor: string; onValor: (v: string) => void; grande?: boolean } & Omit<ComponentPropsWithoutRef<"input">, "value" | "onChange">) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  // Autofocus propio (no el atributo nativo): entra con preventScroll para que la página no
  // salte mientras la hoja todavía está animando su entrada.
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">{etiqueta}</label>
      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 dark:bg-input/30">
        <span className={`monto text-muted-foreground ${grande ? "text-2xl" : "text-lg"}`} aria-hidden>$</span>
        <input
          id={id}
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          {...props}
          value={valor ? Number(valor).toLocaleString("es-AR") : ""}
          onChange={(e) => onValor(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))}
          className={`monto w-full min-w-0 bg-transparent font-semibold focus-visible:outline-none ${grande ? "h-16 text-[32px]" : "h-12 text-xl lg:h-11"}`}
        />
      </div>
    </div>
  );
}

// Control segmentado (turno del arqueo, orden de la cuenta corriente): sobre el gris, la opción elegida en el fondo, y viaja.
export function Segmentado<V extends string | number>({
  etiqueta, opciones, valor, onCambio,
}: { etiqueta: string; opciones: { valor: V; texto: string; detalle?: string; deshabilitada?: boolean }[]; valor: V | null; onCambio: (v: V) => void }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex gap-1 rounded-lg bg-muted p-1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={o.valor === valor}
          disabled={o.deshabilitada}
          onClick={() => onCambio(o.valor)}
          className="presiona relative flex min-h-11 flex-1 flex-col items-center justify-center rounded-md px-3 py-1 text-sm font-medium disabled:opacity-50 lg:min-h-8"
        >
          {o.valor === valor && (
            <m.span layoutId={id} className="absolute inset-0 rounded-md bg-card shadow-xs dark:bg-input" transition={{ type: "spring", duration: 0.3, bounce: 0 }} />
          )}
          <span className={`relative ${o.valor === valor ? "text-foreground" : "text-muted-foreground"}`}>{o.texto}</span>
          {o.detalle && <span className="relative text-xs text-muted-foreground">{o.detalle}</span>}
        </button>
      ))}
    </div>
  );
}

// Hoja: diálogo centrado, con margen a los costados y alto máximo en dvh (para no tapar el
// teclado del celular). Mismo trato en todos los tamaños: opacidad y escala corta, sin arrastre.
// Se monta dentro de <AnimatePresence> para que la salida se anime.
export function Hoja({
  titulo, descripcion, icono, onCerrar, children,
}: { titulo: string; descripcion?: string; icono?: ReactNode; onCerrar: () => void; children: ReactNode }) {
  const idTitulo = useId();
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  // Se guarda en el render, no en el efecto: los efectos de los hijos (CampoMonto con
  // autoFocus) corren antes que este, así que para cuando se ejecuta el foco ya se movió.
  const previo = useRef(document.activeElement as HTMLElement | null);

  useEffect(() => {
    // Si un hijo ya enfocó algo adentro (CampoMonto con autoFocus), no se lo robamos.
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true });
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar.current();
    document.addEventListener("keydown", tecla);

    // Bloqueo de scroll que funciona también en iOS Safari y Chrome Android, donde
    // overflow:hidden en el body no alcanza: fija el body donde estaba y lo devuelve al cerrar.
    const scrollY = window.scrollY;
    const { style } = document.body;
    const previoPosicion = style.position, previoTop = style.top, previoAncho = style.width;
    const previoOverflowHtml = document.documentElement.style.overflow;
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", tecla);
      style.position = previoPosicion;
      style.top = previoTop;
      style.width = previoAncho;
      document.documentElement.style.overflow = previoOverflowHtml;
      window.scrollTo(0, scrollY);
      previo.current?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 lg:p-6">
      <m.div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
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
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-xl border bg-card shadow-lg"
        initial={{ opacity: 0, transform: "scale(0.96)" }}
        animate={{ opacity: 1, transform: "scale(1)" }}
        exit={{ opacity: 0, transform: "scale(0.96)", transition: { duration: 0.15, ease: EASE_SALIDA } }}
        transition={{ duration: 0.2, ease: EASE_SALIDA }}
      >
        <div className="px-5 pb-3 pt-5 lg:px-6 lg:pt-6">
          <div className="flex items-start gap-3">
            {icono}
            <div className="min-w-0 flex-1">
              <h2 id={idTitulo} className="text-base font-semibold tracking-tight">{titulo}</h2>
              {descripcion && <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>}
            </div>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="presiona -mr-2 -mt-1.5 grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:size-8">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1 lg:px-6 lg:pb-6">{children}</div>
      </m.div>
    </div>
  );
}
