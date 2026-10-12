import { useEffect, useId, useRef, type ComponentProps, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { m, usePresence, useReducedMotion } from "motion/react";
import {
  Banknote, CircleAlert, CircleCheck, HandCoins, Landmark, LoaderCircle, NotebookPen, PiggyBank,
  ReceiptText, ShoppingBag, Smartphone, TriangleAlert, Trophy, Users, Wallet, X, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MovimientoOut } from "./api/tipos";

export const EASE_SALIDA = [0.23, 1, 0.32, 1] as const;

// Renglón de lista (Inicio, Movimientos) y hora en 24 h ("13:30"; hourCycle h23 evita el "24:05" de hour12:false).
export const FILA = "flex min-h-14 items-center gap-3 px-4 py-2.5 lg:px-5";
const horaFormato = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const hora = (iso: string) => horaFormato.format(new Date(iso));

// Superficies y piezas que se repiten entre pantallas: clases, no componentes (el máximo de compartidos es seis).
export const TARJETA = "rounded-xl border bg-card shadow-xs";
export const INSIGNIA = "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap";
export const TONOS = {
  exito: "bg-exito/8 text-exito",
  aviso: "bg-aviso/8 text-aviso",
  peligro: "bg-peligro/8 text-peligro",
  neutro: "bg-muted text-muted-foreground",
} as const;
// Opción elegible (tipo de pago, caja del arqueo): borde de 1 px que pasa a 2 px en el color del texto al elegirla.
export const OPCION =
  "presiona group flex cursor-pointer items-center gap-3 rounded-lg border bg-card shadow-xs hover:bg-muted/60 has-[:checked]:border-foreground has-[:checked]:ring-1 has-[:checked]:ring-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring";
export const PUNTO_RADIO = (
  <span className="grid size-4 shrink-0 place-items-center rounded-full border border-input transition-colors group-has-[:checked]:border-foreground" aria-hidden>
    <span className="size-2 scale-50 rounded-full bg-foreground opacity-0 transition-[opacity,transform] duration-150 ease-salida motion-reduce:scale-100 group-has-[:checked]:scale-100 group-has-[:checked]:opacity-100" />
  </span>
);

// Nombre, ícono y color de cada tipo de movimiento (SPECS §5.2). El color es el del ícono: dice qué pasó con la plata.
const T = (etiqueta: string, icono: LucideIcon = ReceiptText, tono = "text-muted-foreground") => ({ etiqueta, icono, tono });
export const TIPOS: Record<MovimientoOut["tipo"], ReturnType<typeof T>> = {
  fiado: T("Fiado", NotebookPen, "text-aviso"),
  cobro_fiado: T("Cobro de fiado", HandCoins, "text-exito"),
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

// Botón: primario claro sobre oscuro (una acción principal por vista), secundario con borde. Los tamaños
// (44 px en el celular, 48 el "lg" de guardar y arquear, y la escala de escritorio desde lg) vienen de buttonVariants.
const VARIANTES = { primario: "default", secundario: "outline" } as const;
export function Boton({
  variante = "primario", cargando = false, disabled, children, ...props
}: { variante?: keyof typeof VARIANTES; cargando?: boolean } & Omit<ComponentProps<typeof Button>, "variant">) {
  return (
    <Button {...props} variant={VARIANTES[variante]} disabled={disabled || cargando} aria-busy={cargando || undefined}>
      {cargando && <LoaderCircle className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

export const Reintentar = ({ onClick }: { onClick: () => void }) => (
  <Button type="button" variant="link" size="sm" onClick={onClick} className="-my-1 px-2">Reintentar</Button>
);

// Mensaje en línea: error, éxito o aviso. El color vive en el ícono y en un tinte; el texto queda en el de lectura.
const AVISOS = {
  error: [CircleAlert, "border-peligro/25 bg-peligro/5 [&>svg]:text-peligro"],
  exito: [CircleCheck, "border-exito/25 bg-exito/5 [&>svg]:text-exito"],
  aviso: [TriangleAlert, "border-aviso/30 bg-aviso/5 [&>svg]:text-aviso"],
} as const;
export function Aviso({ tono, children, accion }: { tono: keyof typeof AVISOS; children: ReactNode; accion?: ReactNode }) {
  const [Icono, clases] = AVISOS[tono];
  const y = useReducedMotion() ? 0 : -4; // motion no reduce los strings de transform
  return (
    <m.div
      role={tono === "error" ? "alert" : "status"}
      initial={{ opacity: 0, transform: `translateY(${y}px)` }}
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

// Aviso repetido en las pantallas que necesitan un día abierto para actuar (D3, §3).
export function AvisoAbrirDia() {
  return (
    <Aviso tono="aviso">
      Todavía no se abrió el día. <a href="#" className="font-medium underline underline-offset-4">Abrilo desde Inicio</a>.
    </Aviso>
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
      <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
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
            <m.span layoutId={id} className="absolute inset-0 rounded-md bg-card shadow-xs dark:bg-foreground/15" transition={{ type: "spring", duration: 0.3, bounce: 0 }} />
          )}
          <span className={`relative ${o.valor === valor ? "text-foreground" : "text-muted-foreground"}`}>{o.texto}</span>
          {o.detalle && <span className="relative text-xs text-muted-foreground">{o.detalle}</span>}
        </button>
      ))}
    </div>
  );
}

// Hoja: el Dialog de shadcn/Radix (foco atrapado, Escape, fondo inerte, foco devuelto al botón que la abrió).
// Se monta dentro de <AnimatePresence>: al desmontarla, usePresence deja que corra la salida (150 ms, CSS) y recién ahí la saca.
export function Hoja({
  titulo, descripcion, icono, onCerrar, children,
}: { titulo: string; descripcion?: string; icono?: ReactNode; onCerrar: () => void; children: ReactNode }) {
  const [presente, salir] = usePresence();
  // Se guarda en el render, no en el efecto: los hijos con autoFocus (CampoMonto) enfocan antes que Radix.
  const previo = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    if (presente) return;
    const t = setTimeout(() => salir?.(), 160);
    return () => clearTimeout(t);
  }, [presente, salir]);

  return (
    <Dialog open={presente} onOpenChange={(abierta) => !abierta && onCerrar()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 p-0 lg:p-0"
        {...(descripcion ? {} : { "aria-describedby": undefined })}
        // Si un hijo ya enfocó algo (CampoMonto con autoFocus) no se lo robamos; si no, el foco va a la hoja.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const hoja = e.target as HTMLElement;
          if (!hoja.contains(document.activeElement)) hoja.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          previo.current?.focus();
        }}
      >
        <div className="flex items-start gap-3 px-5 pb-3 pt-5 lg:px-6 lg:pt-6">
          {icono}
          <DialogHeader className="min-w-0 flex-1 gap-0.5">
            <DialogTitle>{titulo}</DialogTitle>
            {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
          </DialogHeader>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar" className="-mr-2 -mt-1.5 text-muted-foreground"><X aria-hidden /></Button>
          </DialogClose>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1 lg:px-6 lg:pb-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
