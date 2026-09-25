import { useRef, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { api, ApiError } from "../api/cliente";
import { useUsuario } from "../contexto/usuario";
import { Aviso, Boton } from "../ui";

const CAMPO = "h-14 w-full rounded-xl bg-superficie-2 px-4 text-base text-tinta ring-acento-texto transition-shadow focus-visible:outline-none focus-visible:ring-2";

export function Login({ acciones }: { acciones: ReactNode }) {
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
    // Un error de ingreso sacude el formulario una vez (WAAPI): se entiende sin leer.
    onError: () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      form.current?.animate(
        { transform: ["translateX(0)", "translateX(-6px)", "translateX(6px)", "translateX(-3px)", "translateX(0)"] },
        { duration: 300, easing: "ease-out" },
      );
    },
  });

  return (
    <div className="min-h-dvh bg-lienzo lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* El grafito con la estrella: la misma marca que recibe al operador en el tablero. */}
      <section className="sobre-noche relative bg-noche px-6 pb-16 pt-[max(1rem,env(safe-area-inset-top))] text-en-noche lg:flex lg:flex-col lg:justify-center lg:p-12">
        <div className="flex justify-end lg:absolute lg:bottom-8 lg:left-10">{acciones}</div>
        <div className="mt-6 lg:mt-0">
          <span className="grid size-12 place-items-center rounded-xl bg-marca text-en-marca">
            <Star className="size-6 fill-current" aria-hidden />
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight lg:text-4xl">Quiniela La Estrella</h1>
          <p className="mt-2 text-en-noche-suave lg:text-lg">Ingresá para abrir la caja</p>
        </div>
      </section>

      <div className="-mt-8 px-4 lg:mt-0 lg:grid lg:place-items-center lg:px-12">
        <form
          ref={form}
          onSubmit={(e) => {
            e.preventDefault();
            mutacion.mutate();
          }}
          className="relative mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-superficie p-6 shadow-tarjeta lg:p-8"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-tinta-suave">Usuario</span>
            <input
              className={CAMPO}
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
            <span className="mb-1.5 block text-sm font-medium text-tinta-suave">Contraseña</span>
            <input type="password" className={CAMPO} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {mutacion.isError && (
            <Aviso tono="error">{mutacion.error instanceof ApiError ? mutacion.error.detalle : "No se pudo conectar."}</Aviso>
          )}
          <Boton type="submit" cargando={mutacion.isPending} className="mt-1 h-14 w-full text-base">
            {mutacion.isPending ? "Entrando…" : "Entrar"}
          </Boton>
        </form>
      </div>
    </div>
  );
}
