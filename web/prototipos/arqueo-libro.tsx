// LIBRO · eje: densidad.
// Leído como: herramienta de caja de pie detrás del mostrador, con el lenguaje de un libro contable. Diales: VARIANCE 2 · MOTION 3 · DENSITY 8.
// Trazo de lucide 1,75. Lo único que se recuerda: el resultado es un renglón de libro (concepto, esperado, diferencia) y no una tarjeta;
// el formulario es una franja plana de ancho completo, sin columna vacía.
import { AnimatePresence, m } from "motion/react";
import { pesos } from "../src/util";
import { AvisoTicket, OpcionesCaja, Pie, Turno } from "./arqueo-comun";
import { Asistente, CampoMonto, Dif, H1, Sello, Shell, entra, fila, useArqueo, verse, type Resultado } from "./comun";

const COLS = "grid grid-cols-[minmax(0,1fr)_7rem_6rem] items-baseline gap-x-2 py-2.5";

// Una fila del libro: concepto a la izquierda, esperado y diferencia en mono alineados a la derecha.
const Renglon = ({ i, nombre, esperado, dif }: { i: number; nombre: string; esperado: number; dif: number }) => (
  <m.div {...fila(i)} className={COLS}>
    <span className="text-sm">{nombre}</span>
    <span className="monto text-right text-sm text-muted-foreground">{pesos(esperado)}</span>
    <Dif v={dif} className="text-right text-base" />
  </m.div>
);

function Libro({ r, total }: { r: Resultado; total: number }) {
  return (
    <m.section ref={verse} {...entra} role="status" className="mt-8 scroll-mb-24 lg:max-w-xl">
      <div className="flex items-center gap-3 border-b pb-3">
        <Sello cuadra={r.cuadra} />
        <div>
          <p className={`text-lg font-semibold leading-tight tracking-tight ${r.cuadra ? "text-exito" : "text-peligro"}`}>{r.cuadra ? "Cuadra" : "No cuadra"}</p>
          <p className="text-sm text-muted-foreground">{r.cuadra ? "Las dos diferencias dan cero." : "Quedó guardado con su diferencia."}</p>
        </div>
      </div>
      <div className="divide-y">
        <m.div {...fila(0)} className={`${COLS} pb-1 pt-3`}>
          <span />
          <span className="rotulo text-right text-muted-foreground">Esperado</span>
          <span className="rotulo text-right text-muted-foreground">Diferencia</span>
        </m.div>
        <Renglon i={1} nombre="Efectivo" esperado={r.efectivo_esperado} dif={r.diferencia_efectivo} />
        <Renglon i={2} nombre="Boletas" esperado={r.boletas_esperadas} dif={r.diferencia_boletas} />
        <m.div {...fila(3)} className={`${COLS} border-b font-semibold`}>
          <span className="col-span-2 text-sm">Diferencia total</span>
          <Dif v={total} className="text-right text-base font-semibold" />
        </m.div>
      </div>
      {!r.cuadra && <Asistente className="mt-4" />}
    </m.section>
  );
}

export function ArqueoLibro() {
  const a = useArqueo();
  return (
    <Shell activa="arqueo" trazo={1.75}>
      <h1 className={H1}>Arqueo</h1>
      <p className="mt-1 text-sm text-muted-foreground">Contá el efectivo y las boletas de la caja. El sistema compara con lo esperado.</p>
      {/* Franja plana: en escritorio, caja y turno a la izquierda y los conteos con el botón a la derecha. */}
      <form onSubmit={(e) => { e.preventDefault(); a.arquear(); }} className="mt-5 flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-x-12">
        <div className="flex flex-col gap-5">
          <OpcionesCaja a={a} />
          <Turno a={a} />
          <AvisoTicket a={a} />
        </div>
        <div className="flex flex-col gap-5">
          <CampoMonto etiqueta="Efectivo contado" valor={a.efectivo} onValor={a.setEfectivo} />
          <CampoMonto etiqueta="Boletas contadas" ayuda="Poné 0 si no hay." valor={a.boletas} onValor={a.setBoletas} />
          <Pie a={a} />
        </div>
      </form>
      <AnimatePresence mode="wait">{a.resultado && <Libro key="r" r={a.resultado} total={a.total} />}</AnimatePresence>
    </Shell>
  );
}
