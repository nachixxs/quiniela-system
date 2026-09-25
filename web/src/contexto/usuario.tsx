import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/cliente";
import type { Usuario } from "../api/tipos";

interface UsuarioContextoValor {
  usuario: Usuario | null;
  cargando: boolean;
  setUsuario: (u: Usuario | null) => void;
}

const UsuarioContexto = createContext<UsuarioContextoValor | null>(null);

export function UsuarioProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const yo = useQuery({ queryKey: ["yo"], queryFn: api.yo, retry: false });

  useEffect(() => {
    if (yo.data) setUsuario(yo.data);
  }, [yo.data]);

  return (
    <UsuarioContexto.Provider value={{ usuario, cargando: yo.isLoading, setUsuario }}>
      {children}
    </UsuarioContexto.Provider>
  );
}

export function useUsuario() {
  const ctx = useContext(UsuarioContexto);
  if (!ctx) throw new Error("useUsuario se usa dentro de UsuarioProvider");
  return ctx;
}
