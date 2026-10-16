// Arranca los emuladores de Auth y Firestore conservando los datos entre reinicios.
// Los datos se guardan en .emulator-data/ al cerrar y se recuperan al volver a abrir, para no
// perder las cuentas creadas a mano. Para empezar de cero, borra esa carpeta y corre la semilla.
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const DATA_DIR = ".emulator-data";
const args = ["emulators:start", "--only", "auth,firestore", `--export-on-exit=${DATA_DIR}`];
if (existsSync(`${DATA_DIR}/firebase-export-metadata.json`)) args.push(`--import=${DATA_DIR}`);

const child = spawn("npx", ["firebase", ...args], { stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
