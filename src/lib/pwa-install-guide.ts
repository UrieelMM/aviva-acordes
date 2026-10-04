export type InstallGuide = {
  title: string;
  steps: string[];
  note?: string;
};

export function getInstallGuide(userAgent: string, maxTouchPoints: number): InstallGuide {
  const ios = /iPad|iPhone|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  const android = /Android/i.test(userAgent);
  if (ios && /CriOS/i.test(userAgent)) {
    return {
      title: "Instalar desde Chrome en iPhone o iPad",
      steps: [
        "Toca Compartir junto a la barra de direcciones de Chrome.",
        "Elige «Agregar a la pantalla principal».",
        "Confirma WorshipNotes y toca Agregar.",
        "Abre WorshipNotes desde el nuevo icono para usarla sin barras del navegador.",
      ],
    };
  }
  if (ios && /Safari/i.test(userAgent) && /Version\//i.test(userAgent)) {
    return {
      title: "Instalar desde Safari",
      steps: [
        "Toca Compartir en Safari. Si no aparece, toca primero el menú de la página y después Compartir.",
        "Desliza el menú y elige «Agregar a pantalla de inicio». Si falta, entra en «Editar acciones» y agrégala.",
        "Activa «Abrir como app web» si aparece, y toca Agregar.",
        "Abre WorshipNotes desde el icono de inicio para verla sin las barras de Safari.",
      ],
    };
  }
  if (ios) {
    return {
      title: "Instalar en iPhone o iPad",
      steps: [
        "Abre Compartir en el navegador que estás usando.",
        "Busca «Agregar a pantalla de inicio» y confirma WorshipNotes.",
        "Abre la app desde el icono de inicio para verla sin las barras del navegador.",
      ],
      note: "Si no aparece esa opción, copia el enlace y ábrelo en Safari o Chrome para instalarla.",
    };
  }
  if (android && /Firefox/i.test(userAgent)) {
    return {
      title: "Instalar desde Firefox en Android",
      steps: [
        "Toca el menú de tres puntos de Firefox.",
        "Elige «Instalar» y confirma «Agregar a pantalla de inicio».",
        "Abre WorshipNotes desde su icono.",
      ],
    };
  }
  if (android && /SamsungBrowser/i.test(userAgent)) {
    return {
      title: "Instalar desde Samsung Internet",
      steps: [
        "Abre el menú de Samsung Internet.",
        "Elige «Agregar página a» y después «Pantalla de inicio» o toca el icono de instalación si aparece.",
        "Confirma WorshipNotes y ábrela desde su icono.",
      ],
    };
  }
  if (android && /EdgA/i.test(userAgent)) {
    return {
      title: "Instalar desde Edge en Android",
      steps: [
        "Abre el menú de Edge.",
        "Busca «Agregar al teléfono», «Agregar a pantalla de inicio» o «Instalar aplicación».",
        "Confirma WorshipNotes y ábrela desde su icono.",
      ],
    };
  }
  if (android) {
    return {
      title: "Instalar en Android",
      steps: [
        "Abre el menú de tres puntos del navegador.",
        "Elige «Instalar app» o «Agregar a pantalla de inicio».",
        "Confirma WorshipNotes y ábrela desde su icono.",
      ],
      note: "Si tu navegador no ofrece instalar, abre esta página en Chrome o Firefox.",
    };
  }
  return {
    title: "Instalar WorshipNotes",
    steps: [
      "Abre el menú de tu navegador.",
      "Selecciona «Instalar aplicación» o «Agregar a pantalla de inicio».",
      "Confirma la instalación y abre WorshipNotes desde su icono.",
    ],
  };
}
