import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/cliente";
import type { MovimientoOut, ResumenMes } from "../api/tipos";
import { fechaCorta, fechaHoy, pesos } from "../util";
import { Aviso, INSIGNIA, TARJETA, TIPOS, TONOS } from "../ui";

const Reintentar = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="presiona -my-1 h-11 rounded-md px-2 font-medium underline underline-offset-4 lg:h-8">
    Reintentar
  </button>
);

// "2026-09" ± meses, sin pasar por Date con día fijo (evita saltos por zona horaria).
function sumarMes(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}
function rangoMes(mes: string): { desde: string; hasta: string } {
  const [a, m] = mes.split("-").map(Number);
  return { desde: `${mes}-01`, hasta: `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}` };
}
const formatoMes = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
const mesLabel = (mes: string) => formatoMes.format(new Date(`${mes}-01T12:00:00`));

// Una fila de un grupo: el valor sale del mes elegido y del anterior, sin restarlos ni sumarlos acá.
type Fila = { etiqueta: string; valor: (r: ResumenMes) => number; signo?: boolean; moneda?: boolean };
function Grupo({ titulo, descripcion, filas, actual, anterior, nota }: {
  titulo: string; descripcion: string; filas: Fila[]; actual: ResumenMes; anterior: ResumenMes; nota?: ReactNode;
}) {
  const val = (f: Fila, r: ResumenMes) => (f.moneda === false ? String(f.valor(r)) : pesos(f.valor(r), f.signo));
  return (
    <section className={`${TARJETA} p-4 lg:p-5`}>
      <h2 className="font-medium">{titulo}</h2>
      <p className="text-sm text-muted-foreground">{descripcion}</p>
      <ul className="mt-3 divide-y">
        {filas.map((f) => (
          <li key={f.etiqueta} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-muted-foreground">{f.etiqueta}</span>
            <span className="flex items-baseline gap-2">
              <span className="monto font-medium">{val(f, actual)}</span>
              <span className="monto text-xs text-muted-foreground">{val(f, anterior)}</span>
            </span>
          </li>
        ))}
      </ul>
      {nota}
    </section>
  );
}

// Los cinco grupos de D39. `deudaHoy` no tiene mes anterior: es la deuda de hoy, se muestra aparte.
function construirGrupos(actual: ResumenMes, anterior: ResumenMes, deudaHoy: number) {
  const juegos = new Map<number, string>();
  for (const v of [...actual.ventas_por_juego, ...anterior.ventas_por_juego]) juegos.set(v.juego_id, v.nombre);
  const ventaJuego = (id: number) => (r: ResumenMes) => r.ventas_por_juego.find((v) => v.juego_id === id)?.total ?? 0;
  return [
    {
      titulo: "Ventas", descripcion: "Lo vendido en el mes, por juego",
      filas: [...juegos].map(([id, nombre]) => ({ etiqueta: nombre, valor: ventaJuego(id) }))
        .concat([{ etiqueta: "Total vendido", valor: (r: ResumenMes) => r.total_vendido }]),
    },
    {
      titulo: "Entradas además de ventas", descripcion: "Lo que entró a las cajas sin ser venta de juego",
      filas: [
        { etiqueta: "Cobros de fiados", valor: (r: ResumenMes) => r.cobros_fiado },
        { etiqueta: "Cobros de subagentes", valor: (r: ResumenMes) => r.cobros_subagente },
        { etiqueta: "Lo que trajo el dueño", valor: (r: ResumenMes) => r.ingresos_del_dueno },
      ],
    },
    {
      titulo: "Salidas", descripcion: "Lo que salió de las cajas en el mes",
      filas: [
        { etiqueta: "Premios pagados", valor: (r: ResumenMes) => r.premios_pagados },
        { etiqueta: "Mercado Pago / transferencia", valor: (r: ResumenMes) => r.cobros_mercado_pago },
        { etiqueta: "Pagos al banco", valor: (r: ResumenMes) => r.pagos_banco },
        { etiqueta: "Sueldos", valor: (r: ResumenMes) => r.sueldos },
        { etiqueta: "Gastos", valor: (r: ResumenMes) => r.gastos },
        { etiqueta: "Retiros del dueño", valor: (r: ResumenMes) => r.retiros_dueno },
      ],
    },
    {
      titulo: "Fiados", descripcion: "Lo anotado y lo cobrado en el mes",
      filas: [
        { etiqueta: "Anotado en el mes", valor: (r: ResumenMes) => r.fiado },
        { etiqueta: "Cobrado en el mes", valor: (r: ResumenMes) => r.cobros_fiado },
      ],
      nota: (
        <p className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">Deben hoy (todos los clientes)</span>
          <span className="monto font-medium">{pesos(deudaHoy)}</span>
        </p>
      ),
    },
    {
      titulo: "Arqueos", descripcion: "Hechos, cuadrados y con diferencia en el mes",
      filas: [
        { etiqueta: "Arqueos hechos", valor: (r: ResumenMes) => r.arqueos_hechos, moneda: false },
        { etiqueta: "Cuadran", valor: (r: ResumenMes) => r.arqueos_cuadran, moneda: false },
        { etiqueta: "No cuadran", valor: (r: ResumenMes) => r.arqueos_con_diferencia, moneda: false },
        { etiqueta: "Explicados después", valor: (r: ResumenMes) => r.arqueos_explicados, moneda: false },
        { etiqueta: "Diferencia en efectivo", valor: (r: ResumenMes) => r.diferencia_efectivo, signo: true },
        { etiqueta: "Diferencia en boletas", valor: (r: ResumenMes) => r.diferencia_boletas, signo: true },
        { etiqueta: "Diferencia total (sin explicar)", valor: (r: ResumenMes) => r.diferencia_total, signo: true },
      ],
    },
  ];
}

