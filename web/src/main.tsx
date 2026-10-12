import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LucideProvider } from "lucide-react";
import { LazyMotion, MotionConfig, domMax } from "motion/react";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { ApiError } from "./api/cliente";
import { UsuarioProvider } from "./contexto/usuario";
import { App, LimiteDeError } from "./App";
import { Toaster } from "@/components/ui/sonner";
import "./index.css";

// A esta escala refetchear todo tras cualquier mutación exitosa sale gratis: sin listas de
// invalidación a mano por pantalla, que quedaban desactualizadas apenas se sumaba una nueva.
// Un 401 en cualquier consulta o mutación (sesión vencida) recarga: "yo" da 401 y vuelve al login. Se salta "yo"
// (sería un bucle) y el ingreso mismo, donde un 401 es la contraseña mal.
// D106: la marca en sessionStorage le dice al login por qué volvió.
const sesionVencida = (e: unknown) => {
  if (!(e instanceof ApiError && e.status === 401)) return;
  try { sessionStorage.setItem("quiniela-sesion-vencida", "1"); } catch { /* sin storage: el login no avisa */ }
  location.reload();
};
const queryClient: QueryClient = new QueryClient({
  defaultOptions: { queries: { retry: (n, e) => !(e instanceof ApiError && e.status === 401) && n < 3 } },
  queryCache: new QueryCache({ onError: (e, q) => q.queryKey[0] !== "yo" && sesionVencida(e) }),
  mutationCache: new MutationCache({
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (e, _v, _c, m) => m.options.mutationKey?.[0] !== "login" && sesionVencida(e),
  }),
});

// LazyMotion + m: solo las piezas de motion que se usan. reducedMotion "user" apaga los desplazamientos
// y escalas de layout cuando el sistema pide menos movimiento; los strings de transform los reducen
// useReducedMotion (en JS) y el @media de index.css (lo de shadcn). Íconos de lucide con trazo 1,75.
// Un solo Toaster, fuera de cualquier diálogo.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <LucideProvider strokeWidth={1.75}>
            <UsuarioProvider>
              <LimiteDeError>
                <App />
              </LimiteDeError>
            </UsuarioProvider>
            <Toaster />
          </LucideProvider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  </StrictMode>,
);
