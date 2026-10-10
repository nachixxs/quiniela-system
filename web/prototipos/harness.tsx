// Harness de los prototipos: una variante a la vez, a tamaño real, con el picker de PICKER.md (teclas 1-3, ←/→, R).
// Temporal (CP8 · 8.2): se borra en la 8.3. Con ?captura el picker no se dibuja.
import { StrictMode, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { LazyMotion, MotionConfig, domMax } from "motion/react";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./proto.css";

// CSS del picker, verbatim de PICKER.md (no usa los tokens del proyecto a propósito).
const CSS = `
.proto-picker { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 2147483647; display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 999px; background: rgba(10, 10, 10, 0.82); -webkit-backdrop-filter: blur(12px) saturate(1.4); backdrop-filter: blur(12px) saturate(1.4); box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset, 0 8px 24px rgba(0, 0, 0, 0.24), 0 2px 6px rgba(0, 0, 0, 0.12); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px; line-height: 1; -webkit-font-smoothing: antialiased; user-select: none; -webkit-user-select: none; }
.proto-picker-highlight { position: absolute; top: 4px; left: 0; height: 28px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); will-change: transform; }
.proto-picker[data-ready] .proto-picker-highlight { transition: transform 250ms cubic-bezier(0.23, 1, 0.32, 1), width 250ms cubic-bezier(0.23, 1, 0.32, 1); }
@media (prefers-reduced-motion: reduce) { .proto-picker[data-ready] .proto-picker-highlight { transition: none; } }
.proto-picker-item { position: relative; display: flex; align-items: center; height: 28px; padding: 0 12px; border: 0; border-radius: 999px; background: transparent; color: rgba(255, 255, 255, 0.55); font: inherit; cursor: pointer; transition: color 150ms ease-out; }
.proto-picker-item:hover { color: rgba(255, 255, 255, 0.85); }
.proto-picker-item:active { transform: scale(0.97); }
.proto-picker-item:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.4); outline-offset: 2px; }
.proto-picker-item[data-active] { color: #fff; }
.proto-picker-divider { width: 1px; height: 16px; margin: 0 4px; background: rgba(255, 255, 255, 0.12); }
.proto-picker-replay { padding: 0 10px; font-size: 14px; }
.proto-picker[data-position="top"] { bottom: auto; top: 24px; }
`;

type Variante = { nombre: string; Pantalla: ComponentType };

function Harness({ variantes }: { variantes: Variante[] }) {
  const n = variantes.length;
  const [actual, setActual] = useState(() => Math.min(n, Math.max(1, Number(new URLSearchParams(location.search).get("v")) || 1)) - 1);
  const [remontar, setRemontar] = useState(0);
  const [listo, setListo] = useState(false);
  const actualRef = useRef(actual);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const resalte = useRef<HTMLSpanElement>(null);

  const elegir = (i: number) => {
    if (i < 0 || i >= n) return;
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(null, "", url); // antes del render: el shell lee ?v= para los enlaces
    actualRef.current = i;
    setActual(i);
  };

  useLayoutEffect(() => {
    const el = items.current[actual];
    if (!el || !resalte.current) return;
    resalte.current.style.width = `${el.offsetWidth}px`;
    resalte.current.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [actual]);

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setListo(true)));
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= n) elegir(num - 1);
      else if (e.key === "ArrowRight") elegir((actualRef.current + 1) % n);
      else if (e.key === "ArrowLeft") elegir((actualRef.current - 1 + n) % n);
      else if (e.key === "r" || e.key === "R") setRemontar((k) => k + 1);
    };
    document.addEventListener("keydown", tecla);
    return () => { cancelAnimationFrame(id); document.removeEventListener("keydown", tecla); };
  }, []);

  const { Pantalla } = variantes[actual];
  return (
    <>
      <Pantalla key={`${actual}-${remontar}`} />
      {!new URLSearchParams(location.search).has("captura") && (
        <>
          <style>{CSS}</style>
          <nav className="proto-picker" data-position="top" data-ready={listo || undefined} aria-label="Prototype variants">
            <span className="proto-picker-highlight" ref={resalte} aria-hidden="true" />
            {variantes.map((v, i) => (
              <button key={v.nombre} ref={(el) => { items.current[i] = el; }} className="proto-picker-item" data-active={i === actual || undefined} aria-current={i === actual || undefined} onClick={() => elegir(i)}>
                {v.nombre}
              </button>
            ))}
            <span className="proto-picker-divider" aria-hidden="true" />
            <button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={() => setRemontar((k) => k + 1)}>↻</button>
          </nav>
        </>
      )}
    </>
  );
}

export function montar(variantes: Variante[]) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <Harness variantes={variantes} />
        </MotionConfig>
      </LazyMotion>
    </StrictMode>,
  );
}
