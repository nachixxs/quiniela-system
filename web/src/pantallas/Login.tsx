import { useRef, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "../api/cliente";
import { useUsuario } from "../contexto/usuario";
import { Aviso, Boton, TARJETA } from "../ui";

const CAMPO =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-xs transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20 lg:h-10 lg:text-sm dark:bg-input/30";

export function Login({ acciones, marca }: { acciones: ReactNode; marca: ReactNode }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const { setUsuario: guardarUsuario } = useUsuario();
  const form = useRef<HTMLFormElement>(null);

  const mutacion = useMutation({
    mutationFn: async () => {
      await api.login(usuario, password);
      return api.yo();
    },
    onSuccess: guardarUsuario,
    // Un error de ingreso sacude el formulario una vez (WAAPI): se entiende sin leer y no pierde el foco.
    onError: () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      form.current?.animate(
        { transform: ["translateX(0)", "translateX(-6px)", "translateX(6px)", "translateX(-3px)", "translateX(0)"] },
        { duration: 300, easing: "ease-out" },
      );
    },
  });

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 items-center gap-1 pl-4 pr-2 pt-[env(safe-area-inset-top)] lg:pl-8 lg:pr-6">
        <span className="min-w-0 flex-1">{marca}</span>
        {acciones}
      </header>

      <main className="grid flex-1 place-items-center px-4 pb-16 pt-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ingresá con tu usuario para abrir la caja.</p>
          <form
            ref={form}
            onSubmit={(e) => {
              e.preventDefault();
              mutacion.mutate();
            }}
            className={`${TARJETA} mt-6 flex flex-col gap-5 p-5 lg:p-6`}
          >
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Usuario</span>
              <input
                className={CAMPO}
                name="usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Contraseña</span>
              <input type="password" name="password" className={CAMPO} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            {mutacion.isError && (
              <Aviso tono="error">{mutacion.error instanceof ApiError ? mutacion.error.detalle : "No se pudo conectar. Revisá la conexión y probá de nuevo."}</Aviso>
            )}
            <Boton type="submit" cargando={mutacion.isPending} className="h-11 w-full lg:h-10">
              {mutacion.isPending ? "Entrando…" : "Entrar"}
            </Boton>
          </form>
        </div>
      </main>
    </div>
  );
}
