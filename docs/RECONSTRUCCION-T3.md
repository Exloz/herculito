# Reconstrucción de Herculito a partir de T3 Code

Análisis realizado el 23 de octubre de 2026 sobre `pingdotgg/t3code`, commit
`96ffd7aa5689f98adb166e20b86c4bfe75a2707a`. El checkout de consulta está en
`/home/opc/T3Code/.references/t3code`; no forma parte del repositorio de Herculito.
Es una lectura de sus patrones y restricciones, no una especificación exhaustiva de
cada integración, proveedor o plataforma de T3.

## Filosofía y consecuencias para el producto

T3 concentra el producto en el trabajo que está ocurriendo: la conversación, sus
acciones y su estado. La estructura permanece reconocible mientras el contenido cambia.
Sus instrucciones priorizan sistemas pequeños, rendimiento, acceso remoto y coherencia
entre superficies. Una operación debe tener entrada, salida, recuperación y una forma
de observar su resultado.

En Herculito el equivalente es la actividad: elegir una rutina, registrar series,
descansar, terminar y consultar el progreso. La actividad pertenece al dominio, no a la
pantalla que la está mostrando. Navegar no debe borrar una sesión. Un guardado local y
una sincronización pendiente son estados diferentes. La reconstrucción conserva esa
separación en `activity-sync` y hace visible su estado en la estructura de navegación.

Fuentes: [filosofía y revisión de superficies](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/AGENTS.md),
[arquitectura y propiedad del estado](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/docs/internals/overview.md).

## Estructura y prácticas observadas

- **Límites explícitos.** T3 separa aplicaciones, contratos, runtime compartido y adaptadores.
  Los clientes representan estado; el servidor posee ejecución, permisos y efectos.
  Herculito mantiene `app`, `features`, `shared` y su API independiente: no necesita adoptar
  el monorepo ni convertir los entrenamientos en RPC de agentes.
- **Modelo de dominio antes que componentes.** En T3 los comandos, eventos, proyecciones
  y efectos durables impiden que los reintentos dupliquen trabajo. Herculito ya tiene una
  cola de actividad y proyecciones. Los controles nuevos usan esos mismos caminos.
- **Estado de servidor y preferencias separados.** `state/query.ts` representa datos,
  actualización y errores, conservando el último resultado cuando corresponde;
  `uiStateStore.ts` guarda preferencias de presentación. En Herculito los hooks de datos
  siguen siendo dueños de cargas y errores; tema y plan semanal siguen siendo locales.
- **Composición y controles comunes.** T3 utiliza primitivas y variantes para que tamaños,
  foco y comportamiento no dependan de cada pantalla. Herculito conserva sus clases
  compartidas `app-card`, `input`, `btn-*`, y agrega componentes de estructura y búsqueda.
  Se adapta a sus convenciones actuales; T3 prefiere estilos en los componentes, mientras
  Herculito mantiene un sistema de clases semánticas compartidas en CSS.
- **Navegación estable y detalle contextual.** La barra lateral agrupa destinos y deja el
  contenido como centro del trabajo. Los detalles se despliegan a petición. En Herculito
  progreso y calendario obtienen rutas propias, y el editor semanal y los detalles de las
  rutinas siguen siendo desplegables.
- **Las acciones son las mismas desde distintas entradas.** T3 conecta menú, paleta y
  atajos con las operaciones comunes. Herculito utiliza un único registro `DESTINATIONS`
  para la navegación, los resultados de búsqueda y los nombres de las vistas.
- **Semántica consistente.** Nombre visible, etiqueta accesible y acción deben coincidir.
  Herculito distingue rutinas, sesiones deportivas, actividad y medidas corporales.
- **Pruebas de comportamiento.** T3 pide verificar invariantes y caminos reales, con casos
  de reconexión, compatibilidad y recuperación. La reconstrucción agrega pruebas de rutas,
  selección por teclado, búsquedas sin acentos, ausencia de resultados y restitución del foco.

Fuentes: [UI y composición](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/docs/internals/web-ui.md),
[estado de consultas](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/apps/web/src/state/query.ts),
[preferencias](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/apps/web/src/uiStateStore.ts),
[nombres de acciones](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/docs/internals/consistency-action-names.md).

## Diseño y detalles de interacción

