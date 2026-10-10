// CIFRA · eje: jerarquía.
// Leído como: herramienta de caja que se mira de reojo entre cliente y cliente; primero qué hacer, después cuánta plata hay.
// Diales: VARIANCE 3 · MOTION 2 · DENSITY 6. Trazo de lucide 1,75.
// Lo único que se recuerda: el efectivo de la caja grande en una cifra mono de 32-36 px, con "qué hay que hacer ahora" justo debajo.
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Boton, INSIGNIA, TARJETA, TIPOS, TONOS } from "../src/ui";
import { fechaLarga, pesos } from "../src/util";
import { CAJAS, DEUDORES, FECHA, MOVIMIENTOS, USUARIO } from "./datos";
import { CARGAR, H1, Shell, diasDesde, firmado, hacer, hayTurnoAbierto } from "./comun";

const Dato = ({ rotulo, children }: { rotulo: string; children: ReactNode }) => (
  <div><p className="rotulo text-muted-foreground">{rotulo}</p><p className="mt-1">{children}</p></div>
);
const Renglon = ({ titulo, detalle, children }: { titulo: string; detalle?: string; children: ReactNode }) => (
  <li className="flex min-h-12 items-center gap-3 py-2">
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium">{titulo}</span>
      {detalle && <span className="block text-xs text-muted-foreground">{detalle}</span>}
    </span>
    {children}
  </li>
);

export function InicioCifra() {
  const [primera, ...resto] = hacer();
  const grande = CAJAS.find((c) => c.tipo === "central")!;
  const chica = CAJAS.find((c) => c.tipo === "operativa")!;
  const sinTicket = hayTurnoAbierto;
  return (
    <Shell activa="inicio" trazo={1.75}>
      <header>
        <h1 className={H1}>Hola, {USUARIO}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground lg:hidden">
          <span className="first-letter:uppercase">{fechaLarga(FECHA)}</span>
          <span className={`${INSIGNIA} ${TONOS.exito}`}>Día abierto</span>
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-6 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-x-12">
        {/* Arriba de todo, lo que hay en cada caja; debajo, qué hay que hacer ahora. */}
        <div className="contents lg:block lg:space-y-8">
          <section className="order-1" aria-label={grande.nombre}>
            <p className="rotulo text-muted-foreground">Efectivo en la caja grande</p>
            <p className="monto mt-2 text-[32px] font-semibold leading-none lg:text-4xl">{pesos(grande.efectivo)}</p>
            <p className="mt-3 text-sm text-muted-foreground">Boletas <span className="monto font-medium text-foreground">{pesos(grande.boletas)}</span></p>
          </section>

          <section className="order-2 border-t pt-3" aria-label={chica.nombre}>
            <div className="flex min-h-6 items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{chica.nombre}</h3>
              {sinTicket && <span className={`${INSIGNIA} ${TONOS.aviso}`}>Sin ticket</span>}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <Dato rotulo="Efectivo">{sinTicket ? <span className="text-sm leading-7 text-muted-foreground">Al cargar el ticket</span> : <span className="monto text-xl font-semibold">{pesos(chica.efectivo)}</span>}</Dato>
              <Dato rotulo="Boletas"><span className="monto text-xl font-semibold">{pesos(chica.boletas)}</span></Dato>
            </div>
          </section>

          <section className="order-7">
            <h2 className="text-sm font-semibold">Movimientos de hoy</h2>
            <ul className="mt-1 divide-y border-y">
              {MOVIMIENTOS.map((mov) => {
                const t = TIPOS[mov.tipo];
                return (
                  <Renglon key={mov.id} titulo={t.etiqueta} detalle={`${mov.hora}, ${mov.quien}`}>
                    <t.icono className={`size-4 shrink-0 ${t.tono}`} aria-hidden />
                    <span className="monto w-24 shrink-0 text-right text-sm font-medium">{firmado(mov)}</span>
                  </Renglon>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="contents lg:block lg:space-y-8">
          {/* Lo accionable es lo único en tarjeta: una primaria por vista y el resto de lo pendiente debajo. */}
          <section className={`${TARJETA} order-3 overflow-hidden`} aria-labelledby="ahora">
            <div className="p-4 lg:p-5">
              <h2 id="ahora" className="text-sm font-medium text-muted-foreground">Qué hay que hacer ahora</h2>
              {primera && (
                <>
                  <p className="mt-2 flex items-center gap-2.5 text-base font-semibold tracking-tight lg:text-lg"><primera.icono className="size-5 shrink-0 text-aviso" aria-hidden />{primera.titulo}</p>
                  <Boton type="button" className="mt-3 h-12 w-full lg:h-10 lg:w-auto">{primera.boton}</Boton>
                </>
              )}
            </div>
            <ul className="divide-y border-t px-4 lg:px-5">
              {resto.map((h) => (
                <li key={h.clave}>
                  <a href={h.href ?? "#"} className="presiona flex min-h-12 items-center gap-3 py-2 hover:bg-muted/40">
                    <h.icono className="size-4 shrink-0 text-aviso" aria-hidden />
                    <span className="min-w-0 flex-1 text-sm font-medium">{h.titulo}</span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <div role="group" aria-label="Cargar" className="order-4 grid grid-cols-4 gap-2">
            {CARGAR.map((b) => (
              <button key={b.etiqueta} type="button" className="presiona flex h-16 flex-col items-center justify-center gap-1.5 rounded-lg border bg-card text-xs font-medium shadow-xs hover:bg-muted lg:h-14">
                <b.icono className={`size-5 ${b.tono}`} aria-hidden />{b.etiqueta}
              </button>
            ))}
          </div>

          <section className="order-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold">Fiados</h2>
              <a href="#" className="text-sm underline-offset-4 hover:underline">Ver todos</a>
            </div>
            <ul className="mt-1 divide-y border-y">
              {DEUDORES.slice(0, 3).map((d) => (
                <Renglon key={d.id} titulo={d.nombre} detalle={diasDesde(d.dias)}>
                  <span className="monto shrink-0 text-sm font-medium">{pesos(d.saldo)}</span>
                </Renglon>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Shell>
  );
}
