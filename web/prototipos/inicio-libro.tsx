// LIBRO · eje: densidad.
// Leído como: herramienta de caja para la cajera, de pie detrás del mostrador, con el lenguaje de un libro contable
// (renglones, cifras a la derecha). Diales: VARIANCE 2 · MOTION 2 · DENSITY 8. Trazo de lucide 1,75.
// Lo único que se recuerda: las cifras mono alineadas a la derecha, renglón a renglón; tarjeta solo en las cajas.
import type { ReactNode } from "react";
import { CalendarCheck, ChevronRight, Landmark, Store } from "lucide-react";
import { INSIGNIA, TARJETA, TIPOS, TONOS } from "../src/ui";
import { fechaLarga, pesos } from "../src/util";
import { CAJAS, DEUDORES, FECHA, MOVIMIENTOS, USUARIO } from "./datos";
import { CARGAR, H1, Shell, diasDesde, firmado, hacer, hayTurnoAbierto, motivoCierre } from "./comun";

const LISTA = "mt-1 divide-y border-y";
const RENGLON = "flex min-h-12 items-center gap-3 py-2";
const PRESIONA = "presiona w-full text-left hover:bg-muted/40";
const Titulo = ({ children, extra }: { children: ReactNode; extra?: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3"><h2 className="text-sm font-semibold">{children}</h2>{extra}</div>
);
const Dos = ({ titulo, detalle }: { titulo: string; detalle?: string }) => (
  <span className="min-w-0 flex-1">
    <span className="block text-sm font-medium">{titulo}</span>
    {detalle && <span className="block text-xs text-muted-foreground">{detalle}</span>}
  </span>
);
const Linea = ({ nombre, children }: { nombre: string; children: ReactNode }) => (
  <div className="flex min-h-10 items-center justify-between gap-3"><dt className="text-sm text-muted-foreground">{nombre}</dt><dd>{children}</dd></div>
);
const Cifra = ({ v }: { v: number }) => <span className="monto text-lg font-medium">{pesos(v)}</span>;

// D27: la caja chica sin ticket no muestra efectivo (sería parcial); solo las boletas.
function Caja({ c }: { c: (typeof CAJAS)[number] }) {
  const sinTicket = c.tipo === "operativa" && hayTurnoAbierto;
  const Icono = c.tipo === "operativa" ? Store : Landmark;
  return (
    <section className={`${TARJETA} px-4 py-3`}>
      <div className="flex min-h-6 items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Icono className="size-4 text-muted-foreground" aria-hidden />{c.nombre}</h3>
        {sinTicket && <span className={`${INSIGNIA} ${TONOS.aviso}`}>Sin ticket</span>}
      </div>
      <dl className="mt-1 divide-y">
        <Linea nombre="Efectivo">{sinTicket ? <span className="text-sm text-muted-foreground">Al cargar el ticket</span> : <Cifra v={c.efectivo} />}</Linea>
        <Linea nombre="Boletas"><Cifra v={c.boletas} /></Linea>
      </dl>
    </section>
  );
}

export function InicioLibro() {
  return (
    <Shell activa="inicio" trazo={1.75}>
      <header>
        <h1 className={H1}>Hola, {USUARIO}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground lg:hidden">
          <span className="first-letter:uppercase">{fechaLarga(FECHA)}</span>
          <span className={`${INSIGNIA} ${TONOS.exito}`}>Día abierto</span>
        </p>
      </header>

      {/* Arriba de todo, lo que hay en cada caja; debajo, lo que falta hoy. */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2 lg:gap-4">{CAJAS.slice().reverse().map((c) => <Caja key={c.id} c={c} />)}</div>

      {/* En el celular las secciones van en el orden de order-*; desde lg, dos columnas (los envoltorios dejan de ser "contents"). */}
      <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:items-start lg:gap-x-12">
        <div className="contents lg:block lg:space-y-6">
          <section className="order-1" aria-labelledby="hacer">
            <Titulo><span id="hacer">Falta hoy</span></Titulo>
            <ul className={LISTA}>
              {hacer().map((h) => (
                <li key={h.clave}>
                  <a href={h.href ?? "#"} className={`${RENGLON} ${PRESIONA}`}>
                    <h.icono className="size-4 shrink-0 text-aviso" aria-hidden />
                    <Dos titulo={h.titulo} detalle={h.detalle} />
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="order-5">
            <Titulo>Movimientos de hoy</Titulo>
            <ul className={LISTA}>
              {MOVIMIENTOS.map((mov) => {
                const t = TIPOS[mov.tipo];
                return (
                  <li key={mov.id} className={RENGLON}>
                    <span className="monto w-11 shrink-0 text-xs text-muted-foreground">{mov.hora}</span>
                    <t.icono className={`size-4 shrink-0 ${t.tono}`} aria-hidden />
                    <Dos titulo={t.etiqueta} detalle={mov.quien} />
                    <span className="monto shrink-0 text-sm font-medium">{firmado(mov)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="contents lg:block lg:space-y-6">
          <div role="group" aria-label="Cargar" className="order-2 grid grid-cols-4 divide-x overflow-hidden rounded-lg border bg-card shadow-xs">
            {CARGAR.map((b) => (
              <button key={b.etiqueta} type="button" className="presiona flex h-14 flex-col items-center justify-center gap-1 text-xs font-medium hover:bg-muted/60 lg:h-11 lg:flex-row lg:gap-2 lg:text-sm">
                <b.icono className={`size-4 ${b.tono}`} aria-hidden />{b.etiqueta}
              </button>
            ))}
          </div>

          <section className="order-3" aria-label="Fin del día">
            <ul className={LISTA}>
              <li>
                <button type="button" className={`${RENGLON} ${PRESIONA}`}>
                  <Landmark className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <Dos titulo="Traspaso a la caja grande" />
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </button>
              </li>
              <li>
                <button type="button" disabled className={`${RENGLON} w-full text-left text-muted-foreground`}>
                  <CalendarCheck className="size-4 shrink-0" aria-hidden />
                  <Dos titulo="Cerrar el día" detalle={motivoCierre()} />
                </button>
              </li>
            </ul>
          </section>

          <section className="order-4">
            <Titulo extra={<a href="#" className="text-sm underline-offset-4 hover:underline">Ver todos</a>}>Fiados</Titulo>
            <ul className={LISTA}>
              {DEUDORES.slice(0, 3).map((d) => (
                <li key={d.id} className={RENGLON}>
                  <Dos titulo={d.nombre} detalle={diasDesde(d.dias)} />
                  <span className="monto shrink-0 text-base font-medium">{pesos(d.saldo)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Shell>
  );
}
