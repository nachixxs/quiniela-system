import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { api, ApiError } from "../api/cliente";
import type { MovimientoOut } from "../api/tipos";
import { pesos, useEscritorio } from "../util";
import { Aviso, Boton, FILA, hora, Hoja, INSIGNIA, Reintentar, TARJETA, TIPOS, TONOS } from "../ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

// D41: cliente_nombre puede venir null aunque haya cliente_id; en ese caso no se inventa texto.
const quien = (m: MovimientoOut) => m.contraparte ?? m.cliente_nombre ?? null;
// Espejo de TIPOS_CARGA (app/operaciones.py:16): lo que el backend rechaza con tipo_no_anulable.
const NO_ANULABLE = new Set<MovimientoOut["tipo"]>(["apuesta_quiniela", "venta_otro_juego", "traspaso", "traspaso_boletas", "rendicion_boletas"]);
// DESIGN §6: entra plata = "+" en exito, sale = "−" en peligro; premio y traspasos van sin signo.
const ENTRA = new Set<MovimientoOut["tipo"]>(["cobro_fiado", "cobro_subagente", "ingreso_del_dueno", "apuesta_quiniela", "venta_otro_juego"]);
const SALE = new Set<MovimientoOut["tipo"]>(["fiado", "cobro_mercado_pago", "retiro_dueno", "gasto", "pago_banco", "sueldo"]);

