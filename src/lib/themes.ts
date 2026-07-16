import type { ThemeName } from "@/types/domain";

export type ThemeOption = {
  id: ThemeName;
  name: string;
  shortName: string;
  description: string;
  colors: string[];
  accent: string;
  recommended?: boolean;
};

export const themeOptions: ThemeOption[] = [
  {
    id: "studio",
    name: "Studio",
    shortName: "Studio",
    description: "Indigo + slate. Claro, preciso y equilibrado.",
    colors: ["bg-indigo-600", "bg-indigo-100", "bg-slate-900"],
    accent: "#4f46e5",
    recommended: true,
  },
  {
    id: "worship",
    name: "Worship",
    shortName: "Worship",
    description: "Emerald + slate. Cálido y sereno.",
    colors: ["bg-emerald-600", "bg-emerald-100", "bg-slate-900"],
    accent: "#059669",
  },
  {
    id: "stage",
    name: "Stage",
    shortName: "Stage",
    description: "Violet + slate. Expresivo y energético.",
    colors: ["bg-violet-600", "bg-violet-100", "bg-slate-900"],
    accent: "#7c3aed",
  },
  {
    id: "dark",
    name: "Dark mode",
    shortName: "Dark",
    description: "Slate 950. Menos brillo en ambientes oscuros.",
    colors: ["bg-slate-950", "bg-slate-800", "bg-indigo-400"],
    accent: "#818cf8",
  },
];

