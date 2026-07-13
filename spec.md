# Especificación del MVP - Alabanza App

## 1. Resumen

Alabanza App será una aplicación web instalable para que un grupo de alabanza mantenga su biblioteca de canciones, prepare arreglos por instrumento y ejecute setlists durante ensayos y servicios, incluso sin conexión.

El MVP debe resolver un flujo completo:

1. Registrar o importar una canción en formato ChordPro.
2. Editarla con vista previa inmediata.
3. Adaptar tono, notación y capo sin alterar el contenido fuente.
4. Añadir notas por sección e instrumento.
5. Agregar canciones a un setlist ordenado.
6. Abrir el setlist en modo escenario y usarlo sin conexión.

## 2. Objetivos

- Centralizar canciones y arreglos en una biblioteca fácil de buscar.
- Evitar copias distintas de una canción por cada tono o instrumento.
- Hacer legibles las canciones en teléfono, tablet y escritorio.
- Permitir preparación y ejecución sin depender de una conexión estable.
- Mantener los datos disponibles entre sesiones y, cuando Firebase esté configurado, entre dispositivos del mismo grupo.

## 3. Alcance del MVP

### Incluido

- Biblioteca de canciones con búsqueda y filtros básicos.
- Alta, edición, duplicado, archivado y eliminación de canciones.
- Editor de texto ChordPro y vista previa sincronizada.
- Validación básica del documento ChordPro.
- Transposición por semitonos.
- Notación inglesa y latina.
- Capo independiente por canción dentro de un setlist.
- Vistas general, guitarra, piano, bajo y batería.
- Notas globales, por instrumento y por sección.
- Setlists ordenables con configuración individual de cada canción.
- Modo escenario, navegación entre canciones y autoscroll configurable.
- PWA instalable con funcionamiento offline.
- Persistencia local con Dexie/IndexedDB.
- Sincronización con Firebase cuando haya conexión.

### Fuera del alcance

- Generación automática de tablaturas, partituras, digitaciones o voicings.
- Reproducción de pistas, metrónomo avanzado o secuencias MIDI.
- Proyección de letras para congregación.
- Edición simultánea en tiempo real del mismo documento.
- Historial completo de versiones y restauración granular.
- Roles y permisos avanzados, invitaciones y administración multiiglesia.
- Integraciones con Spotify, YouTube, Planning Center u otros catálogos.
- Importación automática desde PDF, imágenes o sitios externos.

## 4. Usuarios y permisos

### Roles del MVP

- **Miembro:** consulta biblioteca y setlists, cambia preferencias personales de visualización y usa modo escenario.
- **Editor:** además crea y modifica canciones, notas y setlists.
- **Administrador:** capacidad de editor y administración básica del espacio de trabajo.

Para no bloquear el desarrollo inicial, el sistema funcionará completamente en modo local. La sincronización compartida requerirá Firebase Authentication y pertenencia a un `workspace`. En el MVP se usará acceso por correo y contraseña; la gestión avanzada de invitaciones queda fuera de alcance y los miembros podrán darse de alta mediante un código de espacio de trabajo o ser provisionados manualmente.

## 5. Decisiones de producto

### Fuente de verdad musical

- `chordProSource` conserva el texto original introducido por el usuario.
- La transposición, la notación y el capo son transformaciones de presentación; nunca reescriben silenciosamente el original.
- Guardar una transposición como nuevo original debe ser una acción explícita.
- Los metadatos estructurados principales se almacenan también fuera del texto ChordPro para poder buscar y filtrar sin parsear toda la biblioteca.

### Tonalidad, transposición y capo

- `originalKey` es la tonalidad declarada en la canción fuente.
- `transposeSemitones` es un entero entre `-11` y `11`; `0` conserva la tonalidad original.
- `targetKey` se calcula a partir de `originalKey + transposeSemitones`.
- `capo` es un entero entre `0` y `11`.
- Los acordes mostrados al músico se calculan como `targetKey - capo`; el tono que suena continúa siendo `targetKey`.
- El usuario siempre verá ambos datos cuando haya capo: por ejemplo, `Suena en A · formas en G · capo 2`.
- La preferencia de sostenidos o bemoles seguirá la tonalidad objetivo y podrá corregirse manualmente.
- La transformación debe reconocer acordes menores, séptimas, extensiones, alteraciones, bajos invertidos y acordes sin nota raíz válida sin romper el texto.

