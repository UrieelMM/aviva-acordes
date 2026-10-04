export type InstallGuide = {
  title: string;
  steps: string[];
  note?: string;
};

export function getInstallGuide(userAgent: string, maxTouchPoints: number): InstallGuide {
  const ios = /iPad|iPhone|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  if (ios && /CriOS/i.test(userAgent)) {
    return {
      title: "Instalar desde Chrome",
      steps: [
        "Toca Compartir, a la derecha de la barra de direcciones de Chrome.",
        "Busca «Agregar a la pantalla principal» en el menú.",
        "Confirma el nombre WorshipNotes y toca Agregar.",
      ],
      note: "Después, abre WorshipNotes desde el icono de tu pantalla principal.",
    };
  }
  if (ios && /Safari/i.test(userAgent) && /Version\//i.test(userAgent)) {
    return {
      title: "Instalar desde Safari",
      steps: [
        "Toca Compartir en la barra de Safari.",
        "Busca «Agregar a pantalla de inicio» en el menú.",
        "Confirma el nombre WorshipNotes y toca Agregar.",
      ],
    };
  }
  if (ios) {
    return {
      title: "Instalar en iPhone o iPad",
      steps: [
        "Abre el menú Compartir de tu navegador.",
        "Busca «Agregar a pantalla de inicio» o «Agregar a la pantalla principal».",
        "Confirma el nombre WorshipNotes y toca Agregar.",
      ],
      note: "Si no aparece esa opción, abre esta página en Chrome o Safari.",
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
