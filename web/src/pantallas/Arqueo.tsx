import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Info, Landmark, Store, TriangleAlert } from "lucide-react";
import { api } from "../api/cliente";
import { detalleError, faltaDia, type ArqueoOut, type ArqueoRequest, type CajaEstado } from "../api/tipos";
import { clavePendiente, pesos } from "../util";
import { Aviso, Boton, CampoMonto, EASE_SALIDA, OPCION, PUNTO_RADIO, Reintentar, Segmentado, TARJETA } from "../ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccionesDia, TarjetaAbrirDia, type AccionDia } from "./Dia";

// Los bloques del resultado entran en cascada corta: el arqueo se ve cuatro veces por día, no decenas.
const fila = (i: number, dy: number) => ({
  initial: { opacity: 0, transform: `translateY(${dy}px)` },
  animate: { opacity: 1, transform: "translateY(0px)" },
  transition: { duration: 0.22, delay: 0.12 + i * 0.04, ease: EASE_SALIDA },
});
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Hecho = { r: ArqueoOut; v: ArqueoRequest; donde: string };

// El resultado es el momento del arqueo. El tilde es un trazo que se dibuja; el alerta, un ícono quieto.
function Resultado({ r, v, donde }: Hecho) {
  const cierra = r.estado === "cuadra";
  const total = r.diferencia_efectivo + r.diferencia_boletas;
  const ref = useRef<HTMLDivElement>(null);
  const reducir = useReducedMotion();
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);
  // D2: dos diferencias y la suma a la vista. Cuadra solo si las dos dan cero, no si la suma da cero.
  const filas = [
    ["Efectivo", r.efectivo_esperado, v.efectivo_contado, r.diferencia_efectivo],
    ["Boletas", r.boletas_esperadas, v.boletas_contadas, r.diferencia_boletas],
  ] as const;
  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, transform: reducir ? "translateY(0px) scale(1)" : "translateY(8px) scale(0.98)" }}
      animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ type: "spring", duration: 0.4, bounce: 0 }}
      role="status"
      className={`${TARJETA} scroll-mb-24 overflow-hidden lg:scroll-mb-6`}
    >
      <div className="flex items-start gap-3 p-4 lg:p-5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${cierra ? "bg-exito/10 text-exito" : "bg-peligro/10 text-peligro"}`}>
          {cierra ? (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <m.path d="M5 12.5l4.5 4.5L19 7.5" initial={reducir ? { opacity: 0 } : { pathLength: 0 }} animate={reducir ? { opacity: 1 } : { pathLength: 1 }} transition={{ duration: 0.3, delay: 0.15, ease: EASE_SALIDA }} />
            </svg>
          ) : (
            <TriangleAlert className="size-[18px]" aria-hidden />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
          <div>
            <p className={`text-lg font-semibold tracking-tight ${cierra ? "text-exito" : "text-peligro"}`}>{cierra ? "Cuadra" : "No cuadra"}</p>
            <p className="text-sm text-muted-foreground">{cierra ? "Las dos diferencias dan cero." : "Quedó guardado con su diferencia."}</p>
          </div>
          <span className="text-xs text-muted-foreground lg:shrink-0 lg:text-right">{donde}</span>
        </div>
      </div>
      <m.div {...fila(0, reducir ? 0 : 4)} className="px-4 lg:px-5">
        <p className="rotulo text-muted-foreground">Diferencia total</p>
        <p className={`monto mt-1 text-[34px] font-semibold leading-none tracking-tight lg:text-[40px] ${total ? "text-peligro" : ""}`}>{pesos(total, true)}</p>
      </m.div>
      <m.div {...fila(1, reducir ? 0 : 4)} className="mt-4 border-t px-4 pb-2 lg:px-5">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-0"><span className="sr-only">Rubro</span></TableHead>
              <TableHead className="text-right text-muted-foreground">Esperado</TableHead>
              <TableHead className="hidden text-right text-muted-foreground lg:table-cell">Contado</TableHead>
              <TableHead className="pr-0 text-right text-muted-foreground">Diferencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map(([nombre, esperado, contado, dif]) => (
              <TableRow key={nombre} className="hover:bg-transparent">
                <TableCell className="h-11 px-0 font-medium">{nombre}</TableCell>
                <TableCell className="monto text-right">{pesos(esperado)}</TableCell>
                <TableCell className="monto hidden text-right lg:table-cell">{pesos(contado)}</TableCell>
                <TableCell className={`monto pr-0 text-right ${dif ? "font-semibold text-peligro" : "text-muted-foreground"}`}>{pesos(dif, true)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </m.div>
      {!cierra && (
        <div className="border-t p-4 lg:px-5">
          <a href={`#asistente?arqueo=${r.id}`} className="presiona flex min-h-11 w-full items-center rounded-md border px-3 text-sm hover:bg-muted lg:min-h-9">
            Preguntarle al asistente
          </a>
        </div>
      )}
    </m.div>
  );
}

export function Arqueo() {
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const [cajaElegida, setCajaId] = useState<number | null>(null);
  const [turnoElegido, setTurnoId] = useState<number | null>(null);
  const [efectivo, setEfectivo] = useState("");
  const [boletas, setBoletas] = useState("");
  const [resultado, setResultado] = useState<Hecho | null>(null);
  const [accion, setAccion] = useState<AccionDia | null>(null);
  // Desde un pendiente de Inicio: #arqueo?pendiente=caja_grande_mañana.
  const [enlace] = useState(() => new URLSearchParams(location.hash.split("?")[1]).get("pendiente"));

  const cajas = dia.data?.cajas ?? [];
  const turnos = dia.data?.turnos ?? [];
  const pendientes = dia.data?.arqueos_pendientes ?? [];
  // Solo vale mientras siga pendiente: si ya se arqueó, no se vuelve a marcar ese turno.
  const desdeInicio = enlace && pendientes.includes(enlace) ? enlace : null;
  const pendienteDe = (c: CajaEstado) => {
    for (const p of desdeInicio ? [desdeInicio, ...pendientes] : pendientes) {
      const t = turnos.find((t) => p === clavePendiente(c.nombre, t.nombre));
      if (t) return t;
    }
  };
  const cajaId = cajaElegida ?? (desdeInicio ? cajas.find((c) => turnos.some((t) => clavePendiente(c.nombre, t.nombre) === desdeInicio))?.id : undefined) ?? null;
  const caja = cajas.find((c) => c.id === cajaId);
  const pendiente = caja && pendienteDe(caja);
  // La caja grande acepta cualquier turno, abierto o cerrado (D5); la chica solo el abierto, porque lo cierra.
  const esChica = caja?.tipo === "operativa";
  const abiertos = turnos.filter((t) => t.estado === "abierto");
  // El turno sale del arqueo pendiente de la caja (nunca uno por defecto); la chica sin pendiente, del único turno abierto.
  const turnoId = turnoElegido ?? pendiente?.id ?? (esChica && abiertos.length === 1 ? abiertos[0].id : null);
  const turno = turnos.find((t) => t.id === turnoId);

  const guardar = useMutation({
    mutationFn: (v: ArqueoRequest) => api.arqueo(v),
    onSuccess: (r, v) => {
      const donde = `${cajas.find((c) => c.id === v.caja_id)?.nombre} · ${turnos.find((t) => t.id === v.turno_id)?.nombre}`;
      // Se fija lo arqueado: la invalidación global recalcularía el turno debajo del resultado.
      setCajaId(v.caja_id); setTurnoId(v.turno_id);
      setResultado({ r, v, donde });
    },
  });

  // Todo cambio invalida el resultado a la vista: nunca queda un resultado viejo con datos nuevos.
  const cambiar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setResultado(null);
    guardar.reset();
  };

  if (faltaDia(dia)) {
    return <TarjetaAbrirDia cerrado={dia.data?.dia.estado === "cerrado" ? dia.data.dia : undefined} />;
  }

  const sinTicket = esChica && !!turno && !turno.tiene_ticket;
  const faltan = [!cajaId && "la caja", !turnoId && "el turno", !efectivo && "el efectivo contado", !boletas && "las boletas contadas (poné 0 si no hay)"].filter(Boolean);
  const motivo = sinTicket
    ? `Falta cargar el ticket del turno ${turno.nombre}.`
    : faltan.length ? `Para arquear, completá ${faltan.join(", ").replace(/, ([^,]*)$/, " y $1")}.`
    : resultado ? "Ya quedó guardado. Cambiá un dato para arquear de nuevo." : "";

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!motivo && cajaId && turnoId) guardar.mutate({ caja_id: cajaId, turno_id: turnoId, efectivo_contado: Number(efectivo), boletas_contadas: Number(boletas) });
        }}
        className="flex flex-col gap-6 lg:max-w-2xl lg:rounded-xl lg:border lg:bg-card lg:p-6 lg:shadow-xs"
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Caja</legend>
          {dia.isLoading && <div className="esqueleto h-[76px]" />}
          {dia.isError && <Aviso tono="error" accion={<Reintentar onClick={() => dia.refetch()} />}>No se pudo traer el día. Revisá la conexión.</Aviso>}
          <div className="grid grid-cols-2 gap-3">
            {cajas.map((c) => {
              const Icono = c.tipo === "operativa" ? Store : Landmark;
              const pend = pendienteDe(c);
              return (
                <label key={c.id} className={`${OPCION} min-h-[76px] items-start p-4`}>
                  <input type="radio" name="caja" className="sr-only" checked={c.id === cajaId} onChange={() => { cambiar(setCajaId)(c.id); setTurnoId(null); }} />
                  <span className="flex-1">
                    <Icono className="size-5 text-muted-foreground transition-colors group-has-[:checked]:text-foreground" aria-hidden />
                    <span className="mt-2 block text-sm font-medium">{c.nombre}</span>
                    {pend && <span className="block text-xs text-muted-foreground">Pendiente: {pend.nombre}</span>}
                  </span>
                  {PUNTO_RADIO}
                </label>
              );
            })}
          </div>
        </fieldset>

        {turnos.length > 0 && (
          <div>
            <p aria-hidden className="mb-2 text-sm font-medium">Turno</p>
            <Segmentado
              etiqueta="Turno"
              valor={turnoId}
              onCambio={cambiar(setTurnoId)}
              opciones={turnos.map((t) => ({ valor: t.id, texto: mayuscula(t.nombre), detalle: mayuscula(t.estado), deshabilitada: esChica && t.estado !== "abierto" }))}
            />
          </div>
        )}

        {!resultado && turnoElegido !== null && pendiente && turno && turnoElegido !== pendiente.id && (
          <Aviso tono="aviso">Lo pendiente en {caja?.nombre.toLowerCase()} es el turno {pendiente.nombre}; estás arqueando el turno {turno.nombre}.</Aviso>
        )}

        {sinTicket && (
          <Aviso tono="aviso">
            El turno {turno.nombre} todavía no tiene el ticket cargado: sin ticket, la caja chica no se puede arquear.
            <button type="button" onClick={() => setAccion({ tipo: "ticket", turno })}
              className="presiona mt-1 block h-11 rounded-md font-medium underline underline-offset-4 lg:h-8">
              Cargar ticket
            </button>
          </Aviso>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoMonto etiqueta="Efectivo contado" valor={efectivo} onValor={cambiar(setEfectivo)} enterKeyHint="next" />
          <CampoMonto etiqueta="Boletas contadas" valor={boletas} onValor={cambiar(setBoletas)} enterKeyHint="done" />
        </div>

        {guardar.isError && <Aviso tono="error">{detalleError(guardar.error, "No se pudo arquear.")}</Aviso>}

        <div>
          <Boton type="submit" size="lg" cargando={guardar.isPending} disabled={!!motivo} className="w-full">
            {guardar.isPending ? "Arqueando…" : "Arquear"}
          </Boton>
          <p aria-live="polite" className="mt-3 flex min-h-5 items-start justify-center gap-1.5 text-center text-sm text-muted-foreground empty:mt-0 empty:min-h-0">
            {motivo && (
              <>
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                {motivo}
              </>
            )}
          </p>
        </div>
      </form>

      <div className="mt-6 lg:mt-0">
        <AnimatePresence mode="wait">
          {resultado ? (
            <Resultado key={resultado.r.id} {...resultado} />
          ) : (
            <p key="vacio" className="hidden text-sm text-muted-foreground lg:block">
              El arqueo se compara con lo esperado. Si no cuadra, se guarda igual, con su diferencia.
            </p>
          )}
        </AnimatePresence>
      </div>
      <AccionesDia accion={accion} onCerrar={() => setAccion(null)} />
    </div>
  );
}