// Hoja de confirmación: qué se anula y a quién, el motivo (obligatorio) y el botón sin vuelta atrás.
function HojaAnular({ mov, onCerrar }: { mov: MovimientoOut; onCerrar: () => void }) {
  const [motivo, setMotivo] = useState("");
  const t = TIPOS[mov.tipo];
  const nombre = quien(mov);
  const anular = useMutation({
    mutationFn: () => api.anular(mov.id, motivo.trim()),
    onSuccess: () => {
      toast.success(`Anulado: ${t.etiqueta} · ${pesos(mov.monto)}${nombre ? ` · ${nombre}` : ""}`);
      onCerrar();
    },
  });

  return (
    <Hoja titulo="Anular movimiento" descripcion="Queda un contra-asiento con el motivo: no se puede deshacer." onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); if (motivo.trim()) anular.mutate(); }} className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-lg border px-4 py-3">
          <t.icono className={`mt-0.5 size-4 shrink-0 ${t.tono}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t.etiqueta} <span className="monto font-normal text-muted-foreground">{hora(mov.creado_en)}</span></p>
            {nombre && <p className="break-words text-sm text-muted-foreground">{nombre}</p>}
          </div>
          <span className="monto text-sm font-medium">{pesos(mov.monto)}</span>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="motivo-anulacion">Motivo</Label>
          <Textarea id="motivo-anulacion" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Por qué se anula…" autoFocus />
        </div>

        {anular.isError && <Aviso tono="error">{anular.error instanceof ApiError ? anular.error.detalle : "No se pudo anular."}</Aviso>}

        <div>
          <div className="flex flex-col-reverse gap-2 lg:flex-row lg:justify-end">
            <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
            <Boton type="submit" cargando={anular.isPending} disabled={!motivo.trim()}>{anular.isPending ? "Anulando…" : "Anular movimiento"}</Boton>
          </div>
          {!motivo.trim() && <p className="mt-2 text-sm text-muted-foreground lg:text-right">Escribí el motivo para poder anular.</p>}
        </div>
      </form>
    </Hoja>
  );
}

const BotonAnular = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="presiona -my-1 h-11 shrink-0 rounded-md px-2 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground lg:my-0 lg:h-8">
    Anular
  </button>
);
const TH = "h-9 text-xs font-medium text-muted-foreground";

// Movimientos de hoy (D31, D95): los últimos 4 y "Ver todos" despliega la lista entera, con anular.
export function TarjetaMovimientos() {
  const [aAnular, setAAnular] = useState<MovimientoOut | null>(null);
  const [todos, setTodos] = useState(false);
  const escritorio = useEscritorio();
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const fecha = dia.data?.dia.fecha;
  const movimientos = useQuery({
    queryKey: ["movimientos", fecha],
    queryFn: () => api.movimientos({ desde: fecha!, hasta: fecha! }),
    enabled: !!fecha,
  });

  const items = movimientos.data ? [...movimientos.data.items].sort((a, b) => b.creado_en.localeCompare(a.creado_en)) : undefined;
  const anulados = new Set(items?.filter((m) => m.anula_id !== null).map((m) => m.anula_id));
  const cargando = dia.isLoading || (dia.isSuccess && movimientos.isLoading);
  const error = dia.isError || movimientos.isError;

  const filas = (todos ? items : items?.slice(0, 4))?.map((mov) => {
    const t = TIPOS[mov.tipo];
    const anulado = anulados.has(mov.id);
    const contra = mov.anula_id !== null;
    const dir = (ENTRA.has(mov.tipo) ? 1 : SALE.has(mov.tipo) ? -1 : 0) * (contra ? -1 : 1);
    const detalle = [quien(mov), contra && `Anula #${mov.anula_id}`, mov.motivo_anulacion].filter(Boolean).join(" · ");
    return {
      mov, t, anulado, detalle, hora: hora(mov.creado_en), etiqueta: contra ? `Anulación · ${t.etiqueta}` : t.etiqueta,
      monto: dir ? `${dir > 0 ? "+" : "−"}${pesos(mov.monto)}` : pesos(mov.monto),
      color: anulado ? "text-muted-foreground line-through" : dir > 0 ? "text-exito" : dir < 0 ? "text-peligro" : "",
      anular: !anulado && !contra && !NO_ANULABLE.has(mov.tipo) ? () => setAAnular(mov) : null,
    };
  });
  const Anulado = <span className={`${INSIGNIA} ${TONOS.neutro}`}>Anulado</span>;

  return (
    <section className={`${TARJETA} overflow-hidden`} aria-labelledby="movimientos-hoy">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 lg:px-5 lg:pt-5">
        <h2 id="movimientos-hoy" className="font-semibold">Movimientos de hoy</h2>
        {items && items.length > 4 && (
          <Button type="button" variant="link" size="sm" onClick={() => setTodos(!todos)} className="-my-2 px-2">{todos ? "Ver menos" : "Ver todos"}</Button>
        )}
      </div>

      {cargando && <div className="esqueleto m-4 h-40" />}
      {error && (
        <div className="p-4">
          <Aviso tono="error" accion={<Reintentar onClick={() => (dia.isError ? dia.refetch() : movimientos.refetch())} />}>
            No se pudieron traer los movimientos.
          </Aviso>
        </div>
      )}
      {items?.length === 0 && <p className="border-t px-4 py-8 text-center text-sm text-muted-foreground">Sin movimientos hoy. Los que cargues aparecen acá.</p>}

      {filas && filas.length > 0 && (escritorio ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${TH} w-20 pl-5`}>Hora</TableHead>
              <TableHead className={TH}>Tipo</TableHead>
              <TableHead className={TH}>Detalle</TableHead>
              <TableHead className={`${TH} text-right`}>Monto</TableHead>
              <TableHead className={`${TH} w-20 pr-5`}><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => (
              <TableRow key={f.mov.id} className="h-12">
                <TableCell className="monto pl-5 text-xs text-muted-foreground">{f.hora}</TableCell>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <f.t.icono className={`size-4 ${f.t.tono}`} aria-hidden />
                    <span className={f.anulado ? "text-muted-foreground line-through" : ""}>{f.etiqueta}</span>
                    {f.anulado && Anulado}
                  </span>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{f.detalle}</TableCell>
                <TableCell className={`monto text-right font-medium ${f.color}`}>{f.monto}</TableCell>
                <TableCell className="pr-5 text-right">{f.anular && <BotonAnular onClick={f.anular} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <ul className="divide-y border-t">
          {filas.map((f) => (
            <li key={f.mov.id} className={FILA}>
              <span className="monto w-11 shrink-0 text-xs text-muted-foreground">{f.hora}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start gap-2">
                  <f.t.icono className={`mt-0.5 size-4 shrink-0 ${f.t.tono}`} aria-hidden />
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`text-sm font-medium ${f.anulado ? "text-muted-foreground line-through" : ""}`}>{f.etiqueta}</span>
                    {f.anulado && Anulado}
                  </span>
                </span>
                {f.detalle && <span className="mt-0.5 block break-words text-xs text-muted-foreground">{f.detalle}</span>}
              </span>
              <span className={`monto text-sm font-medium ${f.color}`}>{f.monto}</span>
              {f.anular && <BotonAnular onClick={f.anular} />}
            </li>
          ))}
        </ul>
      ))}

      <AnimatePresence>{aAnular && <HojaAnular key={aAnular.id} mov={aAnular} onCerrar={() => setAAnular(null)} />}</AnimatePresence>
    </section>
  );
}