1. Planos diferenciados por contraste de superficie, elevación, reflejos y bordes suaves.
   La dirección Agenda seleccionada combina grafito cálido, arcilla y lavanda;
   el tema claro usa un fondo cálido y conserva la tarjeta principal oscura.
2. Tipografía de sistema, jerarquía por tamaño/peso y cifras legibles. Las cabeceras
   dejan de repetir la marca y controles de cuenta en cada página.
3. Barra lateral en escritorio y una barra inferior con seis destinos en móvil.
   La administración se ofrece en escritorio y en la búsqueda para administradores.
4. Búsqueda con Ctrl/Cmd+K o botón. Flechas para seleccionar, Enter para abrir, Escape
   para cerrar. La consulta ignora acentos. Tema accesible desde la cabecera y la búsqueda.
5. Un menú modal mantiene el foco y lo devuelve al cerrar; no se abre encima de un editor
   que ya tiene su propio diálogo. Las páginas actualizan el título y reciben foco de
   navegación sin desplazar el contenido inesperadamente.
6. Una acción principal por contexto: empezar/continuar la sesión, crear rutina, iniciar
   deporte o registrar una medición. Los detalles y opciones secundarias se despliegan.
7. El inicio muestra actividad del día, semana, resumen desplegable, rutinas y actividad reciente.
   Progreso y calendario se consultan directamente con `/progress` y `/calendar`.
8. Controles de registro con fuentes de entrada legibles en móvil y objetivos táctiles;
   el temporizador de descanso tiene posición propia en escritorio y se mantiene sobre
   la navegación en móvil.
9. Carga, vacío, error recuperable, desconexión, actualización y sincronización pendiente
   tienen presentación explícita. Los fixtures de preview siguen separados de producción.

Fuentes: [estructura lateral](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/apps/web/src/components/AppSidebarLayout.tsx),
[modelo de la paleta](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/apps/web/src/components/CommandPalette.logic.ts),
[foco](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/docs/user/keyboard-focus.md),
[apariencia y movimiento](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/docs/user/appearance.md).

## Rendimiento: técnicas y límites

T3 limita snapshots, carga historia por páginas, utiliza suscripciones selectivas y
activa consultas cuando hay una vista que las necesita. Son optimizaciones dirigidas a
volúmenes concretos. No se puede concluir una mejora de memoria solo por enviar menos bytes.

Herculito conserva páginas y paneles diferidos, precarga de rutinas cuando el inicio está
listo y `content-visibility` en listas. La nueva búsqueda consulta un registro pequeño en
memoria: no descarga todas las rutinas o historiales para resolver un salto de navegación.
No se añadieron dependencias de interfaz. Se elimina la maquinaria de espaciadores y
restitución de scroll de las antiguas pestañas del inicio. Se reducen animaciones y se
respeta la preferencia de movimiento reducido. No se afirma una mejora cuantificada de
rendimiento sin benchmark.

Fuente: [regresiones de rendimiento](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/docs/internals/performance-regressions.md).

## Decisiones que no se trasladan literalmente

- Effect, átomos, Zustand, React Compiler, TanStack Router, Base UI y Tailwind 4 responden
  al tamaño y stack de T3. Herculito mantiene React 18, navegación por pathname, hooks y
  Tailwind 3. Una reconstrucción visual no exige migrarlos todos.
- Adaptadores de proveedores, Electron, terminales, worktrees y eventos de orquestación
  no pertenecen al dominio de seguimiento físico.
- La densidad de una herramienta de desarrollo no justifica reducir los controles de
  peso, repeticiones o puntuación de una app usada durante el ejercicio.
- Temas y plan semanal son preferencias del dispositivo. La interfaz no promete que ese
  plan se sincronice entre dispositivos; el editor lo declara explícitamente.
- Autenticación y contratos de la API no cambian. La preview permite validar interfaz y
  flujos locales; no acredita OAuth real, notificaciones remotas ni sincronización real.

## Mantenimiento

