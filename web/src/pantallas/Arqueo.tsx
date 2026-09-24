import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../api/cliente";
import type { ArqueoOut } from "../api/tipos";
import { pesos, type Tema } from "../util";
import { BotonPrimario, Encabezado } from "../ui";

export function Arqueo({ onVolver, tema, onTema }: { onVolver: () => void; tema: Tema; onTema: () => void }) {
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const [cajaId, setCajaId] = useState<number | null>(null);
  const [turnoId, setTurnoId] = useState<number | null>(null);
  const [efectivo, setEfectivo] = useState("");
  const [boletas, setBoletas] = useState("");
  const [resultado, setResultado] = useState<ArqueoOut | null>(null);

  const guardar = useMutation({
    mutationFn: () => api.arqueo({
      caja_id: cajaId!, turno_id: turnoId!,
      efectivo_contado: Number(efectivo), boletas_contadas: Number(boletas),
    }),
    onSuccess: setResultado,
  });

  const cajas = dia.data?.cajas ?? [];
  const turnos = dia.data?.turnos ?? [];

  return (
    <div className="entrada mx-auto min-h-screen max-w-md bg-fondo px-4 pb-10 pt-6 lg:max-w-lg">
      <Encabezado etiqueta="Inicio" onVolver={onVolver} tema={tema} onTema={onTema} />
      <h1 className="mb-4 text-lg font-semibold tracking-tight text-tinta">Arqueo</h1>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm text-tinta-suave">Caja</span>
        <select
          className="h-14 w-full rounded-xl border border-borde bg-tarjeta px-4 text-base text-tinta transition-colors"
          value={cajaId ?? ""}
          onChange={(e) => { setCajaId(Number(e.target.value)); setResultado(null); }}
        >
          <option value="" disabled>Elegir...</option>
          {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm text-tinta-suave">Turno</span>
        <select
          className="h-14 w-full rounded-xl border border-borde bg-tarjeta px-4 text-base text-tinta transition-colors"
          value={turnoId ?? ""}
          onChange={(e) => { setTurnoId(Number(e.target.value)); setResultado(null); }}
        >
          <option value="" disabled>Elegir...</option>
          {turnos.map((t) => (
            <option key={t.id} value={t.id} disabled={t.estado !== "abierto"}>{t.nombre} ({t.estado})</option>
          ))}
        </select>
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm text-tinta-suave">Efectivo contado</span>
        <input
          type="number" inputMode="numeric"
          className="h-14 w-full rounded-xl border border-borde bg-tarjeta px-4 text-xl text-tinta transition-colors"
          value={efectivo} onChange={(e) => setEfectivo(e.target.value)}
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm text-tinta-suave">Boletas contadas</span>
        <input
          type="number" inputMode="numeric"
          className="h-14 w-full rounded-xl border border-borde bg-tarjeta px-4 text-xl text-tinta transition-colors"
          value={boletas} onChange={(e) => setBoletas(e.target.value)}
        />
      </label>

      {guardar.isError && (
        <p className="aparicion mb-4 text-sm text-peligro">
          {guardar.error instanceof ApiError ? guardar.error.detalle : "No se pudo arquear."}
        </p>
      )}

      {resultado && (
        <div className={`aparicion mb-4 rounded-[20px] p-4 ${resultado.estado === "cuadra" ? "bg-exito/10" : "bg-aviso/10"}`}>
          {resultado.estado === "cuadra" ? (
            <p className="flex items-center gap-2 text-lg font-semibold text-exito">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10.5 8 14l8-8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Cierra
            </p>
          ) : (
            <>
              <p className="text-lg font-semibold text-aviso">
                Diferencia de {pesos(resultado.diferencia_efectivo + resultado.diferencia_boletas)}
              </p>
              <p className="text-sm text-aviso">Efectivo: {pesos(resultado.diferencia_efectivo)}</p>
              <p className="text-sm text-aviso">Boletas: {pesos(resultado.diferencia_boletas)}</p>
              <button disabled className="mt-3 rounded-full bg-tarjeta px-4 py-2 text-sm text-tinta-suave">
                Preguntarle al asistente (Próximamente)
              </button>
            </>
          )}
        </div>
      )}

      <BotonPrimario
        onClick={() => guardar.mutate()}
        disabled={guardar.isPending || !cajaId || !turnoId || !efectivo || !boletas}
        className="w-full text-lg"
      >
        {guardar.isPending ? "Arqueando..." : "Arquear"}
      </BotonPrimario>
      {(!cajaId || !turnoId || !efectivo || !boletas) && (
        <p className="text-center text-sm text-tinta-suave">Completá caja, turno, efectivo y boletas (0 si no hay)</p>
      )}
    </div>
  );
}
