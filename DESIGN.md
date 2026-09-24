# DESIGN.md: Quiniela La Estrella

El sistema de diseño de esta app, no de otra. Los tokens viven en `web/src/index.css`
(`@theme`), los componentes compartidos en `web/src/ui.tsx`. Si algo de acá y el código no
coinciden, manda el código y se corrige este archivo.

## 1. Dirección

**Un tablero de noche con una estrella dorada.** El nombre del negocio da la metáfora: el
azul noche es el tablero donde se lee la plata del día; el dorado es la estrella, y marca
una sola cosa por vista: la acción principal.

- **Quién la usa:** Marisa y el dueño, en el mostrador, con el celular en una mano y la
  plata en la otra, decenas de veces por turno. Primero celular (390 px), después escritorio.
- **Qué tiene que sentirse:** una app de banco argentina (Mercado Pago, Ualá, Revolut),
  no una planilla. Números grandes, toques cortos, respuesta inmediata.
- **Qué no es:** una landing. Nada de gradientes decorativos, glassmorphism, blobs de luz
  ni tarjetas dentro de tarjetas. Se probaron halos de luz sobre la noche y quedaban como
  una mancha gris: se sacaron.

## 2. Color

Los colores son **roles**, no tonos: el tema oscuro reasigna los mismos nombres. Nunca se
escribe un hex en un componente.

| Token | Claro | Oscuro | Para qué |
|---|---|---|---|
| `lienzo` | #f2f3f7 | #0b1020 | Fondo de la página |
| `superficie` | #ffffff | #141b2e | Tarjetas, hojas, barra inferior |
| `superficie-2` | #eceef3 | #1c2438 | Campos, filas en hover, segmentado |
| `tinta` | #121826 | #eef0f6 | Texto |
| `tinta-suave` | #525b6e | #a3abbd | Etiquetas, detalle, ícono inactivo |
| `borde` | #dfe2ea | #262f45 | Separadores (se usan poco) |
| `noche` | #101a33 | #151f3c | Tablero, barra de arriba, barra lateral, login |
| `noche-2` | #1d2a4d | #22305a | Tarjetas sobre la noche |
| `en-noche` / `en-noche-suave` | #fff / #b7bac2 | igual | Texto sobre la noche |
| `estrella` | #f4b73f | #f6c14f | Acción principal, pastilla activa, marca |
| `estrella-fuerte` | #e9a521 | #f8cd6e | Hover de la acción principal |
| `en-estrella` | #101a33 | igual | Texto sobre dorado: siempre azul noche |
| `foco` | #101a33 | #f6c14f | Anillo de foco (sobre la noche, dorado) |
| `exito` / `-suave` | #13794b / #e3f4ec | #4cc98a / #10291f | Cierra, cobro, abierto |
| `peligro` / `-suave` | #c42b2b / #fbe7e6 | #ff7a70 / #33161a | Error, plata que sale |
| `aviso` / `-suave` | #b54708 / #fdf0da | #ff9d4d / #2e2210 | Diferencia, pendiente, fiado |

Reglas:

- **El dorado nunca es texto sobre blanco** (1,8:1). Va de fondo, con texto `en-estrella`
  (9,6:1). Sobre la noche sí puede ser ícono o texto (9,6:1).
- **Una sola acción dorada por vista.** Lo demás es secundario (`superficie-2`) o fantasma.
- **Color de estado = significado, no decoración.** Verde es "cierra / entró plata",
  rojo es "error / salió plata", naranja es "mirá esto". Nunca un verde para adornar.
- Contraste medido: todo par de texto usado da 4,5:1 o más en los dos temas (el más justo
  es `peligro` sobre `peligro-suave`, 4,74).
- Tema: por defecto el del sistema; la elección se guarda en `localStorage`
  (`quiniela-tema`). Un script en `index.html` lo aplica antes de pintar (sin parpadeo) y
  `theme-color` sigue al tema para que la barra del navegador sea parte de la noche.

## 3. Tipografía

**Geist** (variable, `@fontsource-variable/geist`, 29 kB latin woff2, servida desde el
propio bundle). Se eligió sobre Inter por las cifras: los montos se leen más compactos y
con más carácter, y tiene el aire de producto financiero que pide la dirección.

- Cifras tabulares en todo el `body` (`font-variant-numeric: tabular-nums`): los montos
  no bailan al cambiar ni al alinear columnas.
- Todo monto pasa por `pesos()` (`util.ts`). El frontend no calcula plata.
- Escala, sin tokens propios (se usan las clases de Tailwind):

