# DESIGN.md: Quiniela La Estrella

El sistema de diseño de esta app, no de otra. Los tokens viven en `web/src/index.css`
(`@theme`), los componentes compartidos en `web/src/ui.tsx`. Si algo de acá y el código no
coinciden, manda el código y se corrige este archivo.

## 1. Dirección

**Una herramienta de mostrador, sobria.** Grafito para el tablero donde se lee la plata del
día, blanco y grises fríos para trabajar, un azul tinta para la acción, y el dorado de la
estrella solo en la marca. Nada compite con los montos.

- **Quién la usa:** Marisa y el dueño, en el mostrador, con el celular en una mano y la
  plata en la otra, decenas de veces por turno. Primero celular (390 px), después escritorio.
- **Qué tiene que sentirse:** una herramienta de banco, confiable y rápida. Números grandes,
  toques cortos, respuesta inmediata, y ningún adorno que haya que mirar dos veces.
- **Qué no es:** una landing. Nada de gradientes, brillos ni tarjetas dentro de tarjetas.
  El 3.B9 bajó el ruido del 3.B8 (azul noche, dorado, pastillas) y conservó la estructura.

## 2. Color

Los colores son **roles**, no tonos: el tema oscuro reasigna los mismos nombres. Nunca se
escribe un hex en un componente. Los valores están en `index.css`; acá va para qué sirve
cada uno.

| Token | Para qué |
|---|---|
| `lienzo`, `superficie`, `superficie-2` | Fondo, tarjetas y hojas, campos y hover |
| `tinta`, `tinta-suave` | Texto y etiquetas |
| `borde` | El filo de 1 px de tarjetas, separadores |
| `noche`, `noche-2`, `en-noche`, `en-noche-suave` | Grafito del tablero, las barras y el login, en los dos temas |
| `acento`, `acento-fuerte`, `en-acento` | Fondo del botón primario, su hover y su texto |
| `acento-texto` | El azul como texto, ícono o anillo de foco (más claro en oscuro) |
| `marca`, `en-marca` | El dorado: solo el cuadrado de la estrella |
| `exito`, `peligro`, `aviso` (y `-suave`) | Estados |

Reglas:

- **Una sola acción azul por vista.** Lo demás es secundario (`superficie-2`) o fantasma.
  Deshabilitado primario: gris de superficie, no azul apagado.
- **El dorado es la marca, no la interfaz.** No marca selección, ni botones, ni estados.
- **Color de estado = significado.** Verde es "cierra / entró plata / abierto", rojo es
  "error / salió plata", naranja es "mirá esto" (pendiente, diferencia, fiado).
- **Sobre el grafito** van blanco, blanco al 8-10 % y la marca; nunca un color de estado.
- **Contraste medido** con la fórmula de WCAG 2 en los dos temas: todo texto usado da 4,5:1
  o más (el más justo, `peligro` sobre `peligro-suave` en claro, 5,00); íconos, bordes de
  selección y foco, 3:1 o más (el más justo, el borde azul de la opción elegida en
  oscuro, 3,44).

## 3. Tipografía

**Geist** (variable, `@fontsource-variable/geist`, en el bundle, D26). Se eligió por las
cifras: los montos se leen compactos y con carácter.

- Cifras tabulares en todo el `body`: los montos no bailan al cambiar ni al alinear columnas.
- Todo monto pasa por `pesos()` (`util.ts`): enteros, sin decimales. El frontend no calcula
  plata; la única suma que muestra es la "Diferencia total" del arqueo (D2).
- Escala corta, sin tokens propios (clases de Tailwind):

| Uso | Tamaño | Peso |
|---|---|---|
| Monto héroe (caja del tablero, campo de carga, saldo del cliente) | 32 a 36 px | 600, `tracking-tight` |
| Título de pantalla (escritorio), saludo | 24 px | 600 |
| Resultado del arqueo, título de hoja | 18 a 20 px | 600 |
| Cuerpo, filas | 15 a 16 px | 500 |
| Etiqueta, detalle | 12 a 14 px | 500, `tinta-suave` |