- `src/app/navigation/destinations.ts`: destinos y etiquetas compartidos.
- `src/app/navigation/WorkspaceShell.tsx`: estructura, cabecera y atajo de búsqueda.
- `src/app/navigation/Navigation.tsx`: navegación adaptativa y estado de sincronización.
- `src/app/navigation/CommandMenu.tsx`: interacción de búsqueda y foco.
- `src/app/workspace.css`: geometría de la estructura y tratamientos compartidos.
- `src/app/theme/palettes.css`: tokens semánticos claro/oscuro.
- `src/index.css`: controles comunes, estilos específicos y movimiento.
- Las páginas conservan sus hooks de dominio y los portales/focus traps existentes.

Comprobaciones: `pnpm exec tsc -b`, `pnpm lint`, `pnpm test`, `pnpm build`.
Pruebas de navegador mediante T3 preview con datos locales y escenarios vacíos.

Resultados de esta reconstrucción:

- 67 archivos de pruebas y 499 pruebas aprobadas (incluida la dirección Agenda).
- TypeScript, ESLint y compilación de producción con service worker aprobados.
- Navegador: edición de rutina; registro de una serie con cambio de peso; navegación y
  reanudación conservando esa serie; finalización con confirmación; guardado de medida;
  inicio, ronda, reanudación y finalización de tiro con arco; inicio, pausa y abandono de
  HIIT; búsqueda por teclado; cambio de tema; cambio de mes y estado vacío.
- Revisión visual de escritorio (1440 px) y móvil (375/390 px); cabecera y calendario sin
  desbordamiento horizontal a 320 px. Última carga limpia de la preview sin errores de consola.
- Cambios limitados al frontend. No se modificó la API.

## Refinamiento de claridad y jerarquía

La sesión del día se sitúa antes del resumen estadístico. Las métricas usan una fila
sin tarjetas individuales y los grupos de rutinas evitan repetir categoría, icono y
título. La información secundaria usa texto y separación, en lugar de una cápsula por
dato. El mantenimiento de videos queda después de las rutinas.

Los bordes de superficies y divisores son más discretos; controles, foco y estados de
error conservan sus señales. La selección en navegación se identifica con una superficie tintada,
el calendario conserva puntos de actividad y destaca un único día seleccionado, y el
check de una serie completada lleva el énfasis. El peso anterior tiene una descripción
con su valor, también accesible al editarlo.

`ActivitySyncStatus` observa la cola existente sin iniciar otro planificador. Distingue
sin conexión, cambios pendientes, errores y sincronización al día. En móvil mantiene
su nombre accesible y un indicador compacto; los errores siguen ofreciendo el aviso
con la acción de recuperación. Las notificaciones usan una superficie neutra y color
en el icono, en lugar de teñir todo el mensaje. La reducción de ruido visual no oculta
acciones en móvil ni elimina el foco de teclado o las etiquetas accesibles.

## Prioridad móvil

El móvil es la referencia principal. El inicio reduce el saludo y presenta el resumen
estadístico como una fila desplegable. Sin plan y con rutinas disponibles, «Elegir
rutina» lleva el foco y el desplazamiento al selector de entrenamiento del propio
inicio. La planificación sigue accesible y el descanso explícito conserva su sentido.

La cabecera deja búsqueda y opciones; cuenta, apariencia, cierre de sesión y acceso
administrativo se reúnen en una hoja inferior con bloqueo de scroll, Escape y retorno
de foco. Los seis destinos principales siguen disponibles en la barra inferior.

La sesión usa una cabecera compacta estable con nombre, tiempo y progreso, sin el
observador de scroll ni las transiciones que cambiaban su altura. Cada ejercicio
reduce insignias y explicaciones repetidas; completar una serie mide 48 px y los
controles de peso mantienen al menos 44 × 48 px. El temporizador reúne sus controles
en una fila para cubrir menos contenido. El editor elimina contenedores e indicadores
duplicados y mantiene guardar/cancelar visibles con altura reducida.

Se revisaron 320 × 740 y 390 × 844 px, además del editor a 390 × 440 px: sin scroll
horizontal, campos de texto a 16 px y acciones del formulario dentro de la pantalla.
Se comprobó iniciar, registrar una serie, navegar, reanudar conservando la serie y
finalizar con confirmación. Son comprobaciones de navegador con datos locales;
el teclado nativo, OAuth y push real requieren dispositivos y servicios reales.

## Profundidad y carácter visual

