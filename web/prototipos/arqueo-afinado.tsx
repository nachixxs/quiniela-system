// AFINADO · eje: mínimo cambio.
// Leído como: la pantalla de hoy con la auditoría resuelta, en el idioma shadcn "neutral": todo en tarjetas con encabezado.
// Diales: VARIANCE 2 · MOTION 3 · DENSITY 7. Trazo de lucide por defecto (2).
// Lo único que se recuerda: nada nuevo; la columna derecha ya no es un recuadro punteado: muestra el resultado y lo que falta arquear.
import { AnimatePresence, m } from "motion/react";
import { ChevronRight, Landmark } from "lucide-react";
import { TARJETA } from "../src/ui";
import { pesos } from "../src/util";
import { CAJAS, PENDIENTES, TURNOS } from "./datos";
import { AvisoTicket, OpcionesCaja, Pie, Turno } from "./arqueo-comun";
import { Asistente, CampoMonto, Dif, H1, Sello, Shell, entra, fila, useArqueo, verse, type Resultado } from "./comun";

const Encabezado = ({ id, titulo, texto }: { id: string; titulo: string; texto: string }) => (
  <div className="px-4 pb-2 pt-4 lg:px-5 lg:pt-5"><h2 id={id} className="font-medium">{titulo}</h2><p className="text-sm text-muted-foreground">{texto}</p></div>
);
const Dato = ({ i, nombre, valor, dif }: { i: number; nombre: string; valor: number; dif?: boolean }) => (
  <m.div {...fila(i)} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
    <span className="text-muted-foreground">{nombre}</span>
    {dif ? <Dif v={valor} /> : <span className="monto">{pesos(valor)}</span>}
  </m.div>
);

function Tarjeta({ r, total }: { r: Resultado; total: number }) {
  return (
    <m.section ref={verse} {...entra} role="status" aria-label="Resultado" className={`${TARJETA} scroll-mb-24 overflow-hidden lg:scroll-mb-6`}>
      <div className="flex items-start gap-3 border-b p-4 lg:p-5">
        <Sello cuadra={r.cuadra} />
        <div>
          <p className={`text-lg font-semibold tracking-tight ${r.cuadra ? "text-exito" : "text-peligro"}`}>{r.cuadra ? "Cuadra" : "No cuadra"}</p>
          <p className="text-sm text-muted-foreground">{r.cuadra ? "Las dos diferencias dan cero." : "Quedó guardado con su diferencia."}</p>
        </div>
      </div>
      <div className="px-4 py-3 lg:px-5">
        <m.p {...fila(0)} className="rotulo pb-1 text-muted-foreground">Efectivo</m.p>
        <Dato i={1} nombre="Esperado" valor={r.efectivo_esperado} />
        <Dato i={2} nombre="Diferencia" valor={r.diferencia_efectivo} dif />
        <m.p {...fila(3)} className="rotulo pb-1 pt-3 text-muted-foreground">Boletas</m.p>
        <Dato i={4} nombre="Esperadas" valor={r.boletas_esperadas} />
        <Dato i={5} nombre="Diferencia" valor={r.diferencia_boletas} dif />
      </div>
      <m.div {...fila(6)} className="flex items-baseline justify-between gap-3 border-t bg-muted/40 px-4 py-3 font-semibold lg:px-5">
        <span>Diferencia total</span>
        <Dif v={total} className="font-semibold" />
      </m.div>
      {!r.cuadra && <div className="border-t p-4 lg:px-5"><Asistente className="w-full" /></div>}
    </m.section>
  );
}

export function ArqueoAfinado() {
  const a = useArqueo();
  return (
    <Shell activa="arqueo" trazo={2}>
      <h1 className={H1}>Arqueo</h1>
      <p className="mt-1 text-sm text-muted-foreground">Contá el efectivo y las boletas de la caja. El sistema compara con lo esperado.</p>
      <div className="mt-6 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <form onSubmit={(e) => { e.preventDefault(); a.arquear(); }} className={`${TARJETA} overflow-hidden`} aria-labelledby="datos">
          <Encabezado id="datos" titulo="Datos del arqueo" texto="Elegí la caja y el turno, y cargá lo contado." />
          <div className="flex flex-col gap-6 p-4 pt-3 lg:p-5 lg:pt-3">
            <OpcionesCaja a={a} />
            <Turno a={a} />
            <AvisoTicket a={a} />
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoMonto etiqueta="Efectivo contado" valor={a.efectivo} onValor={a.setEfectivo} />
              <CampoMonto etiqueta="Boletas contadas" ayuda="Poné 0 si no hay." valor={a.boletas} onValor={a.setBoletas} />
            </div>
            <Pie a={a} />
          </div>
        </form>

        <div className="flex flex-col gap-4">
          <AnimatePresence mode="wait">{a.resultado && <Tarjeta key="r" r={a.resultado} total={a.total} />}</AnimatePresence>
          <section className={`${TARJETA} overflow-hidden`} aria-labelledby="falta">
            <Encabezado id="falta" titulo="Falta arquear" texto="Los arqueos pendientes de hoy" />
            {PENDIENTES.length === 0 && <p className="px-4 pb-5 text-sm text-muted-foreground lg:px-5">No queda ninguno.</p>}
            <ul className="divide-y border-t">
              {PENDIENTES.map((p) => {
                const elegido = a.cajaId === p.caja_id && a.turnoId === p.turno_id;
                return (
                  <li key={`${p.caja_id}-${p.turno_id}`}>
                    <button type="button" onClick={() => a.elegir(p.caja_id, p.turno_id)} aria-pressed={elegido}
                      className={`presiona flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 lg:px-5 ${elegido ? "bg-muted" : ""}`}>
                      <Landmark className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{CAJAS.find((c) => c.id === p.caja_id)!.nombre}, turno {TURNOS.find((t) => t.id === p.turno_id)!.nombre}</span>
                        <span className="block text-xs text-muted-foreground">Pendiente desde que cerró el turno</span>
                      </span>
                      <ChevronRight className="-mr-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </Shell>
  );
}
