import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { Info, Landmark, Sparkles, Store, TriangleAlert } from "lucide-react";
import { api, ApiError } from "../api/cliente";
import type { ArqueoOut } from "../api/tipos";
import { pesos } from "../util";
import { Aviso, Boton, CampoMonto, EASE_SALIDA, Segmentado } from "../ui";

// Una fila del resultado. Una diferencia distinta de cero va en color de aviso: es lo que hay que mirar.
const Dato = ({ nombre, valor, diferencia, total }: { nombre: string; valor: number; diferencia?: boolean; total?: boolean }) => (
  <div className={`flex items-baseline justify-between gap-3 py-2.5 ${total ? "font-semibold" : "text-sm"}`}>
    <span className={total ? "" : "text-tinta-suave"}>{nombre}</span>
    <span className={`font-semibold ${diferencia && valor !== 0 ? "text-aviso" : ""}`}>{pesos(valor)}</span>
  </div>
);

// El resultado es el momento del arqueo: se ve una vez por conteo, cuatro veces por día.
// El tilde es el Check de lucide, dibujado de izquierda a derecha.
function Resultado({ r }: { r: ArqueoOut }) {
  const cierra = r.estado === "cuadra";
  return (
    <m.div
      ref={(el) => el?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      initial={{ opacity: 0, transform: "scale(0.97)" }}
      animate={{ opacity: 1, transform: "scale(1)" }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ type: "spring", duration: 0.35, bounce: 0 }}
      role="status"
      className="scroll-mb-24 overflow-hidden rounded-2xl bg-superficie shadow-tarjeta lg:scroll-mb-6"
    >
      <div className={`flex items-center gap-3 px-5 py-4 ${cierra ? "bg-exito-suave text-exito" : "bg-aviso-suave text-aviso"}`}>
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${cierra ? "bg-exito" : "bg-aviso"} text-superficie`}>
          {cierra ? (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <m.path d="M4 12l5 5L20 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.1, ease: EASE_SALIDA }} />
            </svg>
          ) : (
            <TriangleAlert className="size-5" aria-hidden />
          )}
        </span>
        <p className="text-xl font-semibold tracking-tight">{cierra ? "Cierra" : "No cuadra"}</p>
      </div>
      {/* D2: dos diferencias, y la suma a la vista. Cuadra solo si las dos dan cero, no si la suma da cero. */}
      <div className="divide-y divide-borde px-5 py-1">
        <Dato nombre="Efectivo esperado" valor={r.efectivo_esperado} />
        <Dato nombre="Diferencia de efectivo" valor={r.diferencia_efectivo} diferencia />
        <Dato nombre="Boletas esperadas" valor={r.boletas_esperadas} />
        <Dato nombre="Diferencia de boletas" valor={r.diferencia_boletas} diferencia />
        <Dato nombre="Diferencia total" valor={r.diferencia_efectivo + r.diferencia_boletas} diferencia total />
      </div>
      {!cierra && (
        <button type="button" disabled className="mx-5 mb-5 flex min-h-11 w-[calc(100%-2.5rem)] items-center gap-2 rounded-xl bg-superficie-2 px-4 py-2 text-left text-sm font-medium text-tinta-suave">
          <Sparkles className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">Preguntarle al asistente</span>
          <span className="text-xs">(Próximamente)</span>
        </button>
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
    <div className="px-4 pt-5 lg:grid lg:grid-cols-[1fr_minmax(0,24rem)] lg:gap-8 lg:px-0 lg:pt-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!faltan.length && !sinTicket) guardar.mutate();
        }}
        className="flex flex-col gap-6"
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-tinta-suave">Caja</legend>
          {dia.isLoading && <div className="esqueleto h-24" />}
          {dia.isError && <Aviso tono="error">No se pudo traer el día. Revisá la conexión.</Aviso>}
          <div className="grid grid-cols-2 gap-3">
            {cajas.map((c) => {
              const Icono = c.tipo === "operativa" ? Store : Landmark;
              const elegida = c.id === cajaId;
              return (
                <label
                  key={c.id}
                  className={`presiona flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acento-texto ${elegida ? "border-acento bg-acento/8" : "border-transparent bg-superficie shadow-tarjeta"}`}
                >
                  <input type="radio" name="caja" className="sr-only" checked={elegida} onChange={() => cambiar(setCajaId)(c.id)} />
                  <Icono className={`size-6 ${elegida ? "text-acento-texto" : "text-tinta-suave"}`} aria-hidden />
                  <span className="font-semibold">{c.nombre}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {turnos.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-tinta-suave">Turno</p>
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
          <Boton type="submit" cargando={guardar.isPending} disabled={faltan.length > 0 || sinTicket || !!resultado} className="h-14 w-full text-base">
            {guardar.isPending ? "Arqueando…" : "Arquear"}
          </Boton>
          <p aria-live="polite" className="mt-3 flex min-h-5 items-start justify-center gap-1.5 text-center text-sm text-tinta-suave">
            {faltan.length > 0 && (
              <>
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                Para arquear, completá {faltan.join(", ").replace(/, ([^,]*)$/, " y $1")}.
              </>
            )}
          </p>
        </div>
      </form>

      <div className="mt-6 lg:mt-7">
        <AnimatePresence mode="wait">{resultado && <Resultado key={resultado.id} r={resultado} />}</AnimatePresence>
      </div>
    </div>
  );
}