### Notación inglesa y latina

- Inglesa: `C D E F G A B`.
- Latina: `Do Re Mi Fa Sol La Si`.
- Los modificadores se preservan: `C#m7/G#` se muestra como `Do#m7/Sol#`.
- El cambio es visual y puede ser una preferencia global del usuario o una configuración puntual del modo escenario.
- El contenido ChordPro guardado utiliza nombres normalizados en notación inglesa para simplificar parseo y sincronización.

### Vistas por instrumento

- **General:** letra, acordes y notas globales; puede mostrar todas las notas instrumentales bajo demanda.
- **Guitarra:** letra, acordes transpuestos, capo y notas de guitarra.
- **Piano:** letra, acordes en tonalidad real y notas de piano; el capo no altera sus acordes.
- **Bajo:** estructura, acordes o raíces y notas de bajo. En el MVP no se generan líneas de bajo.
- **Batería:** estructura y notas de batería; los acordes se ocultan por defecto, pero pueden activarse.

La vista seleccionada es una preferencia personal y no modifica la canción compartida.

## 6. Modelo de contenido

### Secciones musicales

Las secciones se identifican con una clave estable y una etiqueta visible. Tipos iniciales:

- Intro
- Verso
- Pre-coro
- Coro
- Puente
- Instrumental
- Interludio
- Solo
- Tag
- Outro
- Personalizada

El editor obtiene la estructura desde directivas ChordPro como `{start_of_verse}` y `{start_of_chorus}`. Las secciones personalizadas reciben un `sectionId` estable para enlazar notas sin depender únicamente del título o de la posición.

### Notas

Cada nota contiene:

- Texto libre.
- Alcance: global o instrumento.
- Instrumento opcional: guitarra, piano, bajo o batería.
- Sección opcional; si no existe, la nota aplica a toda la canción.
- Orden.
- Fecha y autor de la última modificación.

Las notas no se insertan dentro del texto ChordPro. Se guardan como datos estructurados para filtrarlas sin alterar la letra.

## 7. Modelo de datos

Todas las entidades sincronizables incluyen `id`, `workspaceId`, `createdAt`, `updatedAt`, `updatedBy`, `version` y `deletedAt`. Las fechas remotas se escriben con timestamp del servidor; las fechas locales usan ISO 8601 hasta confirmarse la sincronización.

### `workspaces`

```ts
type Workspace = {
  id: string;
  name: string;
  joinCode?: string;
  createdAt: string;
  updatedAt: string;
};
```

### `members`

```ts
type Member = {
  id: string;
  workspaceId: string;
  userId: string;
  displayName: string;
  role: "member" | "editor" | "admin";
  instrument?: "general" | "guitar" | "piano" | "bass" | "drums";
};
```

### `songs`

```ts
type Song = {
  id: string;
  workspaceId: string;
  title: string;
  artist?: string;
  originalKey?: string;
  tempo?: number;
  timeSignature?: string;
  tags: string[];
  chordProSource: string;
  sections: SongSection[];
  notes: SongNote[];
  preferredAccidental?: "sharp" | "flat";
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  deletedAt?: string;
};
```

### `setlists`

```ts
type Setlist = {
  id: string;
  workspaceId: string;
  name: string;
  serviceDate?: string;
  description?: string;
  items: SetlistItem[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  deletedAt?: string;
};

type SetlistItem = {
  id: string;
  songId: string;
  position: number;
  transposeSemitones: number;
  capo: number;
  preferredAccidental?: "sharp" | "flat";
  itemNotes?: string;
};
```

### `userPreferences`

