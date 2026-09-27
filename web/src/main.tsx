import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, MotionConfig, domMax } from "motion/react";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { UsuarioProvider } from "./contexto/usuario";
import { App } from "./App";
import "./index.css";

// A esta escala refetchear todo tras cualquier mutación exitosa sale gratis: sin listas de
// invalidación a mano por pantalla, que quedaban desactualizadas apenas se sumaba una nueva.
const queryClient: QueryClient = new QueryClient({
  mutationCache: new MutationCache({ onSuccess: () => queryClient.invalidateQueries() }),
});

// LazyMotion + m: solo las piezas de motion que se usan. reducedMotion "user" apaga los
// desplazamientos cuando el sistema pide menos movimiento y deja los fundidos.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <UsuarioProvider>
            <App />
          </UsuarioProvider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  </StrictMode>,
);
