import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "../api/cliente";
import { useUsuario } from "../contexto/usuario";
import { BotonTema } from "../App";
import type { Tema } from "../util";

export function Login({ tema, onTema }: { tema: Tema; onTema: () => void }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const { setUsuario: guardarUsuario } = useUsuario();

  const mutacion = useMutation({
    mutationFn: async () => {
      await api.login(usuario, password);
      return api.yo();
    },
    onSuccess: guardarUsuario,
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-fondo px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutacion.mutate();
        }}
        className="w-full max-w-sm rounded-[20px] bg-tarjeta p-6"
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <h1 className="text-xl font-semibold text-tinta">Quiniela La Estrella</h1>
          <BotonTema tema={tema} onClick={onTema} />
        </div>
        <p className="mb-6 text-sm text-tinta-suave">Ingresá para abrir la caja</p>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-tinta-suave">Usuario</span>
          <input
            className="h-14 w-full rounded-xl border border-borde bg-fondo px-4 text-base text-tinta"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-tinta-suave">Contraseña</span>
          <input
            type="password"
            className="h-14 w-full rounded-xl border border-borde bg-fondo px-4 text-base text-tinta"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {mutacion.isError && (
          <p className="mb-4 text-sm text-peligro">
            {mutacion.error instanceof ApiError ? mutacion.error.detalle : "No se pudo conectar."}
          </p>
        )}

        <button
          type="submit"
          disabled={mutacion.isPending}
          className="h-12 w-full rounded-full bg-marca text-base font-semibold text-white active:bg-marca-fuerte disabled:opacity-60"
        >
          {mutacion.isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
