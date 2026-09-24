import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UsuarioProvider } from "./contexto/usuario";
import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UsuarioProvider>
        <App />
      </UsuarioProvider>
    </QueryClientProvider>
  </StrictMode>,
);
