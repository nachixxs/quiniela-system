import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { api, ApiError } from "../api/cliente";
import type { RendicionOut, TurnoOut } from "../api/tipos";
import { fechaLarga, pesos } from "../util";
import { Aviso, Boton, CampoMonto, Hoja, Reintentar, TARJETA } from "../ui";

// Qué falta, escrito debajo del botón deshabilitado (caso 8). Sin motivo no se muestra nada.
const Motivo = ({ children }: { children?: string | false }) => children ? <p className="mt-2 text-center text-sm text-muted-foreground">{children}</p> : null;
const detalleError = (e: unknown, defecto: string) => (e instanceof ApiError ? e.detalle : defecto);

// Tarjeta de Inicio cuando no hay día abierto (§3): sin ella no hay turnos, cajas ni nada que cargar.
// `cerrado` llega cuando el día actual existe pero ya se cerró: se ofrece abrir el siguiente.
export function TarjetaAbrirDia({ cerrado }: { cerrado?: { fecha: string } }) {
  const abrir = useMutation({ mutationFn: api.abrirDia });
  return (
    <section className={`${TARJETA} flex flex-col items-center gap-3 p-8 text-center`}>
      <h2 className="text-lg font-semibold tracking-tight">
        {cerrado ? `El día ${fechaLarga(cerrado.fecha)} está cerrado` : "Todavía no se abrió el día"}
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {cerrado ? "Abrí el día siguiente para crear sus turnos y empezar a cargar movimientos." : "Abrí el día para crear los turnos de mañana y noche y empezar a cargar movimientos."}
      </p>
      {abrir.isError && <Aviso tono="error">{detalleError(abrir.error, "No se pudo abrir el día.")}</Aviso>}
      <Boton type="button" size="lg" cargando={abrir.isPending} onClick={() => abrir.mutate()} className="px-6">
        {abrir.isPending ? "Abriendo…" : cerrado ? "Abrir el día siguiente" : "Abrir el día"}
      </Boton>
    </section>
  );
}

// Carga del ticket de la terminal (§8.2): la quiniela va aparte (D20) y un campo por cada otro juego.
// El ticket es acumulado del día (D17): se carga tal cual lo imprime la terminal, sin restar nada a mano.
// D97: avisa con un toast con la quiniela tipeada y se cierra; el esperado se ve recién en el arqueo.
function HojaTicket({ turno, onCerrar }: { turno: TurnoOut; onCerrar: () => void }) {
  const [quiniela, setQuiniela] = useState("");
  const [montos, setMontos] = useState<Record<number, string>>({});
  const juegos = useQuery({ queryKey: ["juegos"], queryFn: api.juegos });

  const guardar = useMutation({
    mutationFn: () => api.cargarTicket(turno.id, {
      quiniela: Number(quiniela),
      juegos: (juegos.data ?? []).map((j) => ({ juego_id: j.id, monto: Number(montos[j.id] || 0) })),
    }),
    onSuccess: () => {
      toast.success(`Ticket del turno ${turno.nombre}: quiniela ${pesos(Number(quiniela))}`);
      onCerrar();
    },
  });

  // Si la lista de juegos no cargó, no se guarda: mandaría el ticket sin las ventas de esos juegos.
  const falta = Number(quiniela) <= 0 ? "Falta la quiniela: escribí el total que imprime la terminal." : juegos.isLoading ? "Cargando los juegos…" : juegos.isError && "Falta traer los juegos: tocá Reintentar.";
  const listo = !falta && juegos.isSuccess;
  return (
    <Hoja titulo="Cargar ticket" descripcion={`Turno ${turno.nombre} · acumulado del día, tal cual lo imprime la terminal`} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); if (listo) guardar.mutate(); }} className="grid grid-cols-2 gap-x-3 gap-y-4">
        <div className="col-span-2"><CampoMonto etiqueta="Quiniela" valor={quiniela} onValor={setQuiniela} autoFocus /></div>
        {juegos.isLoading && <div className="esqueleto col-span-2 h-12" />}
        {juegos.isError && <div className="col-span-2"><Aviso tono="error" accion={<Reintentar onClick={() => juegos.refetch()} />}>No se pudieron traer los juegos.</Aviso></div>}
        {juegos.data?.map((j) => (
          <div key={j.id} className={j.nombre === "Telekino" ? "col-span-2" : undefined}>
            <CampoMonto etiqueta={j.nombre === "Telekino" ? `${j.nombre} (lo vendido en este turno)` : j.nombre} valor={montos[j.id] ?? ""} onValor={(v) => setMontos((m) => ({ ...m, [j.id]: v }))} />
          </div>
        ))}
        {guardar.isError && <div className="col-span-2"><Aviso tono="error">{detalleError(guardar.error, "No se pudo cargar el ticket.")}</Aviso></div>}
        <div className="col-span-2">
          <Boton type="submit" size="lg" cargando={guardar.isPending} disabled={!listo} className="w-full">
            {guardar.isPending ? "Guardando…" : "Guardar ticket"}
          </Boton>
          <Motivo>{falta}</Motivo>
        </div>
      </form>
    </Hoja>
  );
}