| Uso | Tamaño | Peso |
|---|---|---|
| Monto héroe (caja del tablero, campo de carga) | 32 a 36 px | 600, `tracking-tight` |
| Saldo del cliente, resultado del arqueo | 24 a 36 px | 600 |
| Título de pantalla (escritorio) | 30 px | 600 |
| Título de hoja, barra de arriba | 18 px | 600 |
| Cuerpo, filas | 15 a 16 px | 500 |
| Etiqueta, detalle | 12 a 14 px | 500, `tinta-suave` |

- `h1` y `h2` con `text-wrap: balance`. Puntos suspensivos con "…", no "...".
- Textos en castellano rioplatense y con las palabras del dominio (SPECS §2): fiado,
  cobro, arqueo, caja chica, boletas, rendición.

## 4. Forma, espacio y elevación

- **Radios:** pastilla (`rounded-full`) para botones, chips, segmentado y la barra
  inferior; 16 px (`rounded-2xl`) para campos, filas y tarjetas chicas; 24 px
  (`rounded-3xl`) para tarjetas de sección y hojas. Un radio interno nunca es mayor que
  el del contenedor. (Pastillas y tarjetas de 20/24 px: de Revolut.)
- **Toques:** todo lo tocable mide 44 px o más; los botones de acción, 48 px (`h-12`);
  la acción del arqueo, 56 px.
- **Espacio:** márgenes laterales de 16 px en el celular; grilla de 4 px de Tailwind.
- **Elevación:** en claro, `shadow-tarjeta` (dos capas, azuladas, suaves) y
  `shadow-flotante` para hojas. En oscuro no hay sombras: la elevación la da la superficie
  más clara y un anillo de 1 px al 4 %.
- **Capas (z-index):** barra inferior 30, hoja 40, toast 50. No hay otras.

## 5. Estructura y navegación

- **Celular:** barra de arriba en `noche` (marca en Inicio, título en las demás), contenido,
  y **barra inferior** con cuatro destinos: Inicio, Cargar, Arqueo, Fiados. El activo
  lleva una pastilla dorada detrás del ícono que viaja de un destino a otro (`layoutId`).
- **Escritorio (1024 px o más):** **barra lateral** en `noche` con la marca, los mismos
  cuatro destinos, el usuario, tema y salir. El contenido va a un máximo de 1024 px.
- Navegación por hash (`#arqueo`, `#carga-rapida`, `#cuenta-corriente`): el botón atrás
  del celular funciona y cada pantalla tiene su URL. Al cambiar, vuelve arriba.
- **Inicio** es un tablero: la noche con saludo, fecha, estado del día, las dos cajas con
  el efectivo en grande y las cuatro cargas rápidas en círculos dorados. Debajo, una hoja
  clara que sube sobre la noche (`-mt-6 rounded-t-3xl`, el gesto de las apps de banco)
  con el estado del día y los fiados más grandes.

## 6. Componentes compartidos

Seis, el máximo del track B. Todo lo demás es local a su pantalla.

| Componente | Dónde vive | Qué resuelve |
|---|---|---|
| `Boton` | `ui.tsx` | Primario (dorado), secundario, fantasma; `cargando` pone un spinner y lo bloquea. Deshabilitado primario: gris de superficie, no dorado apagado |
| `Aviso` | `ui.tsx` | Mensaje en línea con ícono: error (`role=alert`), éxito, aviso, info (`role=status`); acepta una acción (Reintentar) |
| `CampoMonto` | `ui.tsx` | Pesos enteros: teclado numérico, solo dígitos, separador de miles mientras se escribe, "$" adelante, anillo de foco en el contenedor |
| `Segmentado` | `ui.tsx` | Elección entre 2 o 3 opciones (turno, orden) con una pastilla que viaja; opciones deshabilitadas con detalle |
| `Hoja` | `ui.tsx` | Hoja desde abajo en el celular (se cierra arrastrando, con Escape o tocando afuera) y diálogo centrado en escritorio; bloquea el scroll y devuelve el foco |
| `Carga` | `pantallas/CargaRapida.tsx` | El formulario de carga (fiado, cobro, pago, premio) en una hoja, con búsqueda de cliente y toast de guardado. Lo usan Inicio y Carga rápida |

Piezas que no son componentes compartidos: `TIPOS` (nombre, ícono y color de cada tipo de
movimiento), `AVATAR` (clase de la inicial del cliente), y las utilidades CSS `presiona`,
`esqueleto` y `vivo`.

Patrones:

- **Estados de toda consulta:** cargando (esqueleto con la forma de lo que reemplaza),
  error (`Aviso` con Reintentar cuando se puede), vacío (una línea que dice qué hacer).
