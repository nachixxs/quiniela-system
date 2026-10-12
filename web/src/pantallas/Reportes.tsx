import { type ReactNode, lazy, Suspense, useState } from "react";
import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "../api/cliente";
import type { MovimientoOut, ReporteDia, ReporteMercadoPago, ResumenMes } from "../api/tipos";
import { fechaCorta, fechaHoraCorta, fechaHoy, pesos } from "../util";
import { Aviso, Boton, hora, INSIGNIA, Reintentar, TARJETA, TIPOS, TONOS } from "../ui";

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

// Celdas de las tablas de la pantalla: el rótulo a la izquierda, los montos a la derecha.
const TD_ROTULO = "whitespace-normal py-2.5 pl-4 pr-2 lg:pl-5";
const TD_MONTO = "monto px-2 py-2.5 text-right last:pr-4 lg:last:pr-5";
const TH_MONTO = "whitespace-normal px-2 text-right text-xs font-medium text-muted-foreground last:pr-4 lg:last:pr-5";
const Encabezado = ({ titulo, descripcion }: { titulo: string; descripcion: string }) => (
  <div className="p-4 pb-2 lg:p-5 lg:pb-2">
    <h2 className="font-medium">{titulo}</h2>
    <p className="text-sm text-muted-foreground">{descripcion}</p>
  </div>
);

