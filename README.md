# Acorde

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
```

6. Publica las reglas incluidas en `firestore.rules`. Con Firebase CLI:

```bash
firebase login
firebase use TU_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes
```

También puedes copiar el contenido de `firestore.rules` en **Firestore → Rules** desde la consola.

7. En **Authentication → Settings → Authorized domains**, agrega el dominio donde publicarás Acorde. Firebase ya admite `localhost` para desarrollo en proyectos compatibles; si no aparece, agrégalo también.

   Para el acceso con Google en producción, agrega también `https://TU_DOMINIO/__/auth/handler` a las **URI de redirección autorizadas** del cliente OAuth de Google del mismo proyecto. Acorde sirve el asistente de Firebase desde su propio dominio mediante un proxy interno; así el navegador no necesita compartir `sessionStorage` entre dominios. Si cambias de dominio, actualiza esta URI antes de desplegar. En desarrollo se conserva el `authDomain` de Firebase.

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

La versión de producción muestra la opción **Instalar aplicación** en un aviso y en **Ajustes**. En iPhone o iPad, Safari ofrece **Compartir → Agregar a pantalla de inicio**. Abre Acorde con internet al menos una vez, inicia sesión y espera a que se descarguen las canciones y setlists del equipo. Después, la biblioteca, edición local y modo escenario usan IndexedDB y la interfaz guardada por el service worker; los cambios pendientes se sincronizan al recuperar la conexión. Crear cuentas, acceder por primera vez con Google y importar cifras desde sitios externos requieren internet.

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
