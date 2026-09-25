import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, BookUser, Calculator, ChevronRight, Clock, Landmark, ListTodo, Moon, Store, Sunrise, type LucideIcon } from "lucide-react";
import { api } from "../api/cliente";
import type { CajaEstado } from "../api/tipos";
import { useUsuario } from "../contexto/usuario";
import { fechaLarga, pesos } from "../util";
import { Aviso, INSIGNIA, TARJETA, TONOS } from "../ui";
import { BOTONES, Carga, type BotonCarga } from "./CargaRapida";

const Reintentar = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="presiona -my-1 h-11 rounded-md px-2 font-medium underline underline-offset-4 lg:h-8">
    Reintentar
  </button>
);
const FILA = "flex min-h-14 items-center gap-3 px-4 py-2.5 lg:px-5";
const diasDesde = (d: number) => (d === 0 ? "Desde hoy" : `Hace ${d} ${d === 1 ? "día" : "días"}`);

// Tarjeta de indicador: título chico con su ícono a la derecha, el dato grande y el detalle debajo.
function Indicador({ titulo, icono: Icono, tonoIcono = "text-muted-foreground", extra, children, className = "" }: {
  titulo: string; icono: LucideIcon; tonoIcono?: string; extra?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`${TARJETA} flex flex-col p-4 lg:p-5 ${className}`}>
      <div className="flex min-h-6 items-center gap-2">
        <h2 className="flex-1 truncate text-sm font-medium">{titulo}</h2>
        {extra}
        <Icono className={`size-4 shrink-0 ${tonoIcono}`} aria-hidden />
      </div>
      {children}
    </section>
  );
}

// Un dato de caja: rótulo, monto en mono y el esperado debajo si existe.
const Dato = ({ rotulo, valor, esperado }: { rotulo: string; valor: ReactNode; esperado?: number }) => (
  <div className="min-w-0">
    <p className="rotulo text-muted-foreground">{rotulo}</p>
    <p className="mt-1.5 truncate">{valor}</p>
    {esperado !== undefined && <p className="mt-1 truncate text-xs text-muted-foreground">Esperado <span className="monto">{pesos(esperado)}</span></p>}
  </div>
);
const Monto = ({ v }: { v: number }) => <span className="monto text-2xl font-semibold">{pesos(v)}</span>;

// D27: antes del ticket la caja chica no tiene esperado (SPECS §7.3) y su efectivo es parcial: solo se muestran las boletas.
function TarjetaCaja({ c }: { c: CajaEstado }) {
  const sinTicket = c.tipo === "operativa" && !c.esperado;
  return (
    <Indicador titulo={c.nombre} icono={c.tipo === "operativa" ? Store : Landmark} className="col-span-2 sm:col-span-1"
      extra={sinTicket && <span className={`${INSIGNIA} ${TONOS.aviso}`}>Sin ticket</span>}>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Dato rotulo="Efectivo" esperado={c.esperado?.efectivo}
          valor={sinTicket ? <span className="text-sm leading-8 text-muted-foreground">Al cargar el ticket</span> : <Monto v={c.efectivo} />} />
        <Dato rotulo="Boletas" valor={<Monto v={c.boletas} />} esperado={c.esperado?.boletas} />
      </div>
    </Indicador>
  );
}

