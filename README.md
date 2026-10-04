# WorshipNotes

Aplicación offline-first para administrar canciones, acordes, notas y setlists de un equipo musical. IndexedDB conserva una copia local y Firebase mantiene un único espacio compartido entre todos los dispositivos.

## Conectar Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Agrega una aplicación Web y copia los valores de su objeto `firebaseConfig`.
3. En **Firestore Database**, crea una base de datos.
4. En **Authentication → Sign-in method**, activa los proveedores **Correo electrónico/contraseña** y **Google**. Al activar Google, selecciona el correo de asistencia del proyecto.
5. Copia `.env.example` como `.env.local` y pega las credenciales:

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=... # opcional
NEXT_PUBLIC_GOOGLE_CLIENT_ID=... # opcional si cambias de proyecto Firebase
```

6. Publica las reglas incluidas en `firestore.rules`. Con Firebase CLI:

```bash
firebase login
firebase use TU_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes
```

También puedes copiar el contenido de `firestore.rules` en **Firestore → Rules** desde la consola.

7. En **Authentication → Settings → Authorized domains**, agrega el dominio donde publicarás WorshipNotes. Firebase ya admite `localhost` para desarrollo en proyectos compatibles; si no aparece, agrégalo también.

   Para el acceso con Google, conserva `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` tal como aparece en la configuración Web de Firebase (normalmente `TU_PROYECTO.firebaseapp.com`). El ID de cliente OAuth web actual está integrado como identificador público y se puede sustituir con `NEXT_PUBLIC_GOOGLE_CLIENT_ID` si cambias de proyecto. En **Google Cloud Console → APIs y servicios → Credenciales → ID de cliente OAuth web**, agrega `https://worshipnotes.avivaecatepec.com` a **Orígenes autorizados de JavaScript**. Para desarrollo, agrega también `http://localhost:3000`. No agregues rutas ni barra final. No cambies `authDomain` al dominio del despliegue sin configurar también el callback de Firebase.

8. Reinicia el servidor después de modificar `.env.local`:

```bash
npm run dev
```

Las variables `NEXT_PUBLIC_FIREBASE_*` identifican la aplicación web y Firebase las envía al navegador por diseño. La protección de datos depende de Authentication y `firestore.rules`, no de ocultar el API key.

## Modelo compartido

- `songs`: canciones, acordes, secciones, notas, metadatos y borrado lógico.
- `setlists`: orden, transposición, capo, notas y datos del evento.
- `history`: revisión inmutable de cada creación, edición, archivo o eliminación.

Cada persona inicia sesión con correo/contraseña o Google. Los usuarios tienen UID distintos y el historial conserva quién realizó cada cambio, pero las reglas les permiten leer y modificar las mismas colecciones compartidas. La sesión persiste en el navegador hasta que se use **Cerrar sesión**. Los cambios se guardan primero en IndexedDB, por lo que la app continúa funcionando sin conexión y envía la cola cuando vuelve internet.

## Instalar y usar sin conexión

La versión de producción muestra la opción de instalación en un aviso y en **Ajustes**. En Chrome para iPhone o iPad, toca **Compartir → Agregar a la pantalla principal**. En Safari, usa **Compartir → Agregar a pantalla de inicio**, activa **Abrir como app web** si aparece y abre la app desde el icono. En Android, Chrome ofrece **⋮ → Instalar app**; Firefox, Samsung Internet y Edge pueden mostrar sus propias opciones de instalación o agregado a inicio. La guía de la app se adapta al navegador. **Después de instalar, abre la app desde el icono con internet al menos una vez** para que el iPhone guarde su interfaz offline; la sesión y los datos del navegador no se comparten necesariamente con la app instalada. Inicia sesión ahí y pulsa **Sincronizado** o **Actualizar** en la barra superior, el menú móvil o Ajustes para descargar todas las canciones y setlists del equipo. Puedes repetirlo cuando haya conexión para renovar la copia offline; los cambios locales pendientes se conservan. Después, la biblioteca, edición local y modo escenario usan IndexedDB y la interfaz guardada por el service worker. Los cambios pendientes se sincronizan al recuperar la conexión. Crear cuentas, acceder por primera vez con Google e importar cifras desde sitios externos requieren internet.

En modo escenario, el botón de pantalla completa usa la API del navegador cuando está disponible. Si iPhone o algún navegador la bloquea, oculta los controles y abre la guía de instalación: al abrir la app desde el icono de inicio se elimina la barra del navegador. Un sitio web no puede obligar a Chrome de iOS a ocultar su interfaz.

La aplicación muestra una pantalla de configuración mientras falten credenciales. No necesitas agregar secretos de servidor: usa exactamente los valores públicos del objeto `firebaseConfig` de tu aplicación Web.

## Importar cifras a ChordPro

Desde el editor abre **Archivo → Convertir cifra a ChordPro**. Puedes pegar una URL HTTPS de Cifra Club o LaCuerda para completar título, artista, tono, acordes y letra. La cifra queda editable antes de importarla y requiere confirmar que tienes permiso para utilizarla. La conversión del texto a ChordPro se realiza localmente en el navegador y reconoce:

- Acordes escritos arriba de la letra o dentro de la línea.
- Notación americana (`C`, `F#m`, `D/F#`) y latina (`Do`, `Fa#m`, `Re/Fa#`).
- Secciones como intro, verso, pre-coro, coro, puente, solo y final.

El endpoint limita los dominios permitidos, exige HTTPS, restringe el tamaño de respuesta y rechaza páginas o redirecciones fuera de los sitios admitidos.

## Desarrollo

```bash
npm install
npm run dev
```

Comprobaciones disponibles:

```bash
npm run typecheck
npm run lint
npm run build
```
