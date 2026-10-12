import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { m } from "motion/react";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "../api/cliente";
import { Aviso, Boton, EASE_SALIDA, TARJETA } from "../ui";

type Turno = { pregunta: string; respuesta?: string; error?: string };
// Preguntas que se pueden contestar con cualquier base: no nombran a un cliente puntual.
const EJEMPLOS = ["¿Qué arqueo no cuadró este mes?", "¿Quién debe hace más de 30 días?", "¿Cuánto Mercado Pago hay acumulado?"];
const NO_DISPONIBLE = "El asistente no está disponible ahora. El resto del sistema funciona igual.";

export function Asistente() {
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  // Sin historial hacia el servidor: la sesión vive en el caché (sobrevive al cambio de pantalla, se borra al salir).
  const { data: turnos = [] } = useQuery({ queryKey: ["asistente"], queryFn: () => [] as Turno[], staleTime: Infinity, gcTime: Infinity });
  const agregar = (t: Turno) => qc.setQueryData<Turno[]>(["asistente"], (v = []) => [t, ...v]);

  const preguntar = useMutation({
    mutationFn: (p: { pregunta: string; arqueo_id?: number }) => api.asistente(p),
    onSuccess: (r, p) => agregar({ pregunta: p.pregunta, respuesta: r.respuesta }),
    onError: (e, p) => agregar({ pregunta: p.pregunta, error: e instanceof ApiError && e.status === 503 ? e.detalle || NO_DISPONIBLE : "No se pudo obtener la respuesta. Probá de nuevo." }),
  });

  // Desde el arqueo que no cuadra llega #asistente?arqueo=ID: la pregunta sale sola, una vez.
  useEffect(() => {
    const id = Number(new URLSearchParams(location.hash.split("?")[1]).get("arqueo"));
    if (!id) return;
    history.replaceState(null, "", "#asistente");
    preguntar.mutate({ pregunta: "¿Por qué no cuadra este arqueo?", arqueo_id: id });
  }, []);

  const enviar = (pregunta: string) => {
    if (!pregunta.trim() || preguntar.isPending) return;
    preguntar.mutate({ pregunta: pregunta.trim() });
    setTexto("");
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className={`${TARJETA} p-4 lg:p-6`}>
        <h2 className="text-base font-semibold tracking-tight">Tu pregunta</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Los montos los calcula el sistema; el asistente los lee y te los explica.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={500} autoComplete="off" enterKeyHint="send"
            aria-label="Pregunta para el asistente" placeholder="Escribí tu pregunta…" className="sm:flex-1"
          />
          <Boton type="submit" cargando={preguntar.isPending} disabled={!texto.trim()} className="sm:w-32">Preguntar</Boton>
        </div>
      </form>

      {preguntar.isPending && (
        <div className={`${TARJETA} p-4 lg:p-6`} role="status">
          <p className="text-sm font-medium">{preguntar.variables.pregunta}</p>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Pensando… puede tardar unos segundos.
          </p>
        </div>
      )}

      {turnos.map((t, i) => (
        <m.div key={turnos.length - i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, ease: EASE_SALIDA }} className={`${TARJETA} p-4 lg:p-6`}>
          <p className="text-sm font-medium">{t.pregunta}</p>
          {t.error
            ? <div className="mt-3"><Aviso tono="error">{t.error}</Aviso></div>
            : <p className="mt-3 whitespace-pre-wrap break-words text-sm">{t.respuesta}</p>}
        </m.div>
      ))}

      {!turnos.length && !preguntar.isPending && (
        <div className={`${TARJETA} p-4 lg:p-6`}>
          <h2 className="text-base font-semibold tracking-tight">Para empezar</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Tocá una pregunta o escribí la tuya.</p>
          <div className="flex flex-wrap gap-2">
            {EJEMPLOS.map((e) => (
              <button key={e} type="button" onClick={() => enviar(e)}
                className="presiona flex min-h-11 items-center rounded-lg border bg-card px-3 text-left text-sm hover:bg-muted lg:min-h-9">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
