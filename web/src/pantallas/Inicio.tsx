import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, Calculator, Clock, Landmark, Moon, Sunrise, type LucideIcon } from "lucide-react";
import { api } from "../api/cliente";
import { esSinDia, type CajaEstado, type TurnoOut } from "../api/tipos";
import { useUsuario } from "../contexto/usuario";
import { DIAS_VENCIDO, fechaLarga, pesos } from "../util";
import { Aviso, Boton, FILA, INSIGNIA, Reintentar, TARJETA, TIPOS, TONOS } from "../ui";
import { buttonVariants } from "@/components/ui/button";
import { BOTONES, Carga, type BotonCarga } from "./CargaRapida";
import { AccionesDia, TarjetaAbrirDia, type AccionDia } from "./Dia";
import { TarjetaMovimientos } from "./Movimientos";

const diasDesde = (d: number) => (d === 0 ? "Desde hoy" : `Hace ${d} ${d === 1 ? "día" : "días"}`);
const ENCABEZADO = "flex items-center justify-between gap-3 px-4 pb-2 pt-4 lg:px-5 lg:pt-5";

// D27: antes del ticket la caja chica no tiene esperado (SPECS §7.3) y su efectivo es parcial: solo se muestran las boletas.
// Sin turno abierto (los dos cerrados) ya no hay ticket por cargar: se muestra como la caja grande.
function TarjetaCaja({ c, hayTurnoAbierto }: { c: CajaEstado; hayTurnoAbierto: boolean }) {
  const sinTicket = c.tipo === "operativa" && !c.esperado && hayTurnoAbierto;
  return (
    <section className={`${TARJETA} p-3.5 lg:p-5`} aria-label={c.nombre}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 className="text-sm font-medium text-muted-foreground">{c.nombre}</h2>
        {sinTicket && <span className={`${INSIGNIA} ${TONOS.aviso}`}>Sin ticket</span>}
      </div>
      <p className="rotulo mt-3 text-muted-foreground">Efectivo</p>
      <p className="mt-1 break-all">
        {sinTicket ? <span className="text-sm leading-8 text-muted-foreground">Al cargar el ticket</span> : <span className="monto text-[22px] font-semibold lg:text-[34px]">{pesos(c.efectivo)}</span>}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">Boletas <span className="monto text-sm text-foreground">{pesos(c.boletas)}</span></p>
    </section>
  );
}

// D102: anillo chico con los arqueos hechos del día; no es una cifra héroe.
function Anillo({ n, m }: { n: number; m: number }) {
  const c = 2 * Math.PI * 8;
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <svg role="img" aria-label={`Arqueos ${n} de ${m}`} width="20" height="20" viewBox="0 0 20 20" fill="none" strokeWidth="2.5">
        <circle cx="10" cy="10" r="8" className="stroke-muted" />
        {n > 0 && m > 0 && <circle cx="10" cy="10" r="8" className="stroke-foreground" strokeDasharray={`${(c * Math.min(n, m)) / m} ${c}`} strokeLinecap="round" transform="rotate(-90 10 10)" />}
      </svg>
      Arqueos {n} de {m}
    </span>
  );
}

// Un pendiente: lo vencido (turno ya pasado) en peligro, lo que falta ahora en aviso (D101); la acción es un enlace o un botón.
type Pendiente = { clave: string; icono: LucideIcon; titulo: string; detalle: string; accion: string; estado?: "Vencido" | "Falta"; href?: string; onClick?: () => void };