```ts
type UserPreferences = {
  userId: string;
  notation: "english" | "latin";
  instrumentView: "general" | "guitar" | "piano" | "bass" | "drums";
  fontScale: number;
  showChordsOnDrums: boolean;
  autoScrollSpeed: number;
};
```

## 8. Arquitectura técnica

### Capas

- **Next.js App Router:** rutas, layouts y composición de interfaz.
- **Componentes de dominio:** biblioteca, editor, visor, setlists y escenario.
- **Servicios musicales:** parseo ChordPro, transposición, conversión de notación y cálculo de capo.
- **Zustand:** estado efímero de interfaz, preferencias activas del modo escenario y conectividad; no será la base de datos.
- **TanStack Query:** consultas, mutaciones, estados de carga y coordinación de sincronización remota.
- **Dexie/IndexedDB:** lectura y escritura local inmediata, cola de cambios y datos disponibles offline.
- **Firebase Auth + Firestore:** identidad, respaldo y sincronización entre dispositivos.
- **Serwist:** precache del shell, caché de navegación y fallback offline.
- **ChordSheetJS:** parseo/formateo ChordPro detrás de un adaptador propio.
- **Tone.js:** referencia tonal opcional; no debe cargarse hasta que el usuario solicite audio.

### Rutas propuestas

```text
/
/songs
/songs/new
/songs/[songId]
/songs/[songId]/edit
/setlists
/setlists/new
/setlists/[setlistId]
/stage/[setlistId]
/settings
/offline
```

### Estructura propuesta

```text
src/
  app/
  components/
    editor/
    songs/
    setlists/
    stage/
    ui/
  features/
    auth/
    songs/
    setlists/
    sync/
  lib/
    chordpro/
    firebase/
    db/
  stores/
  types/
```

## 9. Estrategia local-first y sincronización

### Escritura

1. La mutación valida los datos en el cliente.
2. Guarda inmediatamente la entidad en Dexie con estado `pending`.
3. Actualiza la interfaz de forma optimista.
4. Si hay conexión y sesión, agrega la operación a la sincronización con Firestore.
5. Al confirmarse, actualiza versión y timestamp local y elimina la operación de la cola.

### Lectura

- La UI observa Dexie para mostrar datos sin latencia y sin conexión.
- TanStack Query solicita cambios remotos al iniciar sesión, recuperar conexión, volver a enfocar la app o ejecutar una actualización manual.
- Los cambios remotos se normalizan y se escriben en Dexie; la UI se actualiza desde allí.

### Conflictos

- El MVP no ofrece edición colaborativa simultánea.
- Cada actualización envía la `version` conocida.
- Si la versión remota cambió, se conserva la versión más reciente por `updatedAt`, se guarda una copia local del contenido desplazado y se muestra una notificación de conflicto.
- Las eliminaciones usan `deletedAt` para propagarse sin perder inmediatamente la posibilidad de recuperación.
- Una cola con reintentos exponenciales conserva cambios tras cerrar o recargar la PWA.

### Firestore

Colecciones sugeridas:

```text
workspaces/{workspaceId}
workspaces/{workspaceId}/members/{userId}
workspaces/{workspaceId}/songs/{songId}
workspaces/{workspaceId}/setlists/{setlistId}
users/{userId}/preferences/default
```

Las reglas de seguridad deben comprobar autenticación, membresía y rol. Un miembro puede leer; editor y administrador pueden escribir canciones y setlists; solo administrador puede modificar membresías.

## 10. Requisitos funcionales y criterios de aceptación

### RF-01 Biblioteca de canciones

- Lista canciones por título con artista, tono original, etiquetas y fecha de edición.
- Permite buscar por título, artista o etiqueta sin conexión.
- Permite filtrar activas/archivadas y ordenar alfabéticamente o por actualización.
- Permite crear, duplicar, archivar y enviar a papelera con confirmación.
- Una canción creada offline aparece inmediatamente y se sincroniza después.

### RF-02 Editor ChordPro

