import { classifyEmail, emailDomain, isFreeEmailDomain } from "../src/utils/emailKind";
import { linkedinSearchUrl } from "../src/utils/contactInfo";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` != ${JSON.stringify(expected)}`}`);
}

const kind = (email?: string | null) => classifyEmail(email).kind;

// Los proveedores gratuitos más usados deben leerse como casillas personales.
check("gmail", kind("laura@gmail.com"), "personal");
check("googlemail", kind("laura@googlemail.com"), "personal");
check("hotmail", kind("laura@hotmail.com"), "personal");
check("outlook", kind("laura@outlook.com"), "personal");
check("yahoo", kind("laura@yahoo.com"), "personal");
check("icloud", kind("laura@icloud.com"), "personal");
check("proton", kind("laura@proton.me"), "personal");
check("protonmail", kind("laura@protonmail.com"), "personal");
check("live", kind("laura@live.com"), "personal");
check("aol", kind("laura@aol.com"), "personal");
check("mail.com", kind("laura@mail.com"), "personal");
check("gmx.de", kind("laura@gmx.de"), "personal");

// Los proveedores gratuitos también usan sufijo de pais.
check("hotmail.co.uk", kind("laura@hotmail.co.uk"), "personal");
check("yahoo.com.mx", kind("laura@yahoo.com.mx"), "personal");
check("outlook.es", kind("laura@outlook.es"), "personal");
check("gmail.com.co", kind("laura@gmail.com.co"), "personal");

// Cualquier otro dominio se trata como corporativo.
check("dominio de empresa", kind("laura@energiaandina.co"), "corporativo");
check("dominio con sufijo de pais", kind("jefe@bancolombia.com.co"), "corporativo");
check("institucional", kind("docente@cun.edu.co"), "corporativo");
check("subdominio largo", kind("contacto@grupo.retailplus.com.co"), "corporativo");

// El nombre de un proveedor puede ser el primer nivel de un dominio corporativo:
// si se comparara como etiqueta suelta, un lead corporativo se marcaria personal.
check("mail como subdominio corporativo", kind("info@mail.energiaandina.co"), "corporativo");
check("gmail como subdominio corporativo", kind("info@gmail.energiaandina.co"), "corporativo");
check("live como subdominio corporativo", kind("info@live.energiaandina.co"), "corporativo");

// El texto guardado llega con espacios y mayusulas mixtas desde el formulario.
check("espacios y mayusculas", kind("  Laura.Martinez@GMAIL.COM  "), "personal");
check("dominio en mayusculas", kind("laura@EnergiaAndina.CO"), "corporativo");

// Sin correo no hay nada que clasificar.
check("sin correo (undefined)", kind(undefined), "sin-email");
check("sin correo (null)", kind(null), "sin-email");
check("sin correo (vacio)", kind(""), "sin-email");
check("sin correo (solo espacios)", kind("   "), "sin-email");
check("texto sin arroba", kind("laura"), "sin-email");
check("arroba sin dominio", kind("laura@"), "sin-email");
check("arroba al inicio", kind("@gmail.com"), "sin-email");

// emailDomain toma lo que va tras la ULTIMA arroba, para no cortar mal una entrada rara.
check("emailDomain con arrobas extra", emailDomain("laura@@gmail.com"), "gmail.com");
check("emailDomain recorta espacios", emailDomain("  laura@Gmail.com  "), "gmail.com");
check("emailDomain sin arroba", emailDomain("laura"), "");
check("isFreeEmailDomain con vacio", isFreeEmailDomain(""), false);
check("isFreeEmailDomain con dominio suelto", isFreeEmailDomain("gmail"), false);

// linkedinSearchUrl: la mayoria de los leads no traen perfil, asi que el boton
// cae a una busqueda. El nombre va codificado para no romper la query string.
const searchBase = "https://www.linkedin.com/search/results/people/?keywords=";
check("linkedinSearchUrl con nombre y empresa", linkedinSearchUrl("Laura Martinez", "Energia Andina"), `${searchBase}Laura%20Martinez%20Energia%20Andina`);
check("linkedinSearchUrl codifica acentos", linkedinSearchUrl("Martínez", "Añe"), `${searchBase}Mart%C3%ADnez%20A%C3%B1e`);
check("linkedinSearchUrl codifica el &", linkedinSearchUrl("Ana & Co", "B"), `${searchBase}Ana%20%26%20Co%20B`);
check("linkedinSearchUrl solo con nombre", linkedinSearchUrl("Laura", ""), `${searchBase}Laura`);
check("linkedinSearchUrl solo con empresa", linkedinSearchUrl(undefined, "Argos"), `${searchBase}Argos`);
check("linkedinSearchUrl sin nada devuelve vacio", linkedinSearchUrl(undefined, undefined), "");
check("linkedinSearchUrl con espacios sueltos devuelve vacio", linkedinSearchUrl("   ", "  "), "");

console.log(failures === 0 ? "\nTodo OK" : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);