# Temas visuales

La apariencia se elige en **Medidas → Apariencia** y se conserva en este
dispositivo. Oscuro es el valor predeterminado; Claro es una paleta independiente.

## Añadir un tema

1. Añade su `id`, `label`, `colorScheme` y `browserColor` a
   `src/app/theme/themes.ts`. El selector y el tipo `ThemeId` se actualizan solos.
2. Define todos los tokens de `palettes.css` en `:root[data-theme='tu-id']`.
   Usa canales RGB separados por espacios, sin `rgb()`, para mantener las
   opacidades de Tailwind. Incluye sombras y contraste del texto sobre acentos.
3. Comprueba texto, botones, campos, gráficos y diálogos en móvil y escritorio.

No añadas condiciones de tema a componentes. Usa `bg-canvas`, `bg-surface`,
`bg-raised`, `text-content`, `text-muted`, `bg-accent`, `text-onAccent` o las
clases compartidas (`app-card`, `input`, `btn-primary`).

Los nombres históricos `ink`, `charcoal`, `graphite`, `slateDeep`, `mint` y
los tonos de texto `slate` son alias de compatibilidad. `text-white` representa
texto principal; `bg-white/…` y `border-white/…` representan una capa neutra.
Los nuevos componentes deben preferir nombres semánticos.

Los colores de la diana y de los grupos musculares representan datos, no la
apariencia de la aplicación: no se invierten al cambiar el tema. Blanco físico
se reserva para casos como el indicador de un interruptor.

`ThemeProvider` aplica la preferencia, actualiza `color-scheme` y el color del
navegador, y sincroniza pestañas. El arranque en `index.html` lee la misma clave
antes de cargar estilos para evitar un destello del tema incorrecto. No contiene
una lista de temas: la validación central se hace en `themes.ts` al iniciar la app.