- Presenta editor y vista previa lado a lado en escritorio y mediante pestañas en móvil.
- Actualiza la vista previa con un debounce máximo de 300 ms.
- Incluye inserción rápida de metadatos y secciones frecuentes.
- Señala errores parseables con línea y descripción sin perder el texto.
- Advierte antes de salir si existen cambios no guardados.
- Guarda borrador local automáticamente y permite guardado manual.

### RF-03 Transposición

- Permite subir o bajar en pasos de un semitono y restablecer al tono original.
- Transpone acordes simples, slash chords y extensiones sin modificar la letra.
- El resultado es consistente en editor, visor, setlist y modo escenario.
- La configuración del setlist no modifica la canción base.

### RF-04 Notación inglesa/latina

- Cambia todos los acordes visibles de inmediato.
- Conserva cualidades, extensiones, alteraciones y bajos.
- La preferencia persiste en el dispositivo y, con sesión, en el perfil.
- No altera el ChordPro fuente.

### RF-05 Capo

- Permite seleccionar capo de 0 a 11.
- Muestra tono real, formas tocadas y posición del capo.
- Solo cambia los acordes mostrados en la vista de guitarra.
- Persiste por elemento del setlist, no como cambio destructivo de la canción.

### RF-06 Vistas y notas por instrumento

- Cambiar de vista filtra las notas sin recargar la página.
- Cada sección puede contener una nota global y varias notas instrumentales.
- Las notas generales aparecen en todas las vistas.
- La vista de batería oculta acordes por defecto.
- La selección de instrumento se recuerda por usuario/dispositivo.

### RF-07 Setlists

- Permite crear setlist con nombre y fecha opcional.
- Permite agregar canciones desde la biblioteca, reordenarlas y quitarlas.
- Cada elemento guarda transposición, capo y nota específica del evento.
- Muestra duración estimada si las canciones tienen tempo/duración; la ausencia del dato no bloquea el setlist.
- El setlist completo puede abrirse offline una vez sincronizado o creado en el dispositivo.

### RF-08 Modo escenario

- Interfaz de alto contraste y controles grandes, sin navegación administrativa.
- Permite avanzar/retroceder canción y navegar a una canción concreta.
- Evita que la pantalla se apague mediante Wake Lock cuando el navegador lo soporte.
- Incluye ajuste de tamaño de letra y ocultación de acordes/notas.
- El autoscroll tiene iniciar/pausar, velocidad configurable de `0` a `100`, reinicio y ajuste manual sin saltos.
- La velocidad y posición pueden configurarse por canción durante la sesión; solo la velocidad predeterminada se persiste como preferencia.
- Si Wake Lock no está disponible, la sesión continúa y muestra una advertencia no bloqueante.

### RF-09 PWA y offline

- El navegador reconoce manifest, iconos, nombre, colores y modo standalone.
- El shell de la aplicación y la pantalla offline están precacheados.
- Biblioteca descargada, canciones y setlists se pueden abrir sin conexión.
- Crear o editar offline genera cambios pendientes visibles para el usuario.
- La app muestra estado `Sin conexión`, `Sincronizando`, `Actualizado` o `Conflicto`.
- Una actualización del service worker no interrumpe el modo escenario; se aplica al salir o mediante confirmación del usuario.

## 11. Diseño y experiencia

### Navegación principal

- Biblioteca
- Setlists
- Ajustes
- Indicador de sincronización/conectividad

### Responsive

- **Móvil:** navegación inferior, editor por pestañas y modo escenario a una columna.
- **Tablet:** objetivo principal del modo escenario; controles accesibles sin cubrir la canción.
- **Escritorio:** editor dividido, tablas/listas amplias y panel lateral de metadatos.

### Accesibilidad

- Contraste WCAG AA en vistas normales y de escenario.
- Navegación por teclado en editor, listas y diálogos.
- Objetivos táctiles mínimos de 44 x 44 px.
- Estados no comunicados únicamente por color.
- Escala de texto sin pérdida de controles o contenido.
- Respeto por `prefers-reduced-motion`.

## 12. Seguridad y privacidad

