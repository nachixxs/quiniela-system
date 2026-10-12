import { useRef, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "../api/cliente";
import { useUsuario } from "../contexto/usuario";
import { Aviso, Boton, TARJETA } from "../ui";

// Mensaje de error que dice qué hacer (nunca solo "error"): credenciales, otro error de la API o sin conexión.
const mensajeDe = (e: unknown) =>
  e instanceof ApiError ? (e.status === 401 ? `${e.detalle} Revisá los dos datos y probá de nuevo.` : e.detalle) : "No se pudo conectar. Revisá la conexión y probá de nuevo.";

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
  const invalido = mutacion.isError && mutacion.error instanceof ApiError && mutacion.error.status === 401;

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
            <div className="flex flex-col gap-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Input
                id="usuario"
                name="usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                required
                aria-invalid={invalido || undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                aria-invalid={invalido || undefined}
              />
            </div>
            {mutacion.isError && <Aviso tono="error">{mensajeDe(mutacion.error)}</Aviso>}
            <Boton type="submit" size="lg" cargando={mutacion.isPending} className="w-full">
              {mutacion.isPending ? "Entrando…" : "Entrar"}
            </Boton>
          </form>
        </div>
      </main>
    </div>
  );
}
