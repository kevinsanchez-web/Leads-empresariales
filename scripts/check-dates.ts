import {
  isoDateToLocalMs,
  enumerateDays,
  leadTimestampFrom,
  parseLeadTimestamp,
  todayISODate,
  parseEventDateRange,
  buildMonthGrid,
  monthBoundsISO,
  shiftMonth,
  snapToStep,
  monthNameEs,
  isCaptureTimestampInFuture
} from "../src/utils/date";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` != ${JSON.stringify(expected)}`}`);
}

const offsetMinutes = -new Date().getTimezoneOffset();
console.log(`TZ offset: ${offsetMinutes} min\n`);

// isoDateToLocalMs debe dar medianoche LOCAL, no UTC.
const ms = isoDateToLocalMs("2026-09-06");
const asLocal = new Date(ms);
check("isoDateToLocalMs -> dia local", todayISODate(asLocal), "2026-09-06");
check("isoDateToLocalMs -> medianoche local", [asLocal.getHours(), asLocal.getMinutes()], [0, 0]);
// Contraste con el parseo UTC nativo, que es el bug que se corrigio.
if (offsetMinutes < 0) {
  const naive = new Date("2026-09-06");
  check("new Date('YYYY-MM-DD') parsea en UTC (dia anterior si offset<0)", todayISODate(naive), "2026-09-05");
}

// enumerateDays debe incluir ambos extremos y no saltarse dias.
check("enumerateDays incluye extremos", enumerateDays("2026-09-01", "2026-09-05"), [
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-05"
]);
check("enumerateDays cruzando cambio de mes/año", enumerateDays("2026-12-30", "2027-01-02"), [
  "2026-12-30",
  "2026-12-31",
  "2027-01-01",
  "2027-01-02"
]);
check("enumerateDays invertida devuelve []", enumerateDays("2026-09-05", "2026-09-01"), []);
// El tope se subió de 120 a 400 días; 518 excede el tope a propósito.
check("enumerateDays respeta el tope de 400 dias", enumerateDays("2025-01-01", "2026-06-01").length, 400);
// 2025-01-01 -> 2026-06-01 inclusivos son 517 días.
check("enumerateDays con maxDays explicito", enumerateDays("2025-01-01", "2026-06-01", 600).length, 517);

// leadTimestampFrom compone el formato que espera Lead.capturedAt.
check("leadTimestampFrom", leadTimestampFrom("2026-09-06", "9:05"), "2026-09-06 09:05");
check("leadTimestampFrom normaliza", leadTimestampFrom("2026-09-06", "14:32"), "2026-09-06 14:32");
check("leadTimestampFrom inválida cae a ahora", /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(leadTimestampFrom("", "")), true);

// El valor compuesto debe seguir siendo parseable y caer en el dia esperado.
const composed = leadTimestampFrom("2026-09-06", "14:32");
const parsed = parseLeadTimestamp(composed);
check("round-trip: dia de leadTimestampFrom", parsed === null ? null : todayISODate(new Date(parsed!)), "2026-09-06");
check("round-trip: instante local", parsed !== null && new Date(parsed!).getHours(), 14);

// parseEventDateRange: el caso que rompe el eje del repo.
check("parseEventDateRange('2026') -> null", parseEventDateRange("2026"), null);
check("parseEventDateRange rango valido", parseEventDateRange("06 - 08 Septiembre 2026"), {
  start: "2026-09-06",
  end: "2026-09-08"
});

// buildMonthGrid: lunes primero, 6x7 fijo y sin dias del mes vecino.
const gridFebruary = buildMonthGrid(2026, 1);
check("buildMonthGrid siempre 6x7", [gridFebruary.length, gridFebruary[0].length], [6, 7]);
// 2026-02-01 fue domingo: como la semana empieza en lunes, la primera fila deja
// 6 huecos y el dia 1 cae en la ultima columna.
check("buildMonthGrid mes que empieza en domingo", gridFebruary[0], [
  null, null, null, null, null, null, "2026-02-01"
]);
check("buildMonthGrid no filtra el dia 1 aunque sea domingo", gridFebruary[0][6], "2026-02-01");
check("buildMonthGrid termina en el ultimo dia del mes", gridFebruary.flat().filter(Boolean).pop(), "2026-02-28");
// 2026-06-01 fue lunes: no hay huecos al inicio.
check("buildMonthGrid mes que empieza en lunes", buildMonthGrid(2026, 5)[0], [
  "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05", "2026-06-06", "2026-06-07"
]);
// Febrero bisiesto: 2024-02 tiene dia 29, 2026-02 no.
check("buildMonthGrid febrero bisiesto", buildMonthGrid(2024, 1).flat().filter(Boolean).pop(), "2024-02-29");
check("buildMonthGrid febrero no bisiesto", buildMonthGrid(2026, 1).flat().filter(Boolean).pop(), "2026-02-28");
const totalDays = buildMonthGrid(2026, 1).flat().filter((day) => day !== null);
check("buildMonthGrid cuenta los dias reales del mes", totalDays.length, 28);

// monthBoundsISO y shiftMonth resuelven el cruce de ano.
check("monthBoundsISO diciembre", monthBoundsISO(2026, 11), { start: "2026-12-01", end: "2026-12-31" });
check("shiftMonth cruza el ano", shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
check("shiftMonth cruza el ano hacia atras", shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
check("monthNameEs", monthNameEs(8), "Septiembre");

// snapToStep: el reloj real da minutos que el selector no ofrece.
check("snapToStep trunca al paso anterior", snapToStep("14:32", 5), "14:30");
check("snapToStep redondea hacia abajo", snapToStep("14:37", 5), "14:35");
check("snapToStep nunca se pasa del minuto 59", snapToStep("23:58", 5), "23:55");
check("snapToStep mantiene un valor ya alineado", snapToStep("09:00", 5), "09:00");
check("snapToStep con paso de 15", snapToStep("10:44", 15), "10:30");
check("snapToStep normaliza la hora", snapToStep("7:05", 5), "07:05");
check("snapToStep inválida cae a la hora actual", /^\d{2}:\d{2}$/.test(snapToStep("", 5)), true);

// isCaptureTimestampInFuture: solo la fecha de hoy puede tener hora futura.
const baseNoon = new Date(2026, 8, 6, 14, 32, 0, 0);
check(
  "isCaptureTimestampInFuture -> hoy con hora posterior",
  isCaptureTimestampInFuture("2026-09-06", "14:33", baseNoon),
  true
);
check(
  "isCaptureTimestampInFuture -> hoy con la hora exacta",
  isCaptureTimestampInFuture("2026-09-06", "14:32", baseNoon),
  false
);
check(
  "isCaptureTimestampInFuture -> hoy con hora anterior",
  isCaptureTimestampInFuture("2026-09-06", "09:05", baseNoon),
  false
);
check(
  "isCaptureTimestampInFuture -> día anterior nunca es futuro",
  isCaptureTimestampInFuture("2026-09-05", "23:59", baseNoon),
  false
);
check(
  "isCaptureTimestampInFuture -> hora 23:59 de hoy sí puede ser futura",
  isCaptureTimestampInFuture("2026-09-06", "23:59", baseNoon),
  true
);

console.log(failures === 0 ? "\nTodo OK" : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);