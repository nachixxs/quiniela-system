# DESIGN.md: Quiniela La Estrella

Las reglas del diseño. Los valores viven en el código: tokens y utilidades (`monto`, `rotulo`,
`presiona`, `esqueleto`) en `web/src/index.css`, clases y compartidos en `web/src/ui.tsx`.
Si no coinciden, vale el código y se corrige este archivo.

## 1. Dirección

**Una herramienta de trabajo, en el idioma de shadcn/ui "neutral"** (el mismo de Cronos):
grises sin tinte, bordes de 1 px, una sola acción oscura (o clara, en oscuro) por vista. El
color aparece solo cuando algo tiene significado. Nada compite con los montos.

- **Quién la usa:** la cajera y el dueño, casi siempre en el celular detrás del mostrador,
  decenas de veces por turno; a veces en la computadora.
- **Qué tiene que sentirse:** una herramienta de banco: números que se leen de un vistazo,
  toque que responde en el acto, nada que mirar dos veces.
- **Qué no es:** una landing ni un template de IA. Sin gradientes, dorado, brillos, vidrio,
  tarjetas dentro de tarjetas, avatares de relleno ni métricas infladas.

## 2. Color

Los colores son **roles**: el tema oscuro reasigna los mismos nombres y ningún componente
escribe un hex. Los nombres son los de shadcn más cuatro de significado:

| Token | Significa | Dónde |
|---|---|---|
| `exito` (esmeralda) | Cuadra, entró plata, abierto | "Cuadra", cobro de fiado, saldo a favor, turno abierto |
| `peligro` (rojo) | No cuadra, salió plata, deuda | "No cuadra", diferencias ≠ 0, MP / retiro / gasto, "Deuda" |
| `aviso` (ámbar) | Mirá esto | Sin ticket, pendientes, fiado |
| `premio` (violeta) | Premio pagado | Solo el ícono del premio: sale efectivo y entra la boleta, sin signo |

Reglas:

- **El color de estado vive en el ícono, en el rótulo y en un tinte leve**, nunca de fondo
  lleno. Las insignias van tintadas al 8 %, los avisos al 5 % con borde y el texto del aviso
  queda en `foreground`.
- **La selección es neutra.** Opción elegida: borde en `foreground`. Ítem activo de la
  barra lateral y fila elegida: `muted`. El segmentado: una pastilla en `card`
  sobre `muted`. Ningún color de estado marca selección.
- **Botón primario:** uno por vista y siempre `primary`. Lo demás es secundario (con borde).
  Deshabilitado = fondo `muted` y texto `muted-foreground`, con el motivo escrito debajo.