- Variables públicas de Firebase únicamente en `.env.local`; nunca incluir claves administrativas en el cliente.
- Reglas de Firestore deniegan acceso por defecto y validan `workspaceId` y rol.
- Validar límites de tamaño para ChordPro y notas antes de escribir local o remotamente.
- Renderizar la vista previa con una salida sanitizada; no aceptar HTML arbitrario desde ChordPro.
- No registrar letras, notas ni credenciales completas en logs de producción.
- La caché y IndexedDB se limpian al cerrar sesión solo tras advertir sobre cambios pendientes.

## 13. Pruebas

### Unitarias

- Conversión inglesa/latina.
- Transposición con sostenidos, bemoles, menores, extensiones y slash chords.
- Cálculo de tono real/formas/capo.
- Parseo de secciones y asociación de notas.
- Resolución de versiones y cola de sincronización.

### Integración

- CRUD de canción con Dexie.
- Edición offline seguida de sincronización.
- Creación y reordenamiento de setlist.
- Aplicación consistente de configuración del setlist al visor.
- Reglas de Firestore mediante emuladores.

### End-to-end

- Crear canción, previsualizarla y encontrarla en biblioteca.
- Crear setlist, transponer una canción, aplicar capo y abrir escenario.
- Recargar sin conexión y recorrer todo el setlist.
- Editar offline, recuperar conexión y verificar estado actualizado.
- Instalar la PWA en un navegador compatible.

### Matriz mínima manual

- Chrome Android.
- Safari iPhone/iPad, documentando limitaciones de PWA y Wake Lock.
- Chrome o Edge de escritorio.
- Pantallas desde 360 px hasta tablet horizontal.

## 14. Observabilidad y errores

- Error boundary por ruta con recuperación segura.
- Toasts breves para éxito y errores accionables; los estados persistentes de sincronización no dependen de toasts.
- Registro de errores técnicos sin contenido sensible.
- Acción `Reintentar` para sincronización fallida.
- Pantalla de diagnóstico simple con versión de app, estado de service worker, almacenamiento y última sincronización.

## 15. Plan de implementación

### Fase 0 - Base y convenciones

- Sustituir el dashboard de prueba por el shell de navegación.
- Definir tipos de dominio, validadores y repositorios.
- Migrar el esquema Dexie actual a entidades versionadas y cola de sincronización.
- Configurar Firebase Auth, Firestore, emuladores y reglas iniciales.
- Añadir framework de pruebas unitarias y end-to-end.

**Salida:** aplicación navegable, datos de prueba y persistencia local versionada.

### Fase 1 - Motor musical

- Crear adaptador de ChordSheetJS.
- Implementar parser de acordes, transposición, enarmonía y notación latina.
- Implementar cálculo de capo y modelo de secciones.
- Cubrir casos musicales con pruebas unitarias antes de conectar UI.

**Salida:** API interna estable que transforma una canción sin modificar su fuente.

### Fase 2 - Biblioteca y editor

- Construir listado, búsqueda, filtros y acciones CRUD.
- Construir formulario de metadatos y editor ChordPro responsive.
- Añadir preview, errores, autosave y protección de cambios.
- Añadir notas globales, por sección e instrumento.

**Salida:** una canción puede crearse, editarse, buscarse y consultarse completamente offline.

### Fase 3 - Visor musical

- Construir visor reutilizable de canción.
- Añadir selector de instrumento, notación, transposición y capo.
- Añadir escalado tipográfico y referencia tonal opcional con Tone.js.
- Verificar coherencia visual y musical en móvil/tablet.

**Salida:** cada músico puede obtener su vista correcta desde una única canción.

### Fase 4 - Setlists y escenario

- Implementar CRUD de setlists y selector de canciones.
- Implementar reordenamiento accesible y configuración por elemento.
- Construir modo escenario, navegación, Wake Lock y autoscroll.
- Evitar actualizaciones disruptivas del service worker durante una sesión.

**Salida:** un servicio completo puede prepararse y ejecutarse sin volver a la biblioteca.

