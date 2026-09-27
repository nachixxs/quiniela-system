import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { api, ApiError } from "../api/cliente";
import type { RendicionOut, Saldo, TicketOut, TurnoOut } from "../api/tipos";
import { fechaLarga, pesos } from "../util";
import { Aviso, Boton, CampoMonto, Hoja, TARJETA } from "../ui";

const BOTON = "h-12 w-full text-base lg:h-10 lg:text-sm";

// Aviso repetido en las pantallas que necesitan un día abierto para actuar (D3, §3).
export function AvisoAbrirDia() {
  return (
    <Aviso tono="aviso">
      Todavía no se abrió el día. <a href="#" className="font-medium underline underline-offset-4">Abrilo desde Inicio</a>.
    </Aviso>
  );
}

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
      {abrir.isError && <Aviso tono="error">{abrir.error instanceof ApiError ? abrir.error.detalle : "No se pudo abrir el día."}</Aviso>}
      <Boton type="button" cargando={abrir.isPending} onClick={() => abrir.mutate()} className="h-12 px-6 text-base lg:h-10 lg:text-sm">
        {abrir.isPending ? "Abriendo…" : cerrado ? "Abrir el día siguiente" : "Abrir el día"}
      </Boton>
    </section>
  );
}

const DESGLOSE_ETIQUETAS: [keyof TicketOut["desglose"], string][] = [
  ["quiniela", "Quiniela"], ["otros_juegos", "Otros juegos"], ["cobros", "Cobros"], ["fiados", "Fiados"],
  ["mercado_pago", "MP / transferencia"], ["premios", "Premios"], ["otros_pagos", "Otros pagos"],
];

// Carga del ticket de la terminal (§8.2): la quiniela va aparte (D20) y un campo por cada otro juego.
// El ticket es acumulado del día (D17): se carga tal cual lo imprime la terminal, sin restar nada a mano.
function HojaTicket({ turno, onCerrar }: { turno: TurnoOut; onCerrar: () => void }) {
  const [quiniela, setQuiniela] = useState("");
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [resultado, setResultado] = useState<TicketOut | null>(null);
  const juegos = useQuery({ queryKey: ["juegos"], queryFn: api.juegos });

  const guardar = useMutation({
    mutationFn: () => api.cargarTicket(turno.id, {
      quiniela: Number(quiniela),
      juegos: (juegos.data ?? []).map((j) => ({ juego_id: j.id, monto: Number(montos[j.id] || 0) })),
    }),
    onSuccess: setResultado,
  });

  if (resultado) {
    return (
      <Hoja titulo="Ticket cargado" descripcion={`Turno ${turno.nombre}`} onCerrar={onCerrar}>
        <div className="flex flex-col gap-4">
          <div>
            <p className="rotulo text-muted-foreground">Esperado en caja chica</p>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <span>Efectivo <span className="monto font-medium">{pesos(resultado.esperado.efectivo)}</span></span>
              <span>Boletas <span className="monto font-medium">{pesos(resultado.esperado.boletas)}</span></span>
            </div>
          </div>
          <ul className="divide-y text-sm">
            {DESGLOSE_ETIQUETAS.map(([clave, etiqueta]) => (
              <li key={clave} className="flex justify-between py-1.5">
                <span className="text-muted-foreground">{etiqueta}</span>
                <span className="monto">{pesos(resultado.desglose[clave])}</span>
              </li>
            ))}
          </ul>
          <Boton type="button" onClick={onCerrar} className={BOTON}>Listo</Boton>
        </div>
      </Hoja>
    );
  }

  // Si la lista de juegos no cargó, no se guarda: mandaría el ticket sin las ventas de esos juegos.
  const listo = Number(quiniela) > 0 && juegos.isSuccess;
  return (
    <Hoja titulo="Cargar ticket" descripcion={`Turno ${turno.nombre} · acumulado del día, tal cual lo imprime la terminal`} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); if (listo) guardar.mutate(); }} className="flex flex-col gap-4">
        <CampoMonto etiqueta="Quiniela" valor={quiniela} onValor={setQuiniela} autoFocus />
        {juegos.isLoading && <div className="esqueleto h-12" />}
        {juegos.isError && <Aviso tono="error">No se pudieron traer los juegos. Cerrá y volvé a intentar.</Aviso>}
        {juegos.data?.map((j) => (
          <CampoMonto key={j.id} etiqueta={j.nombre} valor={montos[j.id] ?? ""} onValor={(v) => setMontos((m) => ({ ...m, [j.id]: v }))} />
        ))}
        {guardar.isError && <Aviso tono="error">{guardar.error instanceof ApiError ? guardar.error.detalle : "No se pudo cargar el ticket."}</Aviso>}
        <Boton type="submit" cargando={guardar.isPending} disabled={!listo} className={BOTON}>
          {guardar.isPending ? "Guardando…" : "Guardar ticket"}
        </Boton>
      </form>
    </Hoja>
  );
}

