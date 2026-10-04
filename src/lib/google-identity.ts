type GoogleTokenResponse = { access_token?: string; error?: string; error_description?: string };
type GoogleTokenClient = { requestAccessToken: (options?: { prompt?: string }) => void };

type GoogleIdentityWindow = Window & {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (options: {
          client_id: string;
          scope: string;
          callback: (response: GoogleTokenResponse) => void;
          error_callback: (error: { type: string }) => void;
        }) => GoogleTokenClient;
      };
    };
  };
};

// ID público del cliente OAuth web del proyecto. Puede sustituirse por entorno.
export const googleOAuthClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
  "187891887019-vq812morjlc0gh3n6ag5e7jb9afohs0k.apps.googleusercontent.com";

export function isGoogleIdentityReady() {
  return Boolean((window as GoogleIdentityWindow).google?.accounts?.oauth2);
}

export function requestGoogleAccessToken(): Promise<string> {
  const oauth2 = (window as GoogleIdentityWindow).google?.accounts?.oauth2;
  if (!googleOAuthClientId || !oauth2) {
    return Promise.reject(new Error("Google aún no está disponible. Revisa tu conexión e inténtalo de nuevo."));
  }

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: googleOAuthClientId,
      scope: "openid email profile",
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error_description ?? "No se completó el acceso con Google."));
      },
      error_callback: (error) => {
        reject(new Error(error.type === "popup_closed" ? "Se cerró la ventana de Google antes de terminar." : "Google no pudo abrir la ventana de acceso."));
      },
    });
    // Google debe abrir su ventana durante el gesto del usuario.
    client.requestAccessToken({ prompt: "select_account" });
  });
}