export function Inicio() {
  const { usuario } = useUsuario();
  const [seleccion, setSeleccion] = useState<BotonCarga | null>(null);
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const cajas = useQuery({ queryKey: ["cajas"], queryFn: api.cajas });
  const deudores = useQuery({ queryKey: ["deudores", "monto"], queryFn: () => api.deudores("monto") });
  const conDeuda = deudores.data?.filter((d) => d.saldo > 0);
  const pendientes = dia.data ? dia.data.arqueos_pendientes.length + (dia.data.rendicion_pendiente ? 1 : 0) : 0;
  const nombreArqueo = (a: string) => `Arqueo ${a.replace(/_/g, " ")}`;

  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight lg:text-2xl">Hola, {usuario?.nombre}</h1>
          <div className="mt-1 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground lg:hidden">
            {dia.isLoading && <span className="esqueleto h-5 w-48" />}
            {dia.data && (
              <>
                <span className="first-letter:uppercase">{fechaLarga(dia.data.dia.fecha)}</span>
                <span className={`${INSIGNIA} ${dia.data.dia.estado === "abierto" ? TONOS.exito : TONOS.neutro}`}>Día {dia.data.dia.estado}</span>
              </>
            )}
          </div>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">Cajas, pendientes y fiados del día.</p>
        </div>
        <div role="group" aria-label="Cargar" className="grid grid-cols-4 gap-2 lg:flex">
          {BOTONES.map((b) => (
            <button key={b.etiqueta} type="button" onClick={() => setSeleccion(b)}
              className="presiona flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-lg border bg-card text-[13px] font-medium shadow-xs hover:bg-muted lg:h-9 lg:flex-row lg:gap-2 lg:rounded-md lg:px-3 lg:text-sm">
              <b.icono className={`size-5 lg:size-4 ${b.tono}`} aria-hidden />
              {b.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-[2fr_2fr_1fr_1fr]">
        {cajas.isLoading && [0, 1].map((i) => <div key={i} className="esqueleto col-span-2 h-[146px] sm:col-span-1" />)}
        {cajas.data?.map((c) => <TarjetaCaja key={c.id} c={c} />)}
        {cajas.isError && (
          <div className="col-span-2">
            <Aviso tono="error" accion={<Reintentar onClick={() => cajas.refetch()} />}>No se pudieron traer las cajas.</Aviso>
          </div>
        )}
        <Indicador titulo="Pendientes" icono={ListTodo} tonoIcono={pendientes ? "text-aviso" : undefined}>
          <p className="monto mt-4 text-2xl font-semibold">{dia.data ? pendientes : "–"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{pendientes ? "Controles por hacer hoy" : "Nada pendiente"}</p>
        </Indicador>
        <Indicador titulo="Fiados" icono={BookUser}>
          <p className="monto mt-4 text-2xl font-semibold">{conDeuda ? conDeuda.length : "–"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{conDeuda?.length === 1 ? "Cliente con deuda" : "Clientes con deuda"}</p>
        </Indicador>
      </div>

      <div className="mt-3 grid gap-3 lg:mt-4 lg:grid-cols-2 lg:gap-4">
        <section className={`${TARJETA} overflow-hidden`} aria-labelledby="estado-dia">
          <div className="px-4 pb-2 pt-4 lg:px-5 lg:pt-5">
            <h2 id="estado-dia" className="font-medium">Estado del día</h2>
            <p className="text-sm text-muted-foreground">Turnos, rendición y arqueos</p>
          </div>
          {dia.isLoading && <div className="esqueleto m-4 h-40" />}
          {dia.isError && (
            <div className="p-4">
              <Aviso tono="error" accion={<Reintentar onClick={() => dia.refetch()} />}>No se pudo traer el día.</Aviso>
            </div>
          )}
          <ul className="divide-y">
            {dia.data?.turnos.map((t) => {
              const Icono = t.nombre === "mañana" ? Sunrise : t.nombre === "noche" ? Moon : Clock;
              return (
                <li key={t.id} className={FILA}>
                  <Icono className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Turno {t.nombre}</span>
                    <span className="block text-xs text-muted-foreground">{t.tiene_ticket ? "Ticket cargado" : "Sin ticket"}</span>
                  </span>
                  {t.estado === "abierto" ? (
                    <span className={`${INSIGNIA} ${TONOS.exito}`}><span className="size-1.5 rounded-full bg-current" aria-hidden />Abierto</span>
                  ) : (
                    <span className={`${INSIGNIA} ${TONOS.neutro}`}>Cerrado</span>
                  )}
                </li>
              );
            })}
            {dia.data?.rendicion_pendiente && (
              <li className={FILA}>
                <Archive className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Rendición</span>
                  <span className="block text-xs text-muted-foreground">Boletas de ayer para contar y archivar</span>
                </span>
                <span className={`${INSIGNIA} ${TONOS.aviso}`}>Pendiente</span>
              </li>
            )}
            {dia.data?.arqueos_pendientes.map((a) => (
              <li key={a}>
                <a href="#arqueo" className={`${FILA} transition-colors hover:bg-muted/50 active:bg-muted`}>
                  <Calculator className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 text-sm font-medium first-letter:uppercase">{nombreArqueo(a)}</span>
                  <span className={`${INSIGNIA} ${TONOS.aviso}`}>Pendiente</span>
                  <ChevronRight className="-mr-1 size-4 text-muted-foreground" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${TARJETA} flex flex-col overflow-hidden`} aria-labelledby="fiados">
          <div className="px-4 pb-2 pt-4 lg:px-5 lg:pt-5">
            <h2 id="fiados" className="font-medium">Fiados</h2>
            <p className="text-sm text-muted-foreground">Los que más deben</p>
          </div>
          {deudores.isLoading && <div className="esqueleto m-4 h-40" />}
          {deudores.isError && (
            <div className="p-4">
              <Aviso tono="error" accion={<Reintentar onClick={() => deudores.refetch()} />}>No se pudieron traer los fiados.</Aviso>
            </div>
          )}
          {conDeuda?.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nadie debe nada. Los fiados que cargues aparecen acá.</p>}
          <ul className="divide-y">
            {conDeuda?.slice(0, 3).map((d) => (
              <li key={d.id} className={FILA}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{d.nombre}</span>
                  <span className="block text-xs text-muted-foreground">{diasDesde(d.dias_deuda_mas_vieja)}</span>
                </span>
                <span className="monto text-sm font-medium">{pesos(d.saldo)}</span>
              </li>
            ))}
          </ul>
          <a href="#cuenta-corriente" className="presiona mt-auto flex h-12 items-center justify-center gap-1 border-t text-sm font-medium hover:bg-muted/50">
            Ver cuenta corriente
            <ChevronRight className="size-4" aria-hidden />
          </a>
        </section>
      </div>

      <Carga seleccion={seleccion} onSeleccion={setSeleccion} />
    </>
  );
}
