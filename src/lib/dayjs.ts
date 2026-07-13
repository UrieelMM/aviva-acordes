import dayjsLib from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es-mx";

dayjsLib.extend(relativeTime);
dayjsLib.locale("es-mx");

export const dayjs = dayjsLib;