### Fase 5 - Sincronización y PWA offline

- Implementar autenticación y contexto de workspace.
- Implementar push/pull, cola, reintentos, tombstones y conflictos.
- Completar estrategia de caché Serwist e instalación PWA.
- Probar ciclo offline/online y actualización de versión.

**Salida:** datos persistentes entre dispositivos y operación confiable sin conexión.

### Fase 6 - Estabilización

- Ejecutar pruebas unitarias, integración, E2E y matriz manual.
- Corregir accesibilidad, rendimiento y estados vacíos/error.
- Preparar datos de demostración, onboarding corto y diagnóstico.
- Ejecutar prueba real con un setlist completo en tablet y teléfono.

**Salida:** release candidate del MVP.

## 16. Orden sugerido del backlog

1. Tipos de dominio y migración Dexie.
2. Pruebas y motor de acordes.
3. Repositorio local de canciones.
4. Biblioteca y búsqueda.
5. Editor ChordPro y preview.
6. Secciones y notas instrumentales.
7. Visor, preferencias y capo.
8. Repositorio y editor de setlists.
9. Modo escenario y autoscroll.
10. Firebase Auth, reglas y workspace.
11. Motor de sincronización y conflictos.
12. Endurecimiento de PWA/offline.
13. Accesibilidad, E2E y piloto real.

## 17. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Acordes ChordPro no estándar | Transposición incorrecta | Preservar tokens desconocidos, mostrar advertencia y ampliar fixtures reales. |
| Conflictos después de editar offline | Pérdida de contenido | Versionado, copia de conflicto, tombstones y confirmación visible. |
| Service worker sirve una versión incompatible | Fallos al actualizar | Versionar esquema/caché, migraciones y actualización diferida. |
| Autoscroll varía entre dispositivos | Mala experiencia en escenario | Basarlo en tiempo transcurrido, no en frames, y probar en móviles reales. |
| Safari limita APIs PWA/Wake Lock | Pantalla apagada o instalación confusa | Detección de capacidades, instrucciones específicas y fallback no bloqueante. |
| Alcance de vistas instrumentales crece a partituras | Retraso del MVP | Mantenerlas como filtros de acordes, estructura y notas, sin generación musical. |

## 18. Métricas de éxito

- Un editor crea una canción utilizable en menos de 5 minutos.
- Un músico abre su vista de una canción desde un setlist en menos de 3 interacciones.
- Un setlist de al menos 10 canciones abre y navega completamente en modo avión.
- Cero pérdida de cambios al cerrar y reabrir la PWA durante una edición offline.
- El preview responde en menos de 300 ms para canciones normales de hasta 500 líneas.
- La vista de escenario permanece fluida durante una sesión de 90 minutos.

## 19. Definición de terminado del MVP

El MVP está terminado cuando:

- Todos los requisitos RF-01 a RF-09 cumplen sus criterios de aceptación.
- Los flujos E2E críticos pasan en la matriz mínima de navegadores.
- Las reglas de Firestore han sido probadas y no permiten acceso cruzado entre workspaces.
- La PWA puede instalarse y el flujo completo biblioteca → setlist → escenario funciona en modo avión.
- Una edición offline se sincroniza sin pérdida al recuperar conexión.
- No existen errores críticos de accesibilidad, pérdida de datos o bloqueo del modo escenario.
- El equipo ha ejecutado al menos un ensayo completo con el release candidate y ha corregido los bloqueadores encontrados.

## 20. Decisiones pendientes antes de producción

Estas decisiones no bloquean la construcción local inicial, pero deben cerrarse antes de habilitar el piloto compartido:

- Método definitivo de alta de miembros: código de workspace o provisión manual.
- Política de conservación y restauración de canciones eliminadas.
- Si la preferencia de notación pertenece solo al usuario o también puede fijarse temporalmente por setlist.
- Catálogo de etiquetas inicial y si será libre o administrado.
- Navegadores y versiones mínimas que recibirán soporte oficial.