// Traspaso (D9, D65): sin monto sube lo contado en el último arqueo; con monto mueve ese efectivo a mitad de turno.
// D27: con la chica sin ticket (esperado nulo) su efectivo es parcial y no se muestra nunca.
function HojaTraspaso({ cajaId, onCerrar }: { cajaId: number; onCerrar: () => void }) {
  const [monto, setMonto] = useState("");
  const conMonto = Number(monto) > 0;
  const cero = monto !== "" && !conMonto;
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const hayArqueo = !!dia.data?.turnos.some((t) => t.estado === "cerrado");
  // Solo para saber si la chica tiene ticket.
  const cajas = useQuery({ queryKey: ["cajas"], queryFn: api.cajas });
  const caja = cajas.data?.find((c) => c.id === cajaId);
  const hacer = useMutation({
    mutationFn: () => api.traspaso({ caja_origen_id: cajaId, monto: conMonto ? Number(monto) : null }),
    onSuccess: (s) => {
      toast.success(`Traspaso a la caja grande: ${pesos(s.efectivo)} en efectivo${s.boletas ? ` y ${pesos(s.boletas)} en boletas` : ""}`);
      onCerrar();
    },
  });
  const falta = cero ? "El monto tiene que ser mayor a cero" : !conMonto && !hayArqueo && "Falta el monto: escribí cuánto efectivo pasás (todavía no hay un arqueo del que subir lo contado).";
  const fuerte = "monto font-medium text-foreground";

  return (
    <Hoja titulo="Traspaso a caja grande" descripcion="Sin monto sube lo contado en el último arqueo; con monto mueve ese efectivo ahora." onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); if (!falta) hacer.mutate(); }} className="flex flex-col gap-4">
        <CampoMonto etiqueta={hayArqueo ? "Monto (opcional)" : "Monto"} valor={monto} onValor={setMonto} autoFocus />
        {conMonto ? (
          <p className="text-sm text-muted-foreground">Se mueven <span className={fuerte}>{pesos(Number(monto))}</span> en efectivo a la caja grande.</p>
        ) : cero ? null : !caja ? (
          <div className="esqueleto h-5" />
        ) : hayArqueo ? (
          <p className="text-sm text-muted-foreground">Se sube lo contado en el último arqueo.</p>
        ) : !caja.esperado && (
          <p className="text-sm text-muted-foreground">La caja chica todavía no tiene el ticket del turno, así que su efectivo no se conoce.</p>
        )}
        {hacer.isError && <Aviso tono="error">{detalleError(hacer.error, "No se pudo traspasar.")}</Aviso>}
        <div>
          <Boton type="submit" size="lg" cargando={hacer.isPending} disabled={!!falta} className="w-full">
            {hacer.isPending ? "Traspasando…" : "Confirmar traspaso"}
          </Boton>
          <Motivo>{falta}</Motivo>
        </div>
      </form>
    </Hoja>
  );
}

