import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "../api/cliente";
import { useUsuario } from "../contexto/usuario";

export function Login() {
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutacion.mutate();
        }}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow"
      >
        <h1 className="mb-1 text-xl font-bold text-slate-800">Quiniela La Estrella</h1>
        <p className="mb-6 text-sm text-slate-500">Ingresá para abrir la caja</p>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Usuario</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Contraseña</span>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {mutacion.isError && (
          <p className="mb-4 text-sm text-red-600">
            {mutacion.error instanceof ApiError ? mutacion.error.detalle : "No se pudo conectar."}
          </p>
        )}

        <button
          type="submit"
          disabled={mutacion.isPending}
          className="w-full rounded-lg bg-blue-600 py-3 text-base font-semibold text-white active:bg-blue-700 disabled:opacity-60"
        >
          {mutacion.isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
