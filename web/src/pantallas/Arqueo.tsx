import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { Info, Landmark, Sparkles, Store, TriangleAlert } from "lucide-react";
import { api, ApiError } from "../api/cliente";
import type { ArqueoOut } from "../api/tipos";
import { pesos } from "../util";
import { Aviso, Boton, CampoMonto, EASE_SALIDA, OPCION, PUNTO_RADIO, Segmentado, TARJETA } from "../ui";

// Las filas del resultado entran en cascada corta: el arqueo se ve cuatro veces por día, no decenas.
const fila = (i: number) => ({
  initial: { opacity: 0, transform: "translateY(4px)" },
  animate: { opacity: 1, transform: "translateY(0px)" },
  transition: { duration: 0.22, delay: 0.12 + i * 0.04, ease: EASE_SALIDA },
});
// Una diferencia distinta de cero va en rojo: es lo que hay que mirar.
const Dato = ({ i, nombre, valor, diferencia }: { i: number; nombre: string; valor: number; diferencia?: boolean }) => (
  <m.div {...fila(i)} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
    <span className="text-muted-foreground">{nombre}</span>
    <span className={`monto ${diferencia ? (valor ? "font-medium text-peligro" : "text-muted-foreground") : ""}`}>{pesos(valor, diferencia)}</span>
  </m.div>
);

// El resultado es el momento del arqueo. El tilde es un trazo que se dibuja; el alerta, un ícono quieto.
function Resultado({ r }: { r: ArqueoOut }) {
  const cierra = r.estado === "cuadra";
  const total = r.diferencia_efectivo + r.diferencia_boletas;
  return (
    <m.div
      ref={(el) => el?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      initial={{ opacity: 0, transform: "translateY(8px) scale(0.98)" }}
      animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ type: "spring", duration: 0.4, bounce: 0 }}
      role="status"
      className={`${TARJETA} scroll-mb-24 overflow-hidden lg:scroll-mb-6`}
    >
      <div className="flex items-start gap-3 border-b p-4 lg:p-5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${cierra ? "bg-exito/10 text-exito" : "bg-peligro/10 text-peligro"}`}>
          {cierra ? (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <m.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.15, ease: EASE_SALIDA }} />
            </svg>
          ) : (
            <TriangleAlert className="size-[18px]" aria-hidden />
          )}
        </span>
        <div>
          <p className={`text-lg font-semibold tracking-tight ${cierra ? "text-exito" : "text-peligro"}`}>{cierra ? "Cuadra" : "No cuadra"}</p>
          <p className="text-sm text-muted-foreground">{cierra ? "Las dos diferencias dan cero." : "Quedó guardado con su diferencia."}</p>
        </div>
      </div>
      {/* D2: dos diferencias y la suma a la vista. Cuadra solo si las dos dan cero, no si la suma da cero. */}
      <div className="px-4 py-3 lg:px-5">
        <m.p {...fila(0)} className="rotulo pb-1 text-muted-foreground">Efectivo</m.p>
        <Dato i={1} nombre="Esperado" valor={r.efectivo_esperado} />
        <Dato i={2} nombre="Diferencia" valor={r.diferencia_efectivo} diferencia />
        <m.p {...fila(3)} className="rotulo pb-1 pt-3 text-muted-foreground">Boletas</m.p>
        <Dato i={4} nombre="Esperadas" valor={r.boletas_esperadas} />
        <Dato i={5} nombre="Diferencia" valor={r.diferencia_boletas} diferencia />
      </div>
      <m.div {...fila(6)} className="flex items-baseline justify-between gap-3 border-t bg-muted/40 px-4 py-3 font-semibold lg:px-5">
        <span>Diferencia total</span>
        <span className={`monto ${total ? "text-peligro" : ""}`}>{pesos(total, true)}</span>
      </m.div>
      {!cierra && (
        <div className="border-t p-4 lg:px-5">
          <button type="button" disabled className="flex min-h-11 w-full items-center gap-2 rounded-md border border-dashed px-3 text-left text-sm text-muted-foreground lg:min-h-9">
            <Sparkles className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">Preguntarle al asistente</span>
            <span className="text-xs">Próximamente</span>
          </button>
        </div>
      )}
    </m.div>
  );
}

