// Piezas del formulario de Arqueo que comparten las tres direcciones (el sistema es fijo; cambia la estructura).
import { Info, Landmark, Store } from "lucide-react";
import { Aviso, Boton, OPCION, PUNTO_RADIO, Segmentado } from "../src/ui";
import { CAJAS, PENDIENTES, TURNOS } from "./datos";
import type { useArqueo } from "./comun";

type A = ReturnType<typeof useArqueo>;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const turnoDe = (id: number) => TURNOS.find((t) => t.id === id)!;

export function OpcionesCaja({ a }: { a: A }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Caja</legend>
      <div className="grid grid-cols-2 gap-3">
        {CAJAS.map((c) => {
          const Icono = c.tipo === "operativa" ? Store : Landmark;
          const pend = PENDIENTES.find((p) => p.caja_id === c.id);
          return (
            <label key={c.id} className={`${OPCION} min-h-[84px] items-start p-4`}>
              <input type="radio" name="caja" className="sr-only" checked={c.id === a.cajaId} onChange={() => a.elegirCaja(c.id)} />
              <span className="flex-1">
                <Icono className="size-5 text-muted-foreground transition-colors group-has-[:checked]:text-foreground" aria-hidden />
                <span className="mt-2 block text-sm font-medium">{c.nombre}</span>
                <span className="block text-xs text-muted-foreground">{pend ? `Pendiente: ${turnoDe(pend.turno_id).nombre}` : "Sin pendientes"}</span>
              </span>
              {PUNTO_RADIO}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// La grande acepta cualquier turno (D5); la chica solo el abierto. Nada de "abierto" crudo ni "Noche" marcada por defecto.
export function Turno({ a }: { a: A }) {
  const opciones = TURNOS.map((t) => ({
    valor: t.id, texto: cap(t.nombre), deshabilitada: a.caja?.tipo === "operativa" && t.estado !== "abierto",
    detalle: PENDIENTES.some((p) => p.caja_id === a.cajaId && p.turno_id === t.id) ? "Arqueo pendiente" : cap(t.estado),
  }));
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Turno</p>
      <Segmentado etiqueta="Turno" valor={a.turnoId} onCambio={a.elegirTurno} opciones={opciones} />
    </div>
  );
}

export const AvisoTicket = ({ a }: { a: A }) => a.sinTicket && a.turno ? (
  <Aviso tono="aviso">
    <p>El turno {a.turno.nombre} todavía no tiene el ticket cargado: sin él, la caja chica no se puede arquear.</p>
    <button type="button" className="presiona mt-2 h-11 rounded-md border bg-card px-3 font-medium shadow-xs hover:bg-muted lg:h-9">Cargar ticket</button>
  </Aviso>
) : null;

// El botón bloqueado dice qué falta (DESIGN §2).
export const Pie = ({ a }: { a: A }) => (
  <div>
    <Boton type="submit" disabled={!!a.bloqueo} className="h-12 w-full text-base lg:h-10 lg:text-sm">Arquear</Boton>
    <p aria-live="polite" className="mt-3 flex items-start justify-center gap-1.5 text-center text-sm text-muted-foreground empty:hidden">
      {a.bloqueo && <><Info className="mt-0.5 size-4 shrink-0" aria-hidden />{a.bloqueo}</>}
    </p>
  </div>
);
