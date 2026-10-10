// AFINADO · eje: mínimo cambio.
// Leído como: la pantalla de hoy con la auditoría resuelta; mismo idioma shadcn "neutral", todo en tarjetas con encabezado.
// Diales: VARIANCE 2 · MOTION 2 · DENSITY 7. Trazo de lucide por defecto (2).
// Lo único que se recuerda: nada nuevo; lo pendiente va primero, sin indicadores que repiten y sin huecos en 1280.
import type { ReactNode } from "react";
import { ChevronRight, Landmark, Store, Sunrise } from "lucide-react";
import { Boton, INSIGNIA, TARJETA, TIPOS, TONOS } from "../src/ui";
import { fechaLarga, pesos } from "../src/util";
import { CAJAS, DEUDORES, FECHA, MOVIMIENTOS, USUARIO } from "./datos";
import { CARGAR, H1, Shell, diasDesde, hacer, hayTurnoAbierto, motivoCierre } from "./comun";

const FILA = "flex min-h-14 items-center gap-3 px-4 py-2.5 lg:px-5";
const TOCABLE = "presiona w-full text-left transition-colors hover:bg-muted/50 active:bg-muted";
const Cuerpo = ({ titulo, detalle }: { titulo: string; detalle?: string }) => (
  <span className="min-w-0 flex-1">
    <span className="block text-sm font-medium">{titulo}</span>
    {detalle && <span className="block text-xs text-muted-foreground">{detalle}</span>}
  </span>
);
const Chevron = () => <ChevronRight className="-mr-1 size-4 shrink-0 text-muted-foreground" aria-hidden />;

