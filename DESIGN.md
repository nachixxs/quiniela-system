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
- **Variante elegida en la 8.2c (D93): "Mostrador"** (lienzo de Claude Design, contra Libro,
  Cifra y Afinado). Primero la plata, después lo que falta hacer. Las listas son renglones
  dentro de una tarjeta con título. Cada monto de una lista lleva signo y color. Las horas van
  en 24 h.

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
  más oscuros (los de shadcn dan 4,35 sobre `muted` y menos de 3:1 como foco). El borde de
  `input` llega a 3:1 (D88): #8a8a8a en claro (3,2:1 sobre el fondo, 3,5:1 sobre `card`) y
  #6b6b6b en oscuro. `aviso` en claro es #a45106: 4,6:1 como texto de insignia sobre su tinte
  del 8 %. En claro, `background`/`sidebar` son un gris suave (#f5f5f5) y
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
- **Contador de pendientes (D100, 11/10):** el destino "Inicio" lleva, en la barra lateral y
  en la inferior, una insignia en `aviso` con la cantidad de pendientes del día (arqueos
  pendientes + rendición). Sin pendientes, no se muestra. El número también va en el nombre
  accesible del enlace ("Inicio, 3 pendientes").
- **Navegación por hash** (`#arqueo`, `#carga-rapida`, `#cuenta-corriente`): el botón atrás
  funciona y cada pantalla tiene su URL. Cada pantalla, salvo Inicio, abre con título y una
  línea que explica para qué es.

## 6. Pantallas

- **Renglón (Mostrador):** la hora en 24 h, en mono, a la izquierda; el tipo y debajo el
  detalle en `muted-foreground`; el monto a la derecha. Si entra plata, `+` en `exito`; si
  sale, `−` en `peligro`; un premio o un traspaso va sin signo, en `foreground`. Los renglones
  se separan con un borde superior dentro de una tarjeta con su `h2`. En escritorio, una
  tabla con encabezados.
- **Inicio (D93–D95), en este orden:**
  1. Las dos cajas, con el efectivo como cifra principal (22 px en el celular, 34 en
     escritorio) y las boletas debajo.
  2. "Lo que falta hoy": un renglón por pendiente, con título, detalle y el botón de su
     acción. El primero es el único primario. En el encabezado de la tarjeta, un anillo de progreso chico
     (~20 px, trazo `foreground` sobre `muted`) con "Arqueos N de M" al lado (D102, 11/10):
     N son los arqueos hechos del día y M, cajas × turnos. No es una cifra héroe.
     Lo vencido o faltante (un pendiente de un turno ya pasado, un fiado vencido) lleva una
     insignia "Vencido" o "Falta" en `peligro` o `aviso` y el ícono del renglón en ese color,
     **sin borde lateral de color** (D101, 11/10).
  3. Los cuatro botones de carga (Fiado, Cobro, Pago, Premio).
  4. Los últimos 4 movimientos y "Ver todos", que despliega la lista entera ahí mismo, con
     anular.

  En escritorio son dos columnas (3/2): a la izquierda cajas, pendientes y movimientos; a la
  derecha, cargas y fiados con sus días.
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
  Mostrador: la caja y el turno salen del arqueo pendiente (nunca "Noche" por defecto). Si se
  cambia el turno, aparece un aviso. La "Diferencia total" es la cifra principal (34 px en
  el celular, 40 en escritorio). En escritorio, el resultado es una tabla Esperado ·
  Contado · Diferencia.
- **Cuenta corriente:** a favor, el valor absoluto en `exito`.

## 7. Componentes compartidos

Desde el CP8 la base es shadcn (`web/src/components/ui/`, generado por el CLI y ajustado a
estos tokens). Encima, en `ui.tsx`: `Boton` (sobre `buttonVariants`), `Aviso`, `CampoMonto`,
`Segmentado`, `Hoja` (sobre Dialog, con el foco atrapado), `Reintentar`, `AvisoAbrirDia` y
`hora()` en 24 h; y `Carga` (la hoja de carga de Inicio y Carga rápida) en
`pantallas/CargaRapida.tsx`. Un solo `Toaster` (Sonner) en `main.tsx`.

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

`lucide-react` con trazo 1,75 en toda la app (`LucideProvider`; el activo de la barra, más
grueso), 16 px (20 en la barra inferior y en las tarjetas de carga), color por tipo en
`TIPOS`. Decorativos (`aria-hidden`), con texto al lado; los botones de solo ícono llevan `aria-label`.

## 10. Temas, accesibilidad y celular

- **Temas (D21):** sigue al sistema; la elección se guarda en `localStorage`. `theme-color`
  por tema en `index.html` (con script antidestello), actualizado por `util.ts`.
- **Foco visible** en todo: un contorno de `ring`, el mismo en campos y botones.
- `<form>` en todo: Enter guarda. Hojas con `role=dialog`, `aria-modal`, título enlazado,
  Escape y foco devuelto. Errores con `role=alert`; lo demás, `role=status` / `aria-live`.
- **Celular:** `interactive-widget=resizes-content` para que el teclado no tape la hoja;
  sin resaltado de toque ni pull-to-refresh; los controles no seleccionan su texto; campos
  de 16 px para que el iPhone no haga zoom.
