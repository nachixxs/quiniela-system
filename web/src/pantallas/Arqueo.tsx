import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../api/cliente";
import type { ArqueoOut } from "../api/tipos";
import { pesos } from "../util";

export function Arqueo({ onVolver }: { onVolver: () => void }) {
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
    <div className="mx-auto min-h-screen max-w-md bg-slate-100 px-4 pb-10 pt-6 lg:max-w-lg">
      <button onClick={onVolver} className="mb-4 text-sm text-slate-500">← Inicio</button>
      <h1 className="mb-4 text-lg font-bold text-slate-800">Arqueo</h1>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Caja</span>
        <select
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
          value={cajaId ?? ""}
          onChange={(e) => { setCajaId(Number(e.target.value)); setResultado(null); }}
        >
          <option value="" disabled>Elegir...</option>
          {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Turno</span>
        <select
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
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
        <span className="mb-1 block text-sm font-medium text-slate-700">Efectivo contado</span>
        <input
          type="number" inputMode="numeric"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-xl"
          value={efectivo} onChange={(e) => setEfectivo(e.target.value)}
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Boletas contadas</span>
        <input
          type="number" inputMode="numeric"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-xl"
          value={boletas} onChange={(e) => setBoletas(e.target.value)}
        />
      </label>

      {guardar.isError && (
        <p className="mb-4 text-sm text-red-600">
          {guardar.error instanceof ApiError ? guardar.error.detalle : "No se pudo arquear."}
        </p>
      )}

      {resultado && (
        <div className={`mb-4 rounded-lg p-4 ${resultado.estado === "cuadra" ? "bg-green-100" : "bg-amber-100"}`}>
          {resultado.estado === "cuadra" ? (
            <p className="text-lg font-bold text-green-700">Cierra</p>
          ) : (
            <>
              <p className="text-lg font-bold text-amber-700">
                Diferencia de {pesos(resultado.diferencia_efectivo + resultado.diferencia_boletas)}
              </p>
              <p className="text-sm text-amber-700">Efectivo: {pesos(resultado.diferencia_efectivo)}</p>
              <p className="text-sm text-amber-700">Boletas: {pesos(resultado.diferencia_boletas)}</p>
              <button disabled className="mt-3 rounded-lg bg-white px-4 py-2 text-sm text-slate-400">
                Preguntarle al asistente (Próximamente)
              </button>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => guardar.mutate()}
        disabled={guardar.isPending || !cajaId || !turnoId || !efectivo || !boletas}
        className="w-full rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white active:bg-blue-700 disabled:opacity-60"
      >
        {guardar.isPending ? "Arqueando..." : "Arquear"}
      </button>
      {(!cajaId || !turnoId || !efectivo || !boletas) && (
        <p className="text-center text-sm text-slate-500">Completá caja, turno, efectivo y boletas (0 si no hay)</p>
      )}
    </div>
  );
}