- **Botón bloqueado = motivo a la vista.** El arqueo dice qué falta ("Para arquear,
  completá la caja y el efectivo contado.") o por qué no se puede (turno sin ticket).
  Cobrar sin caja chica abierta, lo mismo.
- **Pago (D18):** tres opciones como tarjetas de radio, "MP / transferencia" elegida por
  defecto, "Retiro del dueño" y "Gasto".
- **Cuenta corriente:** la columna de días se ve siempre en el celular (el avatar se
  esconde antes que los días). Saldo a favor: valor absoluto en verde con "a favor", nunca
  "-$ a favor". El detalle abre en hoja en el celular y en un panel fijo en escritorio.
- **Arqueo a ciegas:** el formulario no muestra el saldo esperado antes de contar; el
  esperado aparece en el resultado.

## 7. Movimiento

Librería: `motion` con `LazyMotion` + `m` y `MotionConfig reducedMotion="user"`.
Presupuesto: nada que se vea decenas de veces por turno dura más de 200 ms.

| Qué | Cómo | Duración | Por qué |
|---|---|---|---|
| Toque | `presiona`: escala 0,97 al apretar | 140 ms | Confirma el toque en todo lo tocable |
| Cambio de pantalla | Solo opacidad | 160 ms | Se navega todo el tiempo: sin deslizar |
| Pastilla activa (barra, segmentado) | `layoutId`, resorte sin rebote | 300 ms | Muestra de dónde a dónde |
| Hoja (celular) | Sube desde abajo, curva de iOS; arrastre para cerrar | 280 ms / 200 ms salida | Gesto conocido de Mercado Pago y Revolut |
| Diálogo (escritorio) | Opacidad y escala desde 0,96 | 200 ms / 150 ms | Nunca desde escala 0 |
| Aviso | Opacidad y 4 px hacia abajo | 200 ms | Aparece sin empujar |
| Toast de carga guardada | Baja desde arriba, se va a los 4 s | 250 ms | Confirma sin tapar la próxima carga |
| Resultado del arqueo | Resorte con rebote leve; el tilde se dibuja | 450 ms | El momento del día: se ve cuatro veces |
| Error de login | Sacudida con WAAPI | 300 ms | No remonta el formulario ni pierde el foco |
| Cambio de tema | Fundido de toda la página (View Transitions) | 200 ms | Sin él, cada superficie cambia a destiempo |
| Estado vivo | Onda que sale de un punto | 2 s en bucle | Solo para "abierto ahora" (día, turno) |

Curvas: `--ease-salida` `cubic-bezier(0.23, 1, 0.32, 1)` para entrar y salir;
`--ease-hoja` `cubic-bezier(0.32, 0.72, 0, 1)` para hojas (curvas de Emil Kowalski).
Con `prefers-reduced-motion` se apagan el esqueleto, la onda, la escala del toque, la
transición de tema, la sacudida y el scroll suave; motion reduce lo suyo a opacidad.

Descartado a propósito: contar montos hacia arriba (un número de plata tiene que leerse
ya), escalonar la entrada de listas y botones de carga (se ven decenas de veces), deslizar
el contenido entre pantallas, y levantar tarjetas en hover.

## 8. Íconos

`lucide-react`, trazo 2, 20 px en filas y botones, 24 px en tarjetas. Cada tipo de
movimiento tiene su ícono y su color en `TIPOS` (fiado: libreta en naranja; cobro: mano
con monedas en verde; MP, retiro y gasto en rojo; premio: trofeo dorado sobre la noche).
Los íconos son decorativos (`aria-hidden`): el texto siempre está al lado. Los botones
de solo ícono (tema, salir, cerrar) llevan `aria-label`.

## 9. Accesibilidad

- Foco visible en todo (`:focus-visible`, 2 px, color `foco`; dorado sobre la noche).
- Formularios con `<form>`: Enter guarda en todas las pantallas.
- Hojas con `role=dialog`, `aria-modal`, título enlazado, Escape y foco devuelto.
- Mensajes anunciados (`role=alert` para errores, `role=status` y `aria-live` para lo demás).
- `color-scheme` por tema, para que los controles nativos y el scroll acompañen.
- `touch-action: manipulation` y sin resaltado de toque del navegador.

## 10. Referencias

- **Revolut** (el análisis que ocupaba este archivo antes): pastillas para botones,
  tarjetas de 20 a 24 px, fondo oscuro con un acento saturado, números grandes con
  tracking cerrado. Se tomó la actitud, no la paleta: el violeta de Revolut se cambió por
  la noche y la estrella de este negocio.
- **Mercado Pago y Ualá:** el tablero de saldo arriba con accesos circulares, la hoja
  clara que sube sobre el color, la hoja inferior para cargar.
- **Emil Kowalski** (animations.dev): curvas, duraciones cortas, `scale(0.97)` al tocar,
  nunca animar desde escala 0, sin animación en acciones de alta frecuencia.
