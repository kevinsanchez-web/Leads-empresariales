import {
  isoDateToLocalMs,
  enumerateDays,
  leadTimestampFrom,
  parseLeadTimestamp,
  todayISODate,
  parseEventDateRange
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

console.log(failures === 0 ? "\nTodo OK" : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);