// Rendición (§8.4): boletas contadas contra arqueo de anoche + traspaso; deja las boletas en cero.
// Conserva su pantalla de resultado (D97): muestra una diferencia de plata.
function HojaRendicion({ onCerrar }: { onCerrar: () => void }) {
  const [monto, setMonto] = useState("");
  const [lote, setLote] = useState<RendicionOut | null>(null);
  const guardar = useMutation({
    mutationFn: () => api.rendicion({ boletas_contadas: Number(monto) }),
    onSuccess: setLote,
  });

  if (lote) {
    const filas: [string, string, string?][] = [
      ["Esperado", pesos(lote.total_esperado)], ["Contado", pesos(lote.total_contado)],
      ["Diferencia", pesos(lote.diferencia, true), lote.diferencia ? "text-peligro" : undefined],
      ["Boletas del lote", String(lote.cantidad_boletas)],
    ];
    return (
      <Hoja titulo="Rendición guardada" descripcion="Boletas archivadas: quedan en cero." onCerrar={onCerrar}>
        <div className="flex flex-col gap-4">
          <dl className="divide-y text-sm">
            {filas.map(([rotulo, valor, clase]) => (
              <div key={rotulo} className="flex justify-between py-2"><dt className="text-muted-foreground">{rotulo}</dt><dd className={`monto font-medium ${clase ?? ""}`}>{valor}</dd></div>
            ))}
          </dl>
          <Boton type="button" size="lg" onClick={onCerrar} className="w-full">Listo</Boton>
        </div>
      </Hoja>
    );
  }

  return (
    <Hoja titulo="Rendición" descripcion="Contá las boletas de ayer para archivarlas." onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); if (monto) guardar.mutate(); }} className="flex flex-col gap-4">
        <CampoMonto etiqueta="Boletas contadas" valor={monto} onValor={setMonto} autoFocus />
        {guardar.isError && <Aviso tono="error">{detalleError(guardar.error, "No se pudo rendir.")}</Aviso>}
        <div>
          <Boton type="submit" size="lg" cargando={guardar.isPending} disabled={!monto} className="w-full">
            {guardar.isPending ? "Guardando…" : "Guardar rendición"}
          </Boton>
          <Motivo>{!monto && "Falta el total: contá las boletas de ayer y escribilo."}</Motivo>
        </div>
      </form>
    </Hoja>
  );
}

// Cierre del día (§7.8, §8): sin vuelta atrás, se lo dice antes de confirmar y se puede cancelar.
function HojaCerrarDia({ diaId, onCerrar }: { diaId: number; onCerrar: () => void }) {
  const cerrar = useMutation({
    mutationFn: () => api.cerrarDia(diaId),
    onSuccess: () => { toast.success("Día cerrado."); onCerrar(); },
  });
  return (
    <Hoja titulo="Cerrar el día" descripcion="Un día cerrado no se reabre. Si después aparece algo olvidado, se carga como ajuste con su fecha real." onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); cerrar.mutate(); }} className="flex flex-col gap-4">
        {cerrar.isError && <Aviso tono="error">{detalleError(cerrar.error, "No se pudo cerrar el día.")}</Aviso>}
        <div className="flex flex-col-reverse gap-2 lg:flex-row lg:justify-end">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={cerrar.isPending}>{cerrar.isPending ? "Cerrando…" : "Cerrar el día"}</Boton>
        </div>
      </form>
    </Hoja>
  );
}

export type AccionDia =
  | { tipo: "ticket"; turno: TurnoOut }
  | { tipo: "traspaso"; cajaId: number }
  | { tipo: "rendicion" }
  | { tipo: "cerrar"; diaId: number };

// Punto único de montaje de las hojas del circuito del día: lo usan Inicio y Arqueo.
export function AccionesDia({ accion, onCerrar }: { accion: AccionDia | null; onCerrar: () => void }) {
  return (
    <AnimatePresence>
      {accion?.tipo === "ticket" && <HojaTicket key="ticket" turno={accion.turno} onCerrar={onCerrar} />}
      {accion?.tipo === "traspaso" && <HojaTraspaso key="traspaso" cajaId={accion.cajaId} onCerrar={onCerrar} />}
      {accion?.tipo === "rendicion" && <HojaRendicion key="rendicion" onCerrar={onCerrar} />}
      {accion?.tipo === "cerrar" && <HojaCerrarDia key="cerrar" diaId={accion.diaId} onCerrar={onCerrar} />}
    </AnimatePresence>
  );
}
