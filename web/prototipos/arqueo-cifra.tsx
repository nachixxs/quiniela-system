// CIFRA · eje: jerarquía.
// Leído como: el momento del día en que la cajera quiere una sola respuesta. Diales: VARIANCE 3 · MOTION 3 · DENSITY 6. Trazo de lucide 1,75.
// Lo único que se recuerda: arriba de todo, una franja que pide lo que falta y, al arquear, se vuelve la diferencia total en una cifra mono de 32-36 px.
// Tarjeta solo en el formulario (lo accionable).
import { AnimatePresence, m } from "motion/react";
import { TARJETA } from "../src/ui";
import { pesos } from "../src/util";
import { AvisoTicket, OpcionesCaja, Pie, Turno } from "./arqueo-comun";
import { Asistente, CampoMonto, Dif, H1, Sello, Shell, entra, fila, useArqueo, verse, type Resultado } from "./comun";

function Respuesta({ r, total }: { r: Resultado; total: number }) {
  return (
    <m.section ref={verse} {...entra} role="status" className="scroll-mt-16 border-b pb-6">
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-12">
        <div>
          <div className="flex items-center gap-3">
            <Sello cuadra={r.cuadra} />
            <p className={`text-lg font-semibold tracking-tight ${r.cuadra ? "text-exito" : "text-peligro"}`}>{r.cuadra ? "Cuadra" : "No cuadra"}</p>
          </div>
          <p className="rotulo mt-5 text-muted-foreground">Diferencia total</p>
          <m.p {...fila(0)} className={`monto mt-2 text-[32px] font-semibold leading-none lg:text-4xl ${total ? "text-peligro" : ""}`}>{pesos(total, true)}</m.p>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-6 lg:mt-0 lg:w-[26rem]">
          {([["Efectivo", r.diferencia_efectivo, r.efectivo_esperado], ["Boletas", r.diferencia_boletas, r.boletas_esperadas]] as const).map(([nombre, dif, esperado], i) => (
            <m.div key={nombre} {...fila(i + 1)}>
              <dt className="rotulo text-muted-foreground">{nombre}</dt>
              <dd className="mt-1.5"><Dif v={dif} className="text-xl font-semibold" /></dd>
              <dd className="mt-1 text-xs text-muted-foreground">Esperado <span className="monto">{pesos(esperado)}</span></dd>
            </m.div>
          ))}
        </dl>
      </div>
      {!r.cuadra && <Asistente className="mt-5" />}
    </m.section>
  );
}

export function ArqueoCifra() {
  const a = useArqueo();
  const titulo = a.caja && a.turno ? `${a.caja.nombre}, turno ${a.turno.nombre}` : a.caja ? `${a.caja.nombre}: elegí el turno` : "Elegí la caja";
  return (
    <Shell activa="arqueo" trazo={1.75}>
      <h1 className={H1}>Arqueo</h1>
      <p className="mt-1 text-sm text-muted-foreground">Contá el efectivo y las boletas de la caja. El sistema compara con lo esperado.</p>
      <div className="mt-5 lg:mt-6">
        <AnimatePresence mode="wait">
          {a.resultado ? <Respuesta key="r" r={a.resultado} total={a.total} /> : (
            <section key="p" className="border-b pb-6" aria-live="polite">
              <p className="text-[22px] font-semibold tracking-tight lg:text-2xl">{titulo}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.sinTicket ? `Falta el ticket del turno ${a.turno?.nombre}.` : "Contá el efectivo y las boletas, y tocá Arquear."}</p>
            </section>
          )}
        </AnimatePresence>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); a.arquear(); }} className={`${TARJETA} mt-6 flex flex-col gap-6 p-4 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:p-6`}>
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
    </Shell>
  );
}
