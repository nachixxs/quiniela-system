import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LucideProvider } from "lucide-react";
import { LazyMotion, MotionConfig, domMax } from "motion/react";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { UsuarioProvider } from "./contexto/usuario";
import { App, LimiteDeError } from "./App";
import { Toaster } from "@/components/ui/sonner";
import "./index.css";

// A esta escala refetchear todo tras cualquier mutación exitosa sale gratis: sin listas de
// invalidación a mano por pantalla, que quedaban desactualizadas apenas se sumaba una nueva.
const queryClient: QueryClient = new QueryClient({
  mutationCache: new MutationCache({ onSuccess: () => queryClient.invalidateQueries() }),
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