// Tarjeta con encabezado: título, una línea que explica y, a la derecha, lo que haga falta.
function Tarjeta({ id, titulo, descripcion, extra, className = "", children }: { id: string; titulo: string; descripcion?: string; extra?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`${TARJETA} flex flex-col overflow-hidden ${className}`} aria-labelledby={id}>
      <div className="flex items-start gap-3 px-4 pb-2 pt-4 lg:px-5 lg:pt-5">
        <div className="min-w-0 flex-1">
          <h2 id={id} className="font-medium">{titulo}</h2>
          {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}

// D27: la caja chica sin ticket no muestra efectivo; solo las boletas.
function Caja({ c }: { c: (typeof CAJAS)[number] }) {
  const sinTicket = c.tipo === "operativa" && hayTurnoAbierto;
  const Icono = c.tipo === "operativa" ? Store : Landmark;
  return (
    <Tarjeta id={`caja-${c.id}`} titulo={c.nombre}
      extra={sinTicket ? <span className={`${INSIGNIA} ${TONOS.aviso}`}>Sin ticket</span> : <Icono className="mt-1 size-4 text-muted-foreground" aria-hidden />}>
      <div className="flex flex-wrap gap-x-8 gap-y-3 px-4 pb-4 pt-1 lg:px-5 lg:pb-5 lg:pt-2">
        <div>
          <p className="rotulo text-muted-foreground">Efectivo</p>
          <p className="mt-1.5">{sinTicket ? <span className="text-sm leading-7 text-muted-foreground">Al cargar el ticket</span> : <span className="monto text-xl font-semibold lg:text-2xl">{pesos(c.efectivo)}</span>}</p>
        </div>
        <div>
          <p className="rotulo text-muted-foreground">Boletas</p>
          <p className="mt-1.5"><span className="monto text-xl font-semibold lg:text-2xl">{pesos(c.boletas)}</span></p>
        </div>
      </div>
    </Tarjeta>
  );
}

const Cargar = ({ className }: { className: string }) => (
  <div role="group" aria-label="Cargar" className={className}>
    {CARGAR.map((b) => (
      <button key={b.etiqueta} type="button" className="presiona flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-lg border bg-card text-[13px] font-medium shadow-xs hover:bg-muted lg:h-9 lg:flex-row lg:gap-2 lg:rounded-md lg:px-3 lg:text-sm">
        <b.icono className={`size-5 lg:size-4 ${b.tono}`} aria-hidden />{b.etiqueta}
      </button>
    ))}
  </div>
);

export function InicioAfinado() {
  return (
    <Shell activa="inicio" trazo={2}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={H1}>Hola, {USUARIO}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground lg:hidden">
            <span className="first-letter:uppercase">{fechaLarga(FECHA)}</span>
            <span className={`${INSIGNIA} ${TONOS.exito}`}>Día abierto</span>
          </p>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">Las cajas, lo pendiente y los fiados del día.</p>
        </div>
        <Cargar className="hidden gap-2 lg:flex" />
      </div>

      {/* Arriba de todo, lo que hay en cada caja; debajo, lo que falta hoy. */}
      <div className="mt-4 grid gap-3 lg:mt-6 lg:grid-cols-2 lg:gap-4">{CAJAS.slice().reverse().map((c) => <Caja key={c.id} c={c} />)}</div>

      <div className="mt-3 flex flex-col gap-3 lg:mt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
        <Tarjeta id="estado" titulo="Falta hoy" descripcion="Turnos, rendición y arqueos">
          <ul className="divide-y">
            {hacer().map((h) => (
              <li key={h.clave}>
                <a href={h.href ?? "#"} className={`${FILA} ${TOCABLE}`}>
                  <h.icono className="size-4 shrink-0 text-aviso" aria-hidden />
                  <Cuerpo titulo={h.titulo} detalle={h.detalle} />
                  <Chevron />
                </a>
              </li>
            ))}
            <li className={FILA}>
              <Sunrise className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Cuerpo titulo="Turno mañana" detalle="Ticket cargado" />
              <span className={`${INSIGNIA} ${TONOS.neutro}`}>Cerrado</span>
            </li>
            <li>
              <button type="button" className={`${FILA} ${TOCABLE}`}>
                <Landmark className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <Cuerpo titulo="Traspaso a la caja grande" />
                <Chevron />
              </button>
            </li>
          </ul>
          <div className="border-t p-4 lg:px-5">
            <Boton type="button" variante="secundario" disabled className="w-full">Cerrar el día</Boton>
            <p className="mt-2 text-center text-xs text-muted-foreground">{motivoCierre()}</p>
          </div>
        </Tarjeta>

        <Cargar className="grid grid-cols-4 gap-2 lg:hidden" />

        <Tarjeta id="fiados" titulo="Fiados" descripcion="Los que más deben">
          <ul className="divide-y">
            {DEUDORES.map((d, i) => (
              <li key={d.id} className={`${FILA} ${i > 2 ? "max-lg:hidden" : ""}`}>
                <Cuerpo titulo={d.nombre} detalle={diasDesde(d.dias)} />
                <span className="monto text-sm font-medium">{pesos(d.saldo)}</span>
              </li>
            ))}
          </ul>
          <a href="#" className="presiona flex h-12 items-center justify-center gap-1 border-t text-sm font-medium hover:bg-muted/50">
            Ver cuenta corriente<ChevronRight className="size-4" aria-hidden />
          </a>
        </Tarjeta>

        <Tarjeta id="movimientos" titulo="Movimientos de hoy" descripcion="Lo cargado en el día, más nuevo primero" className="lg:col-span-2">
          <ul className="divide-y">
            {MOVIMIENTOS.map((mov) => {
              const t = TIPOS[mov.tipo];
              return (
                <li key={mov.id} className={FILA}>
                  <t.icono className={`size-4 shrink-0 ${t.tono}`} aria-hidden />
                  <Cuerpo titulo={t.etiqueta} detalle={`${mov.hora} · ${mov.quien}`} />
                  <span className="monto text-sm font-medium">{pesos(mov.monto)}</span>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      </div>
    </Shell>
  );
}