// Una fila de un grupo: el valor sale del mes elegido y del anterior, sin restarlos ni sumarlos acá.
type NumKey = { [K in keyof ResumenMes]: ResumenMes[K] extends number ? K : never }[keyof ResumenMes];
type Fila = { etiqueta: string; valor: (r: ResumenMes) => number; signo?: boolean; moneda?: boolean };
function Grupo({ titulo, descripcion, filas, actual, anterior, nota, rotulos }: {
  titulo: string; descripcion: string; filas: Fila[]; actual: ResumenMes; anterior: ResumenMes; nota?: ReactNode; rotulos: string[];
}) {
  const val = (f: Fila, r: ResumenMes) => (f.moneda === false ? String(f.valor(r)) : pesos(f.valor(r), f.signo));
  return (
    <section className={`${TARJETA} overflow-hidden`}>
      <Encabezado titulo={titulo} descripcion={descripcion} />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4 lg:pl-5"><span className="sr-only">Concepto</span></TableHead>
            {rotulos.map((r) => <TableHead key={r} className={`${TH_MONTO} first-letter:uppercase`}>{r}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((f) => (
            <TableRow key={f.etiqueta}>
              <TableCell className={`${TD_ROTULO} text-muted-foreground`}>{f.etiqueta}</TableCell>
              <TableCell className={`${TD_MONTO} font-medium ${f.signo && f.valor(actual) !== 0 ? "text-peligro" : ""}`}>{val(f, actual)}</TableCell>
              <TableCell className={`${TD_MONTO} ${f.signo && f.valor(anterior) !== 0 ? "text-peligro" : "text-muted-foreground"}`}>{val(f, anterior)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {nota}
    </section>
  );
}

// Los cinco grupos de D39. `deudaHoy` no tiene mes anterior: es la deuda de hoy, se muestra aparte.
function construirGrupos(actual: ResumenMes, anterior: ResumenMes, deudaHoy: number) {
  const juegos = new Map<number, string>();
  for (const v of [...actual.ventas_por_juego, ...anterior.ventas_por_juego]) juegos.set(v.juego_id, v.nombre);
  // "dif" = diferencia con signo; "cuenta" = una cantidad de arqueos, no plata.
  const n = (etiqueta: string, k: NumKey, tipo?: "cuenta" | "dif"): Fila =>
    ({ etiqueta, valor: (r) => r[k], signo: tipo === "dif", moneda: tipo !== "cuenta" });
  const ventaJuego = (id: number) => (r: ResumenMes) => r.ventas_por_juego.find((v) => v.juego_id === id)?.total ?? 0;
  return [
    {
      titulo: "Ventas", descripcion: "Lo vendido en el mes, por juego",
      filas: [...juegos].map(([id, nombre]) => ({ etiqueta: nombre, valor: ventaJuego(id) }))
        .concat([{ etiqueta: "Total vendido", valor: (r: ResumenMes) => r.total_vendido }]),
    },
    { titulo: "Entradas además de ventas", descripcion: "Lo que entró a las cajas sin ser venta de juego",
      filas: [n("Cobros de fiados", "cobros_fiado"), n("Cobros de subagentes", "cobros_subagente"), n("Lo que trajo el dueño", "ingresos_del_dueno")] },
    { titulo: "Salidas", descripcion: "Lo que salió de las cajas en el mes",
      filas: [n("Premios pagados", "premios_pagados"), n("Mercado Pago / transferencia", "cobros_mercado_pago"), n("Pagos al banco", "pagos_banco"),
        n("Sueldos", "sueldos"), n("Gastos", "gastos"), n("Retiros del dueño", "retiros_dueno")] },
    {
      titulo: "Fiados", descripcion: "Lo anotado y lo cobrado en el mes",
      filas: [n("Anotado en el mes", "fiado"), n("Cobrado en el mes", "cobros_fiado")],
      nota: (
        <p className="mt-3 flex items-center justify-between border-t px-4 py-3 text-sm lg:px-5">
          <span className="text-muted-foreground">Deben hoy (todos los clientes)</span>
          <span className="monto font-medium">{pesos(deudaHoy)}</span>
        </p>
      ),
    },
    { titulo: "Arqueos", descripcion: "Hechos, cuadrados y con diferencia en el mes",
      filas: [n("Arqueos hechos", "arqueos_hechos", "cuenta"), n("Cuadran", "arqueos_cuadran", "cuenta"), n("No cuadran", "arqueos_con_diferencia", "cuenta"),
        n("Explicados después", "arqueos_explicados", "cuenta"), n("Diferencia en efectivo", "diferencia_efectivo", "dif"),
        n("Diferencia en boletas", "diferencia_boletas", "dif"), n("Diferencia total (sin explicar)", "diferencia_total", "dif")] },
  ];
}

// Una sola serie en columnas, con el chart de shadcn (Recharts). Se carga aparte (lazy): Recharts no entra al bundle inicial.
// El tooltip nunca es la única vía al dato: "Ver por día" trae la misma información en una tabla.
type DiaVenta = { fecha: string; total: number };
const GraficoVentas = lazy(async () => {
  const [R, C] = await Promise.all([import("recharts"), import("@/components/ui/chart")]);
  const eje = { fontSize: 12, fill: "var(--color-muted-foreground)" };
  return {
    default: function GraficoVentas({ dias }: { dias: DiaVenta[] }) {
      // Tres marcas redondas: 0, la mitad y el tope (1, 2 o 5 por una potencia de 10), no el máximo exacto.
      const max = Math.max(1000, ...dias.map((d) => d.total));
      const p = 10 ** Math.floor(Math.log10(max / 2));
      const paso = [1, 2, 5, 10].map((k) => k * p).find((v) => v * 2 >= max) ?? max;
      return (
        <C.ChartContainer config={{ total: { label: "Vendido", color: "var(--color-chart-1)" } }} className="mt-3 aspect-auto h-56 w-full">
          <R.BarChart data={dias} accessibilityLayer barCategoryGap={2} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <R.CartesianGrid vertical={false} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="0" />
            <R.XAxis dataKey="fecha" tickLine={false} axisLine={false} tickMargin={6} tick={eje} interval={0}
              ticks={dias.filter((_, i) => i === 0 || (i + 1) % 5 === 0).map((d) => d.fecha)} tickFormatter={(f: string) => String(Number(f.slice(-2)))} />
            <R.YAxis width={66} tickLine={false} axisLine={false} tick={eje} ticks={[0, paso, paso * 2]} domain={[0, paso * 2]}
              tickFormatter={(v: number) => pesos(v, false, true)} />
            <C.ChartTooltip cursor={{ fill: "var(--color-muted)" }} content={({ active, payload }) => {
              const d = payload?.[0]?.payload as DiaVenta | undefined;
              return active && d ? (
                <div className="rounded-lg border bg-card px-2.5 py-1.5 text-xs shadow-xs">
                  <p className="monto text-sm font-semibold">{pesos(d.total)}</p>
                  <p className="text-muted-foreground">{fechaCorta(d.fecha)}</p>
                </div>
              ) : null;
            }} />
            <R.Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </R.BarChart>
        </C.ChartContainer>
      );
    },
  };
});

// Ya sin "cuadra": esa lista solo trae lo que no cuadró o quedó explicado.
function estadoInsignia(estado: "con_diferencia" | "explicada") {
  return estado === "explicada" ? { texto: "Explicada", clase: TONOS.aviso } : { texto: "No cuadra", clase: TONOS.peligro };
}
// Ya van aparte (Ventas y Premios pagados) o son internos que el cierre del mes deja afuera (D39).
const FUERA_DE_LISTA_POR_TIPO = new Set(["apuesta_quiniela", "venta_otro_juego", "pago_premio", "traspaso", "traspaso_boletas", "rendicion_boletas"]);

export function Reportes() {
  const [mes, setMes] = useState(() => fechaHoy().slice(0, 7));
  const { desde, hasta } = rangoMes(mes);
  // Al cambiar de mes se queda el anterior, atenuado, hasta que llega el nuevo: el esqueleto es solo la primera vez.
  const cierre = useQuery({ queryKey: ["reportes-mes", mes], queryFn: () => api.reportesMes(mes), placeholderData: keepPreviousData });
  const mp = useQuery({ queryKey: ["reportes-mp"], queryFn: api.reportesMercadoPago });
  const diferencias = useQuery({ queryKey: ["reportes-diferencias", mes], queryFn: () => api.reportesDiferencias({ desde, hasta }) });
  const rendiciones = useQuery({ queryKey: ["reportes-rendiciones", mes], queryFn: () => api.reportesRendiciones({ desde, hasta }) });
  const fechaDia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual }).data?.dia.fecha ?? fechaHoy();
  const dia = useQuery({ queryKey: ["reportes-dia", fechaDia], queryFn: () => api.reportesDia(fechaDia) });
  const cajas = useQuery({ queryKey: ["cajas"], queryFn: api.cajas });
  const nombreCaja = (id: number) => cajas.data?.find((c) => c.id === id)?.nombre ?? `Caja #${id}`;
  const grupos = cierre.data ? construirGrupos(cierre.data.actual, cierre.data.anterior, cierre.data.deuda_total_hoy) : null;
  const sinCuadrar = diferencias.data?.filter((d) => d.estado !== "cuadra");
  const esteMes = mes >= fechaHoy().slice(0, 7);
  const rotulos = esteMes ? ["Este mes", "Mes anterior"] : [mesLabel(mes), mesLabel(sumarMes(mes, -1))];

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className="flex items-center justify-between lg:justify-start lg:gap-3">
        <Boton variante="secundario" size="icon" onClick={() => setMes((m) => sumarMes(m, -1))} aria-label="Mes anterior"><ChevronLeft aria-hidden /></Boton>
        <span className="text-base font-semibold first-letter:uppercase lg:min-w-44 lg:text-center lg:text-sm" aria-live="polite">{mesLabel(mes)}</span>
        <Boton variante="secundario" size="icon" onClick={() => setMes((m) => sumarMes(m, 1))} disabled={esteMes} aria-label="Mes siguiente"><ChevronRight aria-hidden /></Boton>
      </div>

      {cierre.isLoading && <div className="esqueleto h-96" />}
      {cierre.isError && (
        <Aviso tono="error" accion={<Reintentar onClick={() => cierre.refetch()} />}>No se pudo traer el cierre del mes.</Aviso>
      )}

      {grupos && cierre.data && (
        <div className={`grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-2 lg:items-start lg:gap-5 ${cierre.isPlaceholderData ? "opacity-60" : ""}`}>
          <div className="flex flex-col gap-4 lg:gap-5">
            <div className={`${TARJETA} @container grid grid-cols-2 gap-3 p-4 lg:p-5`}>
              <div><p className="rotulo text-muted-foreground">{rotulos[0]}</p><p className="monto text-[clamp(18px,6.5cqw,34px)] font-semibold">{pesos(cierre.data.actual.total_vendido)}</p></div>
              <div className="border-l pl-3"><p className="rotulo text-muted-foreground">{rotulos[1]}</p><p className="monto text-[clamp(18px,6.5cqw,34px)] font-semibold text-muted-foreground">{pesos(cierre.data.anterior.total_vendido)}</p></div>
              <p className="col-span-2 text-sm text-muted-foreground">Total vendido en el mes</p>
            </div>
            <section className={`${TARJETA} p-4 lg:p-5`}>
              <h2 className="font-medium">Ventas por día</h2>
              <p className="text-sm text-muted-foreground">Lo vendido cada día de {mesLabel(mes)}</p>
              {cierre.data.actual.total_vendido === 0 ? <p className="mt-3 text-sm text-muted-foreground">{esteMes ? "Todavía no hay ventas este mes." : `Sin ventas en ${mesLabel(mes)}.`}</p>
                : <Suspense fallback={<div className="esqueleto mt-3 h-56" />}><GraficoVentas dias={cierre.data.ventas_por_dia} /></Suspense>}
              <details className="mt-2">
                <summary className="flex min-h-11 w-fit cursor-pointer items-center text-sm font-medium underline underline-offset-4 lg:min-h-9">Ver por día</summary>
                <div className="max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="pl-0">Día</TableHead><TableHead className="pr-0 text-right">Vendido</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {cierre.data.ventas_por_dia.map((d) => (
                        <TableRow key={d.fecha}><TableCell className="pl-0">{fechaCorta(d.fecha)}</TableCell><TableCell className="monto pr-0 text-right">{pesos(d.total)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            </section>
            <MercadoPago mp={mp} />
            <CierreDia dia={dia} />
          </div>
          <div className="flex flex-col gap-4 lg:gap-5">
            {grupos.map((g) => (
              <Grupo key={g.titulo} {...g} actual={cierre.data.actual} anterior={cierre.data.anterior} rotulos={rotulos} />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
        <Lista titulo="Diferencias de arqueo" descripcion="Los arqueos del mes que no cuadraron o quedaron explicados" q={diferencias} items={sinCuadrar}
          error="No se pudieron traer las diferencias." vacio={`Sin diferencias en ${mesLabel(mes)}.`} fila={(d) => {
            const e = estadoInsignia(d.estado as "con_diferencia" | "explicada");
            return (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm lg:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{nombreCaja(d.caja_id)}</span>
                  <span className="block text-xs text-muted-foreground">{fechaCorta(d.momento.slice(0, 10))} · {hora(d.momento)}</span>
                </span>
                <span className="monto text-right text-xs text-muted-foreground">
                  <span className={`block ${d.diferencia_efectivo ? "text-peligro" : ""}`}>{pesos(d.diferencia_efectivo, true)} efectivo</span>
                  <span className={`block ${d.diferencia_boletas ? "text-peligro" : ""}`}>{pesos(d.diferencia_boletas, true)} boletas</span>
                </span>
                <span className={`${INSIGNIA} ${e.clase}`}>{e.texto}</span>
              </li>
            );
          }} />
        <Lista titulo="Lotes de rendición" descripcion="Las boletas rendidas en el mes" q={rendiciones} items={rendiciones.data}
          error="No se pudieron traer las rendiciones." vacio={`Sin lotes rendidos en ${mesLabel(mes)}.`} fila={(r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm lg:px-5">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{fechaCorta(r.fecha)}</span>
                <span className="block text-xs text-muted-foreground">{r.cantidad_boletas} boletas</span>
              </span>
              <span className={`monto text-sm ${r.diferencia ? "text-peligro" : ""}`}>{pesos(r.diferencia, true)}</span>
            </li>
          )} />
      </div>
    </div>
  );
}

// Tarjeta con una lista de renglones y sus tres estados: cargando, error con "Reintentar" y vacío.
function Lista<T>({ titulo, descripcion, q, items, error, vacio, fila }: {
  titulo: string; descripcion: string; q: UseQueryResult<unknown>; items?: T[]; error: string; vacio: string; fila: (x: T) => ReactNode;
}) {
  return (
    <section className={`${TARJETA} overflow-hidden`}>
      <Encabezado titulo={titulo} descripcion={descripcion} />
      {q.isLoading && <div className="esqueleto m-4 h-24" />}
      {q.isError && <div className="p-4"><Aviso tono="error" accion={<Reintentar onClick={() => q.refetch()} />}>{error}</Aviso></div>}
      {items?.length === 0 && <p className="px-4 pb-4 text-sm text-muted-foreground lg:px-5">{vacio}</p>}
      {!!items?.length && <ul className="divide-y">{items.map(fila)}</ul>}
    </section>
  );
}

function MercadoPago({ mp }: { mp: UseQueryResult<ReporteMercadoPago> }) {
  return (
    <section className={`${TARJETA} p-4 lg:p-5`}>
      <h2 className="font-medium">Mercado Pago acumulado</h2>
      <p className="text-sm text-muted-foreground">Lo cobrado por MP o transferencia desde el último ingreso del dueño</p>
      {mp.isLoading && <div className="esqueleto mt-3 h-12" />}
      {mp.isError && <div className="mt-3"><Aviso tono="error" accion={<Reintentar onClick={() => mp.refetch()} />}>No se pudo traer Mercado Pago.</Aviso></div>}
      {mp.data && (
        <div className="mt-3">
          <p className="monto text-2xl font-semibold">{pesos(mp.data.acumulado)}</p>
          <p className="text-xs text-muted-foreground">{mp.data.desde ? `Desde ${fechaHoraCorta(mp.data.desde)}` : "Todavía no hubo ingresos del dueño"}</p>
        </div>
      )}
    </section>
  );
}

function CierreDia({ dia }: { dia: UseQueryResult<ReporteDia> }) {
  const Renglon = ({ etiqueta, children }: { etiqueta: string; children: ReactNode }) => (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="monto font-medium">{children}</span>
    </li>
  );
  return (
    <section className={`${TARJETA} p-4 lg:p-5`}>
      <h2 className="font-medium">Cierre del día</h2>
      <p className="text-sm text-muted-foreground">Lo movido hoy, sin anulados</p>
      {dia.isLoading && <div className="esqueleto mt-3 h-40" />}
      {dia.isError && <div className="mt-3"><Aviso tono="error" accion={<Reintentar onClick={() => dia.refetch()} />}>No se pudo traer el cierre del día.</Aviso></div>}
      {dia.data && (
        <ul className="mt-3 divide-y text-sm">
          <Renglon etiqueta="Ventas">{pesos(dia.data.apuestas)}</Renglon>
          <Renglon etiqueta="Premios pagados">{pesos(dia.data.boletas)}</Renglon>
          {Object.entries(dia.data.totales_por_tipo).filter(([tipo]) => !FUERA_DE_LISTA_POR_TIPO.has(tipo)).map(([tipo, monto]) => (
            <Renglon key={tipo} etiqueta={TIPOS[tipo as MovimientoOut["tipo"]]?.etiqueta ?? tipo}>{pesos(monto)}</Renglon>
          ))}
          <Renglon etiqueta="Arqueos: cuadran / no cuadran">
            {dia.data.arqueos.filter((a) => a.estado === "cuadra").length} / {dia.data.arqueos.filter((a) => a.estado === "con_diferencia").length}
          </Renglon>
        </ul>
      )}
    </section>
  );
}