// Barras a mano en SVG, un día por barra; los días en 0 quedan como una barra apenas visible.
// `total` sale del reporte (total_vendido del mes), no de sumar las barras acá: el front no calcula plata.
function GraficoVentas({ dias, total }: { dias: { fecha: string; total: number }[]; total: number }) {
  const max = Math.max(1, ...dias.map((d) => d.total));
  const marcados = new Set([0, dias.length - 1, ...dias.map((_, i) => i).filter((i) => (i + 1) % 5 === 0)]);
  return (
    <svg viewBox={`0 0 ${dias.length * 10} 46`} role="img" className="h-32 w-full text-foreground"
      aria-label={`Ventas por día del mes: total ${pesos(total)}, un ${dias.length > 0 ? "día por barra" : "mes sin días"}`}>
      {dias.map((d, i) => {
        const alto = Math.max((d.total / max) * 34, 1);
        return (
          <g key={d.fecha}>
            <rect x={i * 10 + 1.5} y={38 - alto} width={7} height={alto} rx={1}
              className={`fill-current ${d.total > 0 ? "" : "text-muted-foreground/30"}`}>
              <title>{fechaCorta(d.fecha)}: {pesos(d.total)}</title>
            </rect>
            {marcados.has(i) && (
              <text x={i * 10 + 5} y={45} textAnchor="middle" fontSize={4.5} className="fill-current text-muted-foreground">
                {Number(d.fecha.slice(-2))}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Ya sin "cuadra": esa lista solo trae lo que no cuadró o quedó explicado.
function estadoInsignia(estado: "con_diferencia" | "explicada") {
  return estado === "explicada" ? { texto: "Explicada", clase: TONOS.aviso } : { texto: "No cuadra", clase: "bg-peligro/8 text-peligro" };
}
const horaFormato = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });
// Ya van aparte (Ventas y Premios pagados) o son internos que el cierre del mes deja afuera (D39).
const FUERA_DE_LISTA_POR_TIPO = new Set(["apuesta_quiniela", "venta_otro_juego", "pago_premio", "traspaso", "traspaso_boletas", "rendicion_boletas"]);

export function Reportes() {
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const { desde, hasta } = rangoMes(mes);
  const cierre = useQuery({ queryKey: ["reportes-mes", mes], queryFn: () => api.reportesMes(mes) });
  const mp = useQuery({ queryKey: ["reportes-mp"], queryFn: api.reportesMercadoPago });
  const diferencias = useQuery({ queryKey: ["reportes-diferencias", mes], queryFn: () => api.reportesDiferencias({ desde, hasta }) });
  const rendiciones = useQuery({ queryKey: ["reportes-rendiciones", mes], queryFn: () => api.reportesRendiciones({ desde, hasta }) });
  const hoy = fechaHoy();
  const dia = useQuery({ queryKey: ["reportes-dia", hoy], queryFn: () => api.reportesDia(hoy) });
  const cajas = useQuery({ queryKey: ["cajas"], queryFn: api.cajas });
  const nombreCaja = (id: number) => cajas.data?.find((c) => c.id === id)?.nombre ?? `Caja #${id}`;
  const grupos = cierre.data ? construirGrupos(cierre.data.actual, cierre.data.anterior, cierre.data.deuda_total_hoy) : null;
  const sinCuadrar = diferencias.data?.filter((d) => d.estado !== "cuadra");

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setMes((m) => sumarMes(m, -1))} aria-label="Mes anterior" className="presiona grid size-9 place-items-center rounded-md hover:bg-muted">
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="w-40 text-center text-sm font-medium first-letter:uppercase">{mesLabel(mes)}</span>
        <button type="button" onClick={() => setMes((m) => sumarMes(m, 1))} aria-label="Mes siguiente" className="presiona grid size-9 place-items-center rounded-md hover:bg-muted">
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      {cierre.isLoading && <div className="esqueleto h-96" />}
      {cierre.isError && (
        <Aviso tono="error" accion={<Reintentar onClick={() => cierre.refetch()} />}>No se pudo traer el cierre del mes.</Aviso>
      )}

      {grupos && cierre.data && (
        <>
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            {grupos.map((g) => (
              <Grupo key={g.titulo} titulo={g.titulo} descripcion={g.descripcion} filas={g.filas}
                actual={cierre.data.actual} anterior={cierre.data.anterior} nota={g.nota} />
            ))}
          </div>
          <section className={`${TARJETA} p-4 lg:p-5`}>
            <h2 className="font-medium">Ventas por día</h2>
            <p className="text-sm text-muted-foreground">Un día por barra; en gris, los días sin ventas</p>
            <div className="mt-3"><GraficoVentas dias={cierre.data.ventas_por_dia} total={cierre.data.actual.total_vendido} /></div>
          </section>
        </>
      )}

      <section className={`${TARJETA} p-4 lg:p-5`}>
        <h2 className="font-medium">Mercado Pago acumulado</h2>
        <p className="text-sm text-muted-foreground">Lo cobrado por MP o transferencia desde el último ingreso del dueño</p>
        {mp.isLoading && <div className="esqueleto mt-3 h-12" />}
        {mp.isError && <div className="mt-3"><Aviso tono="error" accion={<Reintentar onClick={() => mp.refetch()} />}>No se pudo traer Mercado Pago.</Aviso></div>}
        {mp.data && (
          <div className="mt-3">
            <p className="monto text-2xl font-semibold">{pesos(mp.data.acumulado)}</p>
            <p className="text-xs text-muted-foreground">{mp.data.desde ? `Desde ${fechaCorta(mp.data.desde)}` : "Todavía no hubo ingresos del dueño"}</p>
          </div>
        )}
      </section>

      <section className={`${TARJETA} p-4 lg:p-5`}>
        <h2 className="font-medium">Cierre del día</h2>
        <p className="text-sm text-muted-foreground">Lo movido hoy, sin anulados</p>
        {dia.isLoading && <div className="esqueleto mt-3 h-40" />}
        {dia.isError && <div className="mt-3"><Aviso tono="error" accion={<Reintentar onClick={() => dia.refetch()} />}>No se pudo traer el cierre del día.</Aviso></div>}
        {dia.data && (
          <ul className="mt-3 divide-y text-sm">
            <li className="flex items-center justify-between gap-3 py-2">
              <span className="text-muted-foreground">Ventas</span>
              <span className="monto font-medium">{pesos(dia.data.apuestas)}</span>
            </li>
            <li className="flex items-center justify-between gap-3 py-2">
              <span className="text-muted-foreground">Premios pagados</span>
              <span className="monto font-medium">{pesos(dia.data.boletas)}</span>
            </li>
            {Object.entries(dia.data.totales_por_tipo).filter(([tipo]) => !FUERA_DE_LISTA_POR_TIPO.has(tipo)).map(([tipo, monto]) => (
              <li key={tipo} className="flex items-center justify-between gap-3 py-2">
                <span className="text-muted-foreground">{TIPOS[tipo as MovimientoOut["tipo"]]?.etiqueta ?? tipo}</span>
                <span className="monto font-medium">{pesos(monto)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 py-2">
              <span className="text-muted-foreground">Arqueos: cuadran / no cuadran</span>
              <span className="font-medium">
                {dia.data.arqueos.filter((a) => a.estado === "cuadra").length} / {dia.data.arqueos.filter((a) => a.estado !== "cuadra").length}
              </span>
            </li>
          </ul>
        )}
      </section>

      <section className={`${TARJETA} overflow-hidden`}>
        <div className="p-4 pb-2 lg:p-5 lg:pb-2">
          <h2 className="font-medium">Diferencias de arqueo</h2>
          <p className="text-sm text-muted-foreground">Los arqueos del mes que no cuadraron o quedaron explicados</p>
        </div>
        {diferencias.isLoading && <div className="esqueleto m-4 h-24" />}
        {diferencias.isError && <div className="p-4"><Aviso tono="error" accion={<Reintentar onClick={() => diferencias.refetch()} />}>No se pudieron traer las diferencias.</Aviso></div>}
        {sinCuadrar?.length === 0 && <p className="px-4 pb-4 text-sm text-muted-foreground">Sin diferencias en {mesLabel(mes)}.</p>}
        {!!sinCuadrar?.length && (
          <ul className="divide-y">
            {sinCuadrar.map((d) => {
              const e = estadoInsignia(d.estado as "con_diferencia" | "explicada");
              return (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm lg:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{nombreCaja(d.caja_id)} · {horaFormato.format(new Date(d.momento))}</span>
                    <span className="block text-xs text-muted-foreground">{fechaCorta(d.momento.slice(0, 10))}</span>
                  </span>
                  <span className="monto text-right text-xs text-muted-foreground">
                    <span className="block">{pesos(d.diferencia_efectivo, true)} ef.</span>
                    <span className="block">{pesos(d.diferencia_boletas, true)} bol.</span>
                  </span>
                  <span className={`${INSIGNIA} ${e.clase}`}>{e.texto}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={`${TARJETA} overflow-hidden`}>
        <div className="p-4 pb-2 lg:p-5 lg:pb-2">
          <h2 className="font-medium">Lotes de rendición</h2>
          <p className="text-sm text-muted-foreground">Las boletas rendidas en el mes</p>
        </div>
        {rendiciones.isLoading && <div className="esqueleto m-4 h-24" />}
        {rendiciones.isError && <div className="p-4"><Aviso tono="error" accion={<Reintentar onClick={() => rendiciones.refetch()} />}>No se pudieron traer las rendiciones.</Aviso></div>}
        {rendiciones.data?.length === 0 && <p className="px-4 pb-4 text-sm text-muted-foreground">Sin lotes rendidos en {mesLabel(mes)}.</p>}
        {!!rendiciones.data?.length && (
          <ul className="divide-y">
            {rendiciones.data.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm lg:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{fechaCorta(r.fecha)}</span>
                  <span className="block text-xs text-muted-foreground">{r.cantidad_boletas} boletas</span>
                </span>
                <span className="monto text-sm">{pesos(r.diferencia, true)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