function Renglon({ p, primario }: { p: Pendiente; primario: boolean }) {
  const color = p.estado === "Vencido" ? "text-peligro" : p.estado ? "text-aviso" : "text-muted-foreground";
  const contenido = (
    <>
      <p.icono className={`size-4 shrink-0 ${color}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium">{p.titulo}</span>
          {p.estado && <span className={`${INSIGNIA} ${p.estado === "Vencido" ? TONOS.peligro : TONOS.aviso}`}>{p.estado}</span>}
        </span>
        <span className="block text-xs text-muted-foreground">{p.detalle}</span>
      </span>
      <span className={buttonVariants({ variant: primario ? "default" : "outline", size: "sm" })}>{p.accion}</span>
    </>
  );
  const clases = `${FILA} w-full text-left transition-colors hover:bg-muted/50 active:bg-muted`;
  return p.href
    ? <a href={p.href} className={clases}>{contenido}</a>
    : <button type="button" onClick={p.onClick} className={clases}>{contenido}</button>;
}

export function Inicio() {
  const { usuario } = useUsuario();
  const [seleccion, setSeleccion] = useState<BotonCarga | null>(null);
  const [accion, setAccion] = useState<AccionDia | null>(null);
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const cajas = useQuery({ queryKey: ["cajas"], queryFn: api.cajas });
  const deudores = useQuery({ queryKey: ["deudores", "monto"], queryFn: () => api.deudores("monto") });
  const fecha = dia.data?.dia.fecha;
  const reporte = useQuery({ queryKey: ["reporte-dia", fecha], queryFn: () => api.reportesDia(fecha!), enabled: !!fecha });
  const conDeuda = deudores.data?.filter((d) => d.saldo > 0);
  const sinDia = dia.isError ? esSinDia(dia.error) : dia.isSuccess && dia.data.dia.estado !== "abierto";
  const turnos = dia.data?.turnos ?? [];
  const cajaChicaId = dia.data?.cajas.find((c) => c.tipo === "operativa")?.id;
  const turnosAbiertos = turnos.some((t) => t.estado === "abierto");
  // Traspaso: completo tras un arqueo (D3) o parcial con el turno abierto (D65).
  const puedeTraspasar = turnosAbiertos || turnos.some((t) => t.estado === "cerrado");
  const arqueosPendientes = dia.data?.arqueos_pendientes ?? [];
  const puedeCerrar = !!dia.data && !turnosAbiertos && arqueosPendientes.length === 0;

  // Turno ya pasado = vencido; el turno de ahora = falta; uno futuro todavía no corre.
  const actual = turnos.findIndex((t) => t.estado === "abierto");
  const estadoDe = (t?: TurnoOut): Pendiente["estado"] => {
    const i = t ? turnos.indexOf(t) : -1;
    return !t ? undefined : t.estado === "cerrado" || i < actual ? "Vencido" : i === actual ? "Falta" : undefined;
  };
  const pendientes: Pendiente[] = [
    ...arqueosPendientes.map((a) => {
      const t = turnos.find((x) => a.endsWith(`_${x.nombre}`));
      const caja = (t ? a.slice(0, -(t.nombre.length + 1)) : a).replace(/_/g, " ");
      return { clave: a, icono: Calculator, titulo: `Arqueo de ${caja}`, detalle: t ? `Turno ${t.nombre}` : "Contá efectivo y boletas", accion: "Arquear", estado: estadoDe(t), href: `#arqueo?pendiente=${a}` };
    }),
    // Solo el turno de ahora: el de la noche no admite ticket hasta que se cierre el de la mañana.
    ...turnos.filter((t, i) => i === actual && !t.tiene_ticket).map((t) => ({
      clave: `ticket-${t.id}`, icono: t.nombre === "mañana" ? Sunrise : t.nombre === "noche" ? Moon : Clock, titulo: `Turno ${t.nombre}`,
      detalle: "Sin ticket, la caja chica no tiene esperado", accion: "Cargar ticket", estado: estadoDe(t), onClick: () => setAccion({ tipo: "ticket", turno: t }),
    })),
    ...(dia.data?.rendicion_pendiente ? [{ clave: "rendicion", icono: Archive, titulo: "Rendición", detalle: "Boletas de ayer para contar y archivar", accion: "Rendir", estado: "Falta" as const, onClick: () => setAccion({ tipo: "rendicion" }) }] : []),
  ];

  return (
    <>
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

      {/* Mobile: cajas, pendientes, cargas, movimientos, fiados. Escritorio (3/2): izquierda cajas, pendientes y movimientos; derecha cargas y fiados. */}
      <div className="mt-5 flex flex-col gap-3 lg:grid lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-6">
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div className="order-1 grid grid-cols-2 gap-3 lg:gap-4">
            {cajas.isLoading && [0, 1].map((i) => <div key={i} className="esqueleto h-[136px]" />)}
            {cajas.data?.map((c) => <TarjetaCaja key={c.id} c={c} hayTurnoAbierto={turnosAbiertos} />)}
            {cajas.isError && (
              <div className="col-span-2">
                <Aviso tono="error" accion={<Reintentar onClick={() => cajas.refetch()} />}>No se pudieron traer las cajas.</Aviso>
              </div>
            )}
          </div>

          <div className="order-2">
            {sinDia ? <TarjetaAbrirDia cerrado={dia.data?.dia.estado === "cerrado" ? dia.data.dia : undefined} /> : (
              <section className={`${TARJETA} overflow-hidden`} aria-labelledby="falta-hoy">
                <div className={ENCABEZADO}>
                  <h2 id="falta-hoy" className="font-semibold">Lo que falta hoy</h2>
                  {dia.data && reporte.data && <Anillo n={new Set(reporte.data.arqueos.map((a) => `${a.caja_id}-${a.turno_id}`)).size} m={dia.data.cajas.length * turnos.length} />}
                </div>
                {dia.isLoading && <div className="esqueleto m-4 h-40" />}
                {dia.isError && (
                  <div className="p-4">
                    <Aviso tono="error" accion={<Reintentar onClick={() => dia.refetch()} />}>No se pudo traer el día.</Aviso>
                  </div>
                )}
                {dia.data && (
                  <ul className="divide-y border-t">
                    {pendientes.map((p, i) => <li key={p.clave}><Renglon p={p} primario={i === 0} /></li>)}
                    {pendientes.length === 0 && <li className="px-4 py-5 text-center text-sm text-muted-foreground lg:px-5">No falta nada por ahora.</li>}
                    {puedeTraspasar && cajaChicaId !== undefined && (
                      <li>
                        <Renglon p={{ clave: "traspaso", icono: Landmark, titulo: "Traspaso a la caja grande", detalle: "Pasá el efectivo de la caja chica", accion: "Traspasar", onClick: () => setAccion({ tipo: "traspaso", cajaId: cajaChicaId }) }} primario={false} />
                      </li>
                    )}
                  </ul>
                )}
                {dia.data && (
                  <div className="border-t p-4 lg:px-5">
                    <Boton type="button" variante={pendientes.length === 0 && puedeCerrar ? "primario" : "secundario"} disabled={!puedeCerrar}
                      onClick={() => setAccion({ tipo: "cerrar", diaId: dia.data.dia.id })} className="w-full">
                      Cerrar el día
                    </Boton>
                    {!puedeCerrar && (
                      <p className="mt-2 text-center text-xs text-muted-foreground">
                        {turnosAbiertos ? "Hay turnos abiertos: cerralos con su arqueo." : "Faltan arqueos pendientes."}
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>

          {!sinDia && <div className="order-4"><TarjetaMovimientos /></div>}
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div role="group" aria-label="Cargar" className="order-3 grid grid-cols-4 gap-2 lg:grid-cols-2 lg:gap-3">
            {BOTONES.map((b) => (
              <button key={b.etiqueta} type="button" onClick={() => setSeleccion(b)}
                className="presiona flex h-16 flex-col items-center justify-center gap-1.5 rounded-lg border bg-card text-[13px] font-medium shadow-xs hover:bg-muted lg:h-[76px] lg:text-sm">
                <b.icono className={`size-5 ${b.tono}`} aria-hidden />
                {b.etiqueta}
              </button>
            ))}
          </div>

          <section className={`${TARJETA} order-5 flex flex-col overflow-hidden`} aria-labelledby="fiados">
            <div className={ENCABEZADO}>
              <h2 id="fiados" className="font-semibold">Fiados</h2>
              <a href="#cuenta-corriente" className="text-sm underline underline-offset-4 hover:text-muted-foreground">Ver cuenta corriente</a>
            </div>
            {deudores.isLoading && <div className="esqueleto m-4 h-32" />}
            {deudores.isError && (
              <div className="p-4">
                <Aviso tono="error" accion={<Reintentar onClick={() => deudores.refetch()} />}>No se pudieron traer los fiados.</Aviso>
              </div>
            )}
            {conDeuda?.length === 0 && (
              <div className="flex flex-col items-center gap-3 border-t px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">Nadie debe nada. Los fiados que cargues aparecen acá.</p>
                <Boton type="button" variante="secundario" onClick={() => setSeleccion(BOTONES[0])}>Cargar un fiado</Boton>
              </div>
            )}
            <ul className="divide-y border-t empty:hidden">
              {conDeuda?.slice(0, 4).map((d) => {
                const vencido = d.dias_deuda_mas_vieja >= DIAS_VENCIDO;
                return (
                  <li key={d.id} className={FILA}>
                    <TIPOS.fiado.icono className={`size-4 shrink-0 ${vencido ? "text-peligro" : "text-aviso"}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="break-words text-sm font-medium">{d.nombre}</span>
                        {vencido && <span className={`${INSIGNIA} ${TONOS.peligro}`}>Vencido</span>}
                      </span>
                      <span className="block text-xs text-muted-foreground">{diasDesde(d.dias_deuda_mas_vieja)}</span>
                    </span>
                    <span className="monto text-sm font-medium">{pesos(d.saldo)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <Carga seleccion={seleccion} onSeleccion={setSeleccion} />
      <AccionesDia accion={accion} onCerrar={() => setAccion(null)} />
    </>
  );
}