// Traspaso (D9): sube a la caja grande lo contado en el último arqueo de la chica. Sin montos a elegir.
function HojaTraspaso({ cajaId, onCerrar }: { cajaId: number; onCerrar: () => void }) {
  const [movido, setMovido] = useState<Saldo | null>(null);
  // Saldo actual de la caja chica (después del arqueo, lo contado): lo que se va a mover.
  const cajas = useQuery({ queryKey: ["cajas"], queryFn: api.cajas });
  const caja = cajas.data?.find((c) => c.id === cajaId);
  const hacer = useMutation({
    mutationFn: () => api.traspaso({ caja_origen_id: cajaId }),
    onSuccess: setMovido,
  });

  return (
    <Hoja titulo="Traspaso a caja grande" descripcion="Sube lo contado en el último arqueo de la caja chica." onCerrar={onCerrar}>
      <div className="flex flex-col gap-4">
        {movido ? (
          <p className="text-sm">Se movieron <span className="monto font-medium">{pesos(movido.efectivo)}</span> en efectivo y <span className="monto font-medium">{pesos(movido.boletas)}</span> en boletas.</p>
        ) : caja ? (
          <p className="text-sm text-muted-foreground">Se mueven <span className="monto font-medium text-foreground">{pesos(caja.efectivo)}</span> en efectivo y <span className="monto font-medium text-foreground">{pesos(caja.boletas)}</span> en boletas a la caja grande.</p>
        ) : (
          <div className="esqueleto h-5" />
        )}
        {hacer.isError && <Aviso tono="error">{hacer.error instanceof ApiError ? hacer.error.detalle : "No se pudo traspasar."}</Aviso>}
        <Boton type="button" cargando={hacer.isPending} onClick={() => (movido ? onCerrar() : hacer.mutate())} className={BOTON}>
          {movido ? "Listo" : hacer.isPending ? "Traspasando…" : "Confirmar traspaso"}
        </Boton>
      </div>
    </Hoja>
  );
}

// Rendición (§8.4): boletas contadas contra arqueo de anoche + traspaso; deja las boletas en cero.
function HojaRendicion({ onCerrar }: { onCerrar: () => void }) {
  const [monto, setMonto] = useState("");
  const [lote, setLote] = useState<RendicionOut | null>(null);
  const guardar = useMutation({
    mutationFn: () => api.rendicion({ boletas_contadas: Number(monto) }),
    onSuccess: setLote,
  });

  if (lote) {
    return (
      <Hoja titulo="Rendición guardada" descripcion="Boletas archivadas: quedan en cero." onCerrar={onCerrar}>
        <div className="flex flex-col gap-3 text-sm">
          <span>Esperado <span className="monto font-medium">{pesos(lote.total_esperado)}</span></span>
          <span>Contado <span className="monto font-medium">{pesos(lote.total_contado)}</span></span>
          <span>Diferencia <span className={`monto font-medium ${lote.diferencia ? "text-peligro" : ""}`}>{pesos(lote.diferencia, true)}</span></span>
          <span>Boletas del lote <span className="monto font-medium">{lote.cantidad_boletas}</span></span>
          <Boton type="button" onClick={onCerrar} className={BOTON}>Listo</Boton>
        </div>
      </Hoja>
    );
  }

  return (
    <Hoja titulo="Rendición" descripcion="Contá las boletas de ayer para archivarlas." onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); if (monto) guardar.mutate(); }} className="flex flex-col gap-4">
        <CampoMonto etiqueta="Boletas contadas" valor={monto} onValor={setMonto} autoFocus />
        {guardar.isError && <Aviso tono="error">{guardar.error instanceof ApiError ? guardar.error.detalle : "No se pudo rendir."}</Aviso>}
        <Boton type="submit" cargando={guardar.isPending} disabled={!monto} className={BOTON}>
          {guardar.isPending ? "Guardando…" : "Guardar rendición"}
        </Boton>
      </form>
    </Hoja>
  );
}

// Cierre del día (§7.8, §8): sin vuelta atrás, se lo dice antes de confirmar.
function HojaCerrarDia({ diaId, onCerrar }: { diaId: number; onCerrar: () => void }) {
  const cerrar = useMutation({ mutationFn: () => api.cerrarDia(diaId), onSuccess: onCerrar });
  return (
    <Hoja titulo="Cerrar el día" descripcion="Un día cerrado no se reabre: las cargas tardías quedan como ajuste (§7.8)." onCerrar={onCerrar}>
      <div className="flex flex-col gap-4">
        {cerrar.isError && <Aviso tono="error">{cerrar.error instanceof ApiError ? cerrar.error.detalle : "No se pudo cerrar el día."}</Aviso>}
        <Boton type="button" cargando={cerrar.isPending} onClick={() => cerrar.mutate()} className={BOTON}>
          {cerrar.isPending ? "Cerrando…" : "Cerrar el día"}
        </Boton>
      </div>
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