export function Arqueo() {
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const [cajaId, setCajaId] = useState<number | null>(null);
  const [turnoElegido, setTurnoId] = useState<number | null>(null);
  const [efectivo, setEfectivo] = useState("");
  const [boletas, setBoletas] = useState("");
  const [resultado, setResultado] = useState<ArqueoOut | null>(null);

  const cajas = dia.data?.cajas ?? [];
  const turnos = dia.data?.turnos ?? [];
  // Con un solo turno abierto, ya queda elegido.
  const abiertos = turnos.filter((t) => t.estado === "abierto");
  const turnoId = turnoElegido ?? (abiertos.length === 1 ? abiertos[0].id : null);
  const caja = cajas.find((c) => c.id === cajaId);
  const turno = turnos.find((t) => t.id === turnoId);

  const guardar = useMutation({
    mutationFn: () => api.arqueo({
      caja_id: cajaId!, turno_id: turnoId!,
      efectivo_contado: Number(efectivo), boletas_contadas: Number(boletas),
    }),
    onSuccess: setResultado,
  });

  // Todo cambio invalida el resultado a la vista: nunca queda un resultado viejo con datos nuevos.
  const cambiar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setResultado(null);
    guardar.reset();
  };

  const sinTicket = caja?.tipo === "operativa" && !!turno && !turno.tiene_ticket;
  const faltan = [!cajaId && "la caja", !turnoId && "el turno", !efectivo && "el efectivo contado", !boletas && "las boletas (0 si no hay)"].filter(Boolean);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!faltan.length && !sinTicket) guardar.mutate();
        }}
        className="flex flex-col gap-6 lg:max-w-2xl lg:rounded-xl lg:border lg:bg-card lg:p-6 lg:shadow-xs"
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Caja</legend>
          {dia.isLoading && <div className="esqueleto h-[76px]" />}
          {dia.isError && <Aviso tono="error">No se pudo traer el día. Revisá la conexión.</Aviso>}
          <div className="grid grid-cols-2 gap-3">
            {cajas.map((c) => {
              const Icono = c.tipo === "operativa" ? Store : Landmark;
              return (
                <label key={c.id} className={`${OPCION} min-h-[76px] items-start p-4`}>
                  <input type="radio" name="caja" className="sr-only" checked={c.id === cajaId} onChange={() => cambiar(setCajaId)(c.id)} />
                  <span className="flex-1">
                    <Icono className="size-5 text-muted-foreground transition-colors group-has-[:checked]:text-foreground" aria-hidden />
                    <span className="mt-2 block text-sm font-medium">{c.nombre}</span>
                  </span>
                  {PUNTO_RADIO}
                </label>
              );
            })}
          </div>
        </fieldset>

        {turnos.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Turno</p>
            <Segmentado
              etiqueta="Turno"
              valor={turnoId}
              onCambio={cambiar(setTurnoId)}
              opciones={turnos.map((t) => ({ valor: t.id, texto: t.nombre.charAt(0).toUpperCase() + t.nombre.slice(1), detalle: t.estado, deshabilitada: t.estado !== "abierto" }))}
            />
          </div>
        )}

        {sinTicket && (
          <Aviso tono="aviso">El turno {turno.nombre} todavía no tiene el ticket cargado: sin ticket, la caja chica no se puede arquear.</Aviso>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoMonto etiqueta="Efectivo contado" valor={efectivo} onValor={cambiar(setEfectivo)} enterKeyHint="next" />
          <CampoMonto etiqueta="Boletas contadas" valor={boletas} onValor={cambiar(setBoletas)} enterKeyHint="done" />
        </div>

        {guardar.isError && <Aviso tono="error">{guardar.error instanceof ApiError ? guardar.error.detalle : "No se pudo arquear."}</Aviso>}

        <div>
          <Boton type="submit" cargando={guardar.isPending} disabled={faltan.length > 0 || sinTicket || !!resultado} className="h-12 w-full text-base lg:h-10 lg:text-sm">
            {guardar.isPending ? "Arqueando…" : "Arquear"}
          </Boton>
          <p aria-live="polite" className="mt-3 flex min-h-5 items-start justify-center gap-1.5 text-center text-sm text-muted-foreground empty:mt-0 empty:min-h-0">
            {faltan.length > 0 && !sinTicket && (
              <>
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                Para arquear, completá {faltan.join(", ").replace(/, ([^,]*)$/, " y $1")}.
              </>
            )}
          </p>
        </div>
      </form>

      <div className="mt-6 lg:mt-0">
        <AnimatePresence mode="wait">
          {resultado ? (
            <Resultado key={resultado.id} r={resultado} />
          ) : (
            <p key="vacio" className="hidden rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground lg:block">
              El resultado aparece acá.
            </p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