- Etiqueta arriba del valor. `h1` y `h2` con `text-wrap: balance`. "…", no "..."
- Castellano rioplatense y palabras del dominio (SPECS §2): fiado, cobro, arqueo, caja
  chica, boletas, rendición.

## 4. Forma, espacio y elevación

- **Radios, una escala:** 8 px (`rounded-lg`) para la pastilla del segmentado y la barra
  lateral; 12 px (`rounded-xl`) para botones, campos, filas, avisos y tarjetas dentro del
  tablero; 16 px (`rounded-2xl`) para tarjetas de sección y el diálogo; 20 px arriba de las
  hojas. Pastilla (`rounded-full`) solo para chips, avatares, íconos redondos y el indicador
  de la barra inferior.
- **Toques:** todo lo tocable mide 44 px o más; los botones de acción, 48 px; guardar y
  arquear, 56 px.
- **Espacio:** márgenes laterales de 16 px en el celular; grilla de 4 px de Tailwind.
- **Elevación declarada una vez:** `shadow-tarjeta` es un filo de 1 px en `borde` más una
  sombra corta con offset; en oscuro, solo el filo. Hojas: `shadow-flotante`. El diálogo de
  escritorio suma el filo para despegarse del fondo atenuado.
- **Capas (z-index):** barra inferior 30, hoja 40, toast 50. No hay otras.

## 5. Estructura y navegación

- **Celular:** barra de arriba en grafito (marca en Inicio, título en las demás), contenido,
  y **barra inferior translúcida** (`vidrio`: el contenido pasa por debajo; sólida si el
  sistema pide menos transparencia) con cuatro destinos: Inicio, Cargar, Arqueo, Fiados. El
  activo lleva un fondo azul suave detrás del ícono que viaja de un destino a otro.
- **Escritorio (1024 px o más):** **barra lateral** en grafito con la marca, los mismos
  cuatro destinos, el usuario, tema y salir. El contenido va a un máximo de 1024 px.
- Navegación por hash (`#arqueo`, `#carga-rapida`, `#cuenta-corriente`): el botón atrás
  del celular funciona y cada pantalla tiene su URL. Al cambiar, vuelve arriba.
- **Inicio** es un tablero: el grafito con saludo, fecha, estado del día, las dos cajas y
  las cuatro cargas rápidas en círculos translúcidos. Debajo, una hoja clara que sube sobre
  el grafito con el estado del día y los fiados más grandes.
- **Caja del tablero:** etiqueta arriba, monto grande a la izquierda, boletas a la derecha y
  una línea al pie con el esperado. **Caja chica sin ticket (D27, SPECS §7.3):** chip "Sin
  ticket", solo las boletas en grande y al pie "Efectivo: al cargar el ticket". Nunca un
  efectivo parcial: antes del ticket puede dar negativo. Se sabe porque la caja operativa
  llega con `esperado` nulo.

## 6. Componentes compartidos

Seis, el máximo del track B: `Boton`, `Aviso`, `CampoMonto`, `Segmentado` y `Hoja` en
`ui.tsx`, y `Carga` (la hoja de carga, la usan Inicio y Carga rápida) en
`pantallas/CargaRapida.tsx`. Todo lo demás es local a su pantalla.

Patrones:

- **Estados de toda consulta:** cargando (esqueleto con la forma de lo que reemplaza),
  error (`Aviso` con Reintentar cuando se puede), vacío (una línea que dice qué hacer).