- **Contraste medido** (WCAG 2, en los dos temas, con mezcla de alfa): texto 4,5:1 o más;
  íconos y foco, 3:1 o más. Desvíos de shadcn en claro: `muted-foreground` y `ring`, un punto
  más oscuros (los de shadcn dan 4,35 sobre `muted` y menos de 3:1 como foco). Falla conocida,
  igual que en shadcn: el borde de `input` no llega a 3:1 (1,48:1 sobre `card`); el campo se
  reconoce por su etiqueta. En claro, `background`/`sidebar` son un gris suave (#f5f5f5) y
  `card` queda blanco encima; `muted` (#e5e5e5) da un paso más oscuro que el fondo
  para seguir leyéndose sobre él. Medido: `foreground` 18,2:1 sobre `background` y 15,7:1
  sobre `muted`; `muted-foreground` 4,7:1 sobre `background`, 6,0:1 sobre `card` y 4,8:1 sobre
  `muted`.

## 3. Tipografía

**Geist** para el texto y **Geist Mono** para toda cifra de plata (las dos variables y en el
bundle, D26). Cifras tabulares en todo el `body`.

- **Todo monto** pasa por `pesos()` (`util.ts`), va en `monto` (mono) y en listas se alinea a
  la derecha. Las diferencias llevan signo explícito (`pesos(x, true)`). El frontend no
  calcula plata: la única suma que muestra es la "Diferencia total" del arqueo (D2).
- La etiqueta va arriba del valor. `h1` y `h2` con `text-wrap: balance`. "…", no "...".
- Castellano rioplatense y las palabras del dominio (SPECS §2).

## 4. Forma y espacio

- **Radios:** cuatro pasos. Tarjetas y diálogos, el mayor; controles, el del medio; insignias,
  `rounded-md`. `rounded-full` solo en el punto del radio y el círculo del resultado.
- **Elevación:** la tarjeta es `TARJETA`: borde de 1 px, fondo `card` y la sombra mínima.
  Solo flotan con `shadow-lg` la hoja, el diálogo y el toast. No hay otras sombras.
- **Toques:** 44 px o más en el celular (guardar y arquear, 48); la escala de escritorio
  desde `lg`. Márgenes de 16 px en el celular y 32 en escritorio; en escritorio el contenido
  ocupa el ancho junto a la barra lateral (sin centrar), con un tope de 1600 px para
  monitores muy anchos. Un formulario puede tener su propio ancho máximo dentro de su tarjeta.
- **Capas (z-index):** barra de arriba 20, barra inferior 30, hoja 40, toast 50. No hay otras.

## 5. Estructura

- **Escritorio (lg y más):** barra lateral fija con la marca, los seis destinos (el
  activo en `muted`, con indicador que viaja) y al pie el usuario y "Cerrar sesión". Arriba,
  una barra mínima con borde inferior: fecha, estado del día y tema.
- **Celular:** arriba, marca, tema y salida. Abajo, la barra en `card` con borde superior y
  seis destinos. El activo no lleva pastilla: texto en `foreground`, trazo más grueso y
  una raya fina arriba que viaja.
- **Navegación por hash** (`#arqueo`, `#carga-rapida`, `#cuenta-corriente`): el botón atrás
  funciona y cada pantalla tiene su URL. Cada pantalla, salvo Inicio, abre con título y una
  línea que explica para qué es.

## 6. Pantallas

- **Caja chica sin ticket (D27, SPECS §7.3):** insignia "Sin ticket", Efectivo dice "Al
  cargar el ticket", solo las boletas llevan monto y no hay esperado. Nunca un efectivo
  parcial. Se sabe porque la caja operativa llega con `esperado` nulo.
- **Carga rápida:** cuatro tarjetas grandes, cada una con su ícono de color, el nombre y la
  ayuda. Cada tarjeta abre la hoja `Carga`. En **Pago (D18)** hay tres opciones: "MP /
  transferencia" (la de por defecto), "Retiro del dueño" y "Gasto". Al guardar aparece un
  toast con el monto y el cliente.
- **Arqueo:** caja (opciones con radio), turno (segmentado) y los dos conteos. En escritorio
  son dos columnas: el formulario en tarjeta y el resultado al lado.
  Botón bloqueado = motivo a la vista (qué falta, o turno sin ticket). **Resultado (D2):**
  "Cuadra" o "No cuadra"; efectivo y boletas (esperado y diferencia) bajo rótulos, y la
  fila "Diferencia total". Diferencia ≠ 0 en `peligro`; cuadra solo si las dos dan cero.
  Con el resultado a la vista el botón queda deshabilitado; cualquier cambio lo borra.
- **Cuenta corriente:** a favor, el valor absoluto en `exito`.

## 7. Componentes compartidos

Seis, el máximo del track B: `Boton`, `Aviso`, `CampoMonto`, `Segmentado` y `Hoja` en
`ui.tsx`, y `Carga` (la hoja de carga de Inicio y Carga rápida) en `pantallas/CargaRapida.tsx`.

Lo demás que se repite son **clases**, no componentes: `TARJETA`, `INSIGNIA`, `TONOS`,
`OPCION`, `PUNTO_RADIO` y `TIPOS` (el nombre, ícono y color de cada tipo de movimiento).
Todo lo demás es local a su pantalla, incluida la marca, que App le pasa a Login como prop.

Toda consulta tiene tres estados: cargando (esqueleto quieto con la forma de lo que
reemplaza), error (`Aviso`, con "Reintentar" cuando se puede) y vacío (una línea que dice qué hacer).

## 8. Movimiento

`motion` con `LazyMotion` + `m` y `MotionConfig reducedMotion="user"`. La regla es que la
frecuencia manda: lo que se ve decenas de veces por turno dura 200 ms o menos, o no se
anima. **Los montos no se animan y nada va en bucle.** La única excepción es el spinner de
un botón que está guardando, que es funcional.

| Qué | Cómo | Por qué |
|---|---|---|
| Toque (`presiona`) | Se hunde apenas al apretar | Confirma el toque en el momento |
| Cambio de pantalla | Solo un fundido corto | Se navega todo el tiempo |
| Indicadores activos | `layoutId`, resorte sin rebote | Muestra de dónde a dónde |
| Hoja / diálogo | Opacidad y escala desde 0,96 | Nunca desde escala 0 |
| Aviso | Opacidad y 4 px | Aparece sin empujar |
| Toast | Baja desde arriba y se va por el mismo lado | Confirma sin tapar la próxima carga |
| Resultado del arqueo | Resorte de entrada, las filas en cascada corta y el tilde que se dibuja | Es el momento del día y se ve cuatro veces |
| Radio | El punto crece desde el centro | Confirma la elección |
| Error de login | Una sacudida con WAAPI | No remonta el formulario ni pierde el foco |
| Cambio de tema | Fundido de toda la página (View Transitions) | Sin él, cada superficie cambia a destiempo |

Con `prefers-reduced-motion` se apagan la escala del toque, la transición de tema, la
sacudida y el scroll suave. Motion reduce lo suyo a opacidad.

Descartado a propósito: contar montos, escalonar las tarjetas de carga (alta frecuencia),
deslizar entre pantallas, levantar tarjetas en hover y el esqueleto que late.

## 9. Íconos

`lucide-react`, 16 px (20 en la barra inferior y en las tarjetas de carga), color por tipo en
`TIPOS`. Decorativos (`aria-hidden`), con texto al lado; los botones de solo ícono llevan `aria-label`.

## 10. Temas, accesibilidad y celular

- **Temas (D21):** sigue al sistema; la elección se guarda en `localStorage`. `theme-color`
  por tema en `index.html` (con script antidestello), actualizado por `util.ts`.
- **Foco visible** en todo (`ring`); los campos suman un halo suave, como en shadcn.
- `<form>` en todo: Enter guarda. Hojas con `role=dialog`, `aria-modal`, título enlazado,
  Escape y foco devuelto. Errores con `role=alert`; lo demás, `role=status` / `aria-live`.
- **Celular:** `interactive-widget=resizes-content` para que el teclado no tape la hoja;
  sin resaltado de toque ni pull-to-refresh; los controles no seleccionan su texto; campos
  de 16 px para que el iPhone no haga zoom.
