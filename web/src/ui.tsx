import type { ComponentPropsWithoutRef } from "react";
import type { Tema } from "./util";

// Botón chico para alternar entre tema claro y oscuro; se usa en el encabezado de cada pantalla.
// enBarra: true cuando el botón va sobre la barra negra (bg-barra), para usar colores con contraste ahí.
export function BotonTema({ tema, onClick, enBarra }: { tema: Tema; onClick: () => void; enBarra?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tema === "oscuro" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className={`presiona h-9 shrink-0 rounded-full border px-3 text-sm transition-colors ${
        enBarra
          ? "border-en-barra/30 text-en-barra hover:bg-en-barra/10"
          : "border-borde text-tinta-suave hover:bg-fondo"
      }`}
    >
      {tema === "oscuro" ? "Claro" : "Oscuro"}
    </button>
  );
}

// Botón de acción principal: mismo peso visual en Login, Carga rápida, Arqueo y Cuenta corriente.
export function BotonPrimario({
  tamaño = "grande",
  className = "",
  ...props
}: { tamaño?: "grande" | "chico" } & ComponentPropsWithoutRef<"button">) {
  const tam = tamaño === "grande" ? "h-12 text-base" : "h-9 text-sm";
  return (
    <button
      className={`presiona ${tam} rounded-full bg-marca font-semibold text-white transition-colors hover:bg-marca-fuerte active:bg-marca-fuerte disabled:opacity-60 disabled:hover:bg-marca ${className}`}
      {...props}
    />
  );
}

// Encabezado de las pantallas secundarias: volver + tema, con la misma zona táctil en las tres.
export function Encabezado({
  etiqueta,
  onVolver,
  tema,
  onTema,
}: {
  etiqueta: string;
  onVolver: () => void;
  tema: Tema;
  onTema: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <button
        type="button"
        onClick={onVolver}
        className="presiona -ml-2 flex h-11 items-center gap-1.5 rounded-full px-2 text-sm text-tinta-suave transition-colors hover:text-tinta"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {etiqueta}
      </button>
      <BotonTema tema={tema} onClick={onTema} />
    </div>
  );
}

// Bloque de carga: mismo lenguaje visual (radio, superficie) que la tarjeta que va a reemplazar.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-borde/60 ${className}`} aria-hidden="true" />;
}