La reducción inicial de ruido se llevó demasiado lejos: las superficies perdieron
contraste, volumen y personalidad. Esa planitud no es una regla de T3 Code. Su CSS
incluye reflejos internos en controles, sombras específicas para el compositor,
tratamiento de uniones entre superficies, transparencia y desenfoque en capas
flotantes. Son recursos que construyen jerarquía además de los bordes.

Fuente: [tokens de elevación, vidrio y reflejos de T3](https://github.com/pingdotgg/t3code/blob/96ffd7aa5689f98adb166e20b86c4bfe75a2707a/apps/web/src/index.css).

La dirección revisada es propia de Herculito y aprovecha la libertad de color
indicada por el usuario:

- En la primera propuesta de profundidad, fondo azul tinta y superficies azul pizarra en oscuro; fondo piedra cálido y
  tarjetas de papel en claro. Tarjetas, campos y capas flotantes tienen niveles
  distintos de luminancia y sombra.
- La sesión principal es una superficie oscura con iluminación lavanda, acción en
  lima y un motivo orbital decorativo sin datos ficticios. Sus textos mantienen
  colores propios en ambos temas para preservar el contraste.
- Lavanda, albaricoque y cielo distinguen grupos y deportes. Los colores de los
  grupos se reutilizan en el selector, las rutinas y la leyenda del calendario;
  siguen acompañados de nombres y etiquetas.
- Las tarjetas usan sombras suaves y reflejos superiores; los campos se perciben
  hundidos y los controles elevados. La barra inferior tiene separación visual,
  transparencia y una selección tintada. El temporizador y los diálogos ocupan
  un plano superior.
- El color no reemplaza los estados: completar conserva el check, seleccionar
  conserva `aria-current`/`aria-pressed`, y pendientes y errores conservan sus
  etiquetas y acciones. Se mantiene la prioridad móvil y el movimiento reducido.

Revisión de esta iteración: temas claro y oscuro a 320/390 px, sesión y descanso,
rutinas/editor con altura reducida, deportes, progreso y calendario. Los pares de
texto y superficies base se comprobaron por contraste; las capas combinadas se
revisaron en navegador. La suite de pruebas, TypeScript, ESLint y el build con
service worker siguen aprobados. No se añaden dependencias ni se altera la API.

## Dirección seleccionada: C / Agenda

Tras comparar tres prototipos, el usuario eligió la propuesta C y pidió adaptarla
también al modo oscuro. Esta dirección sustituye la presentación anterior del bloque
de rutinas, actividad reciente y comunidad:

- La rutina presenta grupo, nombre, ejercicios y series reales, con dos botones de
  texto: «Ver ejercicios» y «Empezar». Los detalles conservan el listado, la autoría
  y el ajuste de grupo permitido para las rutinas propias. No se inicia una rutina
  sin ejercicios. El selector de grupos usa un control segmentado desplazable.
- `RecentActivity` representa las tres sesiones recientes como una línea temporal,
  sin una tarjeta contenedora grande. «Ver las N sesiones» despliega las entradas
  disponibles en el dashboard y «Mostrar menos» las contrae. No promete cargar un
  historial distinto ni inventa duraciones faltantes. Las fechas respetan Bogotá y
  muestran el año cuando la lista atraviesa años distintos.
  Incluyen el día de la semana, y un icono pequeño del grupo muscular o deporte
  acompaña cada nombre sin añadir una cápsula ni repetir etiquetas accesibles.
- La comunidad vacía ocupa una sola fila desplegable. La ausencia de clasificación
  se distingue de datos no disponibles. Cuando hay posiciones, se mantienen visibles
  los líderes y el puesto personal, incluso si no hay líder en un periodo.
- Claro: papel cálido, tinta, lavanda y arcilla. Oscuro: grafito con un matiz ciruela,
  superficies elevadas, texto marfil, lavanda y arcilla clara. Los tokens adaptan
  también botones y navegación para que la sección encaje con el resto de la app.
  El color inicial del documento y del manifiesto PWA coincide con el grafito del
  tema oscuro; el selector de tema sigue actualizando el color del navegador.

Verificación: 499 pruebas en 67 archivos; TypeScript, lint y build con service worker.
Navegador: claro/oscuro en 320/390 px y escritorio; títulos largos; grupos propios y
públicos; expansión y cierre de ejercicios, historial y comunidad; empezar una
rutina, registrar una serie, navegar, reanudarla y finalizar con confirmación.

## Revisión final · v2.73.0

- Controles secundarios y cierre de notificaciones con un área táctil de al menos
  44 px; acciones principales de al menos 48 px en móvil. El interruptor de rutinas
  públicas conserva su aspecto compacto dentro de un botón de 44 × 44 px.
- Márgenes laterales corregidos para respetar el lado correspondiente del recorte
  de pantalla. La hoja de cuenta muestra la versión y permite desplazarse con
  poca altura, conservando Escape y el retorno de foco.
- Textos secundarios unificados con «Inicio». Una rutina planificada sin ejercicios
  ofrece «Revisar rutina» y abre la biblioteca antes de permitir el entrenamiento.
- Revisión de las seis vistas principales en claro/oscuro a 320 px, sin
  desbordamiento horizontal ni campos de texto inferiores a 16 px; editor a
  390 × 440 px y hoja de cuenta a 320 × 320 px. Verificados el interruptor de
  visibilidad y la configuración, ronda, entrada y finalización de tiro con arco.
- Validación de la entrega: 500 pruebas en 67 archivos, ESLint, TypeScript y build
  de producción con service worker. La versión se incrementa de 2.72.0 a 2.73.0.
- Verificación posterior al despliegue: el tema inicial se aplica mediante
  `public/theme-init.js`, permitido por la CSP de producción, antes de cargar los
  estilos. Se elimina el script inline bloqueado sin ampliar la política CSP.

## Resumen de actividad · v2.73.1

El resumen móvil integra cabecera y métricas en una única superficie con profundidad
suave. Al expandirse, «Tu actividad» sustituye el contador de la cabecera para no
repetir la cifra semanal. La semana recibe el énfasis principal; las demás cifras
mantienen texto neutro, unidades junto al valor y contexto secundario debajo.
Se eliminan las barras verticales, los cuatro colores simultáneos y el espacio
excesivo entre la cabecera y las métricas. Sesiones y días respetan el singular.
El contador semanal sigue disponible para lectores de pantalla con el bloque cerrado.

La información real, el despliegue por teclado y la vista de cuatro columnas en
escritorio se conservan. Verificación visual en claro/oscuro a 320 y 390 px, con
controles de 52 px y sin desbordamiento horizontal.
Validación: 503 pruebas en 67 archivos, ESLint, TypeScript y compilación con service worker.

## Colección de temas · v2.74.0

La galería de Apariencia ofrece 14 paletas: Oscuro, Medianoche, Bosque, Amatista,
Cacao, Carbón y Aurora; Claro, Océano, Salvia, Lavanda, Arena, Rosa y Nieve.
Cada muestra representa fondo, superficie y acento. La selección se aplica al
instante y se conserva al cerrar, recargar o sincronizar la preferencia entre
pestañas del mismo navegador. La preferencia sigue siendo del dispositivo.

Se mantiene la estructura Agenda: elevación, campos, texto, acciones, estados y
sesión principal usan tokens semánticos. Las nuevas paletas adaptan también la
iluminación de la tarjeta principal y el color del navegador. El bootstrap externo
restaura los 14 temas antes de React y sigue siendo compatible con la CSP y el
precaché de la PWA. Las preferencias Oscuro/Claro anteriores siguen funcionando.

La galería admite selección por radio, teclado, Escape y retorno de foco. Su
cabecera y «Listo» permanecen visibles mientras se desplazan las muestras. Si se
abre desde Cuenta, solo la galería es modal; cerrarla conserva el menú y su bloqueo
de scroll. Los temas también aparecen como acciones buscables por nombre.

Verificación de contraste en navegador: texto principal, secundario, tenue y acento
sobre fondo/superficie/tarjeta/elevación; texto de botones y tarjeta principal
iluminada. Los pares revisados superan 4.5:1 en las 14 paletas. La comprobación no
sustituye una auditoría completa de accesibilidad de todas las combinaciones de la app.

Validación: 534 pruebas en 68 archivos, ESLint, TypeScript y compilación con service
worker. Navegador: las 14 paletas en Inicio a 390 px; vistas principales a 320 px;
galería a 320 × 320 px y en escritorio; editor con altura reducida; flechas y Escape;
recarga de preferencia y cambio de tema durante un entrenamiento conservando la serie
registrada y el temporizador activo.