- **Botón bloqueado = motivo a la vista.** El arqueo dice qué falta ("Para arquear,
  completá la caja y el efectivo contado.") o por qué no se puede (turno sin ticket).
  Cobrar sin caja chica abierta, lo mismo.
- **Opción elegida** (caja del arqueo, tipo de pago): borde azul de 2 px y fondo azul al 8 %.
- **Pago (D18):** tres opciones, "MP / transferencia" elegida por defecto, "Retiro del
  dueño" y "Gasto".
- **Resultado del arqueo (D2):** cabecera en color de estado ("Cierra" o "No cuadra") y
  abajo, en neutro, esperado y diferencia de efectivo, esperado y diferencia de boletas, y
  la "Diferencia total". Una diferencia distinta de cero va en naranja. Cuadra solo si las
  dos dan cero.
- **Cuenta corriente:** la columna de días se ve siempre en el celular (el avatar se
  esconde antes que los días). Saldo a favor: valor absoluto en verde con "a favor". El
  detalle abre en hoja en el celular y en un panel fijo en escritorio.
- **Arqueo a ciegas:** el formulario no muestra el saldo esperado antes de contar.

## 7. Movimiento

`motion` con `LazyMotion` + `m` y `MotionConfig reducedMotion="user"`. Presupuesto: nada
que se vea decenas de veces por turno dura más de 200 ms. **Los montos no se animan.**

| Qué | Cómo | Duración | Por qué |
|---|---|---|---|
| Toque | `presiona`: escala 0,97 al apretar | 140 ms | Confirma el toque en todo lo tocable |
| Cambio de pantalla | Solo opacidad | 160 ms | Se navega todo el tiempo: sin deslizar |
| Indicador activo (barras, segmentado) | `layoutId`, resorte sin rebote | 300 ms | Muestra de dónde a dónde |
| Hoja (celular) | Sube desde abajo con la curva de iOS; al soltarla, sale con un resorte que hereda la velocidad del dedo | 280 ms / 250 ms | Sin costura entre arrastre y animación |
| Diálogo (escritorio) | Opacidad y escala desde 0,96 | 200 ms / 150 ms | Nunca desde escala 0 |
| Aviso | Opacidad y 4 px hacia abajo | 200 ms | Aparece sin empujar |
| Toast de carga guardada | Baja desde arriba, sale por el mismo lado a los 4 s | 250 ms | Confirma sin tapar la próxima carga |
| Resultado del arqueo | Escala desde 0,97, resorte sin rebote; el tilde se dibuja | 350 ms | El momento del día: se ve cuatro veces |
| Error de login | Sacudida con WAAPI | 300 ms | No remonta el formulario ni pierde el foco |
| Cambio de tema | Fundido de toda la página (View Transitions) | 200 ms | Sin él, cada superficie cambia a destiempo |

Con `prefers-reduced-motion` se apagan el esqueleto, la escala del toque, la transición de
tema, la sacudida y el scroll suave; motion reduce lo suyo a opacidad.

Descartado a propósito: contar montos, escalonar listas, deslizar entre pantallas, levantar
tarjetas en hover y la onda en bucle del punto "abierto" (distrae: quedó fijo).

## 8. Íconos

`lucide-react`, trazo 2, 20 px en filas y botones, 24 px en tarjetas y accesos. Cada tipo de
movimiento tiene su ícono y su color en `TIPOS` (fiado: libreta en naranja; cobro: mano
con monedas en verde; MP, retiro y gasto en rojo; premio: trofeo blanco sobre grafito).
Los íconos son decorativos (`aria-hidden`): el texto siempre está al lado. Los botones
de solo ícono (tema, salir, cerrar) llevan `aria-label`.

## 9. Accesibilidad y celular

- Foco visible en todo (`:focus-visible`, 2 px, `acento-texto`; blanco sobre el grafito).
- Formularios con `<form>`: Enter guarda en todas las pantallas.
- Hojas con `role=dialog`, `aria-modal`, título enlazado, Escape y foco devuelto; su
  contenido no arrastra el scroll de la página (`overscroll-behavior: contain`).
- Mensajes anunciados (`role=alert` para errores, `role=status` y `aria-live` para lo demás).
- `color-scheme` por tema; `theme-color` sigue al tema desde `util.ts`.
- Sin resaltado de toque ni pull-to-refresh; los controles no seleccionan su texto al
  mantener apretado. Campos de 16 px o más: el iPhone no hace zoom al enfocar.
