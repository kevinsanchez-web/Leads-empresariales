import { INTEREST_OPTIONS, SOURCE_OPTIONS } from '../data/mockData';

export interface ParsedVoiceLead {
  name?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  interests?: string[];
  sources?: string[];
  notes?: string;
  priority?: boolean;
  rawTranscript: string;
  command?: 'save' | 'clear' | 'priority' | 'scan' | 'next' | 'repeat' | 'restart';
}

/**
  Capitalizes Spanish names and titles cleanly preserving prepositions like 'de', 'del', 'la'
 */
export function capitalizeSpanishTitle(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const clean = text.trim();
  if (!clean) return '';

  const lowerWords = ['de', 'del', 'la', 'las', 'los', 'en', 'y', 'e', 'o', 'u', 'con', 'para', 'por', 'a'];
  const parts = clean.split(/\s+/);
  
  return parts.map((word, index) => {
    const lower = word.toLowerCase();
    // Keep lower prepositions except at the beginning
    if (index > 0 && lowerWords.includes(lower)) {
      return lower;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

/**
 * Normalizes email spoken with Spanish words 'arroba' and 'punto'
 */
export function normalizeSpokenEmail(rawText: string): string {
  if (!rawText) return '';
  let text = rawText.trim().toLowerCase();
  
  // Clean leading conversational fillers
  text = text.replace(/^(?:el\s+correo\s+electrónico\s+es|su\s+correo\s+electrónico\s+es|el\s+correo\s+es|su\s+correo\s+es|el\s+email\s+es|su\s+email\s+es|mi\s+correo\s+es|mi\s+email\s+es|el\s+mail\s+es|su\s+mail\s+es|correo\s+electrónico|correo\s+es|email\s+es|mail\s+es|correo|email|mail|es)\s+/i, '');

  // Replace spoken phrases
  text = text.replace(/\s*arroba\s*/gi, '@');
  text = text.replace(/\s*punto\s*/gi, '.');
  text = text.replace(/\s*guión\s*bajo\s*/gi, '_');
  text = text.replace(/\s*guion\s*bajo\s*/gi, '_');
  text = text.replace(/\s*guión\s*/gi, '-');
  text = text.replace(/\s*guion\s*/gi, '-');
  text = text.replace(/\s*mas\s*/gi, '+');
  text = text.replace(/\s*más\s*/gi, '+');
  
  // Remove all spaces in email structure
  text = text.replace(/\s+/g, '');

  // Match full email
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (match) return match[0];
  
  // If user dictated something like "carlos@argos" without domain suffix, add .com
  if (text.includes('@') && !text.includes('.')) {
    return `${text}.com`;
  }
  
  return text;
}

/**
 * Normalizes phone numbers from Spanish voice dictation
 */
export function normalizeSpokenPhone(rawText: string): string {
  if (!rawText) return '';
  let text = rawText.toLowerCase().trim();

  // Clean common introductory phrases
  text = text.replace(/^(?:el\s+número\s+de\s+celular\s+es|el\s+número\s+de\s+teléfono\s+es|el\s+celular\s+es|su\s+celular\s+es|mi\s+celular\s+es|el\s+teléfono\s+es|su\s+teléfono\s+es|mi\s+teléfono\s+es|el\s+numero\s+es|su\s+numero\s+es|mi\s+numero\s+es|celular\s+es|teléfono\s+es|telefono\s+es|celular|teléfono|telefono|número|numero|es)\s+/i, '');

  // Word-to-number replacements in Spanish
  const replacements: [RegExp, string][] = [
    [/\btrescientos\s+doce\b/gi, '312'],
    [/\btrescientos\s+diez\b/gi, '310'],
    [/\btrescientos\s+once\b/gi, '311'],
    [/\btrescientos\s+quince\b/gi, '315'],
    [/\btrescientos\s+veinte\b/gi, '320'],
    [/\btrescientos\s+uno\b/gi, '301'],
    [/\btrescientos\s+dos\b/gi, '302'],
    [/\btrescientos\b/gi, '300'],
    [/\bcuatrocientos\b/gi, '400'],
    [/\bquinientos\b/gi, '500'],
    [/\bseiscientos\b/gi, '600'],
    [/\bsetecientos\b/gi, '700'],
    [/\bochocientos\b/gi, '800'],
    [/\bnovecientos\b/gi, '900'],
    [/\bdoscientos\b/gi, '200'],
    [/\bcien\b|\bciento\b/gi, '100'],
    
    // 20s
    [/\bveintiuno\b|\bveintiún\b/gi, '21'],
    [/\bveintidós\b|\bveintidos\b/gi, '22'],
    [/\bveintitrés\b|\bveintitres\b/gi, '23'],
    [/\bveinticuatro\b/gi, '24'],
    [/\bveinticinco\b/gi, '25'],
    [/\bveintiséis\b|\bveintiseis\b/gi, '26'],
    [/\bveintisiete\b/gi, '27'],
    [/\bveintiocho\b/gi, '28'],
    [/\bveintinueve\b/gi, '29'],
    [/\bveinte\b/gi, '20'],

    // 30s - 90s
    [/\btreinta\s+y\s+uno\b/gi, '31'],
    [/\btreinta\s+y\s+dos\b/gi, '32'],
    [/\btreinta\s+y\s+tres\b/gi, '33'],
    [/\btreinta\s+y\s+cuatro\b/gi, '34'],
    [/\btreinta\s+y\s+cinco\b/gi, '35'],
    [/\btreinta\s+y\s+seis\b/gi, '36'],
    [/\btreinta\s+y\s+siete\b/gi, '37'],
    [/\btreinta\s+y\s+ocho\b/gi, '38'],
    [/\btreinta\s+y\s+nueve\b/gi, '39'],
    [/\btreinta\b/gi, '30'],

    [/\bcuarenta\s+y\s+uno\b/gi, '41'],
    [/\bcuarenta\s+y\s+dos\b/gi, '42'],
    [/\bcuarenta\s+y\s+tres\b/gi, '43'],
    [/\bcuarenta\s+y\s+cuatro\b/gi, '44'],
    [/\bcuarenta\s+y\s+cinco\b/gi, '45'],
    [/\bcuarenta\s+y\s+seis\b/gi, '46'],
    [/\bcuarenta\s+y\s+siete\b/gi, '47'],
    [/\bcuarenta\s+y\s+ocho\b/gi, '48'],
    [/\bcuarenta\s+y\s+nueve\b/gi, '49'],
    [/\bcuarenta\b/gi, '40'],

    [/\bcincuenta\s+y\s+uno\b/gi, '51'],
    [/\bcincuenta\s+y\s+dos\b/gi, '52'],
    [/\bcincuenta\s+y\s+tres\b/gi, '53'],
    [/\bcincuenta\s+y\s+cuatro\b/gi, '54'],
    [/\bcincuenta\s+y\s+cinco\b/gi, '55'],
    [/\bcincuenta\s+y\s+seis\b/gi, '56'],
    [/\bcincuenta\s+y\s+siete\b/gi, '57'],
    [/\bcincuenta\s+y\s+ocho\b/gi, '58'],
    [/\bcincuenta\s+y\s+nueve\b/gi, '59'],
    [/\bcincuenta\b/gi, '50'],

    [/\bsesenta\s+y\s+uno\b/gi, '61'],
    [/\bsesenta\s+y\s+dos\b/gi, '62'],
    [/\bsesenta\s+y\s+tres\b/gi, '63'],
    [/\bsesenta\s+y\s+cuatro\b/gi, '64'],
    [/\bsesenta\s+y\s+cinco\b/gi, '65'],
    [/\bsesenta\s+y\s+seis\b/gi, '66'],
    [/\bsesenta\s+y\s+siete\b/gi, '67'],
    [/\bsesenta\s+y\s+ocho\b/gi, '68'],
    [/\bsesenta\s+y\s+nueve\b/gi, '69'],
    [/\bsesenta\b/gi, '60'],

    [/\bsetenta\s+y\s+uno\b/gi, '71'],
    [/\bsetenta\s+y\s+dos\b/gi, '72'],
    [/\bsetenta\s+y\s+tres\b/gi, '73'],
    [/\bsetenta\s+y\s+cuatro\b/gi, '74'],
    [/\bsetenta\s+y\s+cinco\b/gi, '75'],
    [/\bsetenta\s+y\s+seis\b/gi, '76'],
    [/\bsetenta\s+y\s+siete\b/gi, '77'],
    [/\bsetenta\s+y\s+ocho\b/gi, '78'],
    [/\bsetenta\s+y\s+nueve\b/gi, '79'],
    [/\bsetenta\b/gi, '70'],

    [/\bochenta\s+y\s+uno\b/gi, '81'],
    [/\bochenta\s+y\s+dos\b/gi, '82'],
    [/\bochenta\s+y\s+tres\b/gi, '83'],
    [/\bochenta\s+y\s+cuatro\b/gi, '84'],
    [/\bochenta\s+y\s+cinco\b/gi, '85'],
    [/\bochenta\s+y\s+seis\b/gi, '86'],
    [/\bochenta\s+y\s+siete\b/gi, '87'],
    [/\bochenta\s+y\s+ocho\b/gi, '88'],
    [/\bochenta\s+y\s+nueve\b/gi, '89'],
    [/\bochenta\b/gi, '80'],

    [/\bnoventa\s+y\s+uno\b/gi, '91'],
    [/\bnoventa\s+y\s+dos\b/gi, '92'],
    [/\bnoventa\s+y\s+tres\b/gi, '93'],
    [/\bnoventa\s+y\s+cuatro\b/gi, '94'],
    [/\bnoventa\s+y\s+cinco\b/gi, '95'],
    [/\bnoventa\s+y\s+seis\b/gi, '96'],
    [/\bnoventa\s+y\s+siete\b/gi, '97'],
    [/\bnoventa\s+y\s+ocho\b/gi, '98'],
    [/\bnoventa\s+y\s+nueve\b/gi, '99'],
    [/\bnoventa\b/gi, '90'],

    // 10-19
    [/\bdiez\b/gi, '10'],
    [/\bonce\b/gi, '11'],
    [/\bdoce\b/gi, '12'],
    [/\btrece\b/gi, '13'],
    [/\bcatorce\b/gi, '14'],
    [/\bquince\b/gi, '15'],
    [/\bdieciséis\b|\bdieciseis\b/gi, '16'],
    [/\bdiecisiete\b/gi, '17'],
    [/\bdieciocho\b/gi, '18'],
    [/\bdiecinueve\b/gi, '19'],

    // 0-9
    [/\bcero\b/gi, '0'],
    [/\buno\b|\bún\b|\bun\b/gi, '1'],
    [/\bdos\b/gi, '2'],
    [/\btres\b/gi, '3'],
    [/\bcuatro\b/gi, '4'],
    [/\bcinco\b/gi, '5'],
    [/\bseis\b/gi, '6'],
    [/\bsiete\b/gi, '7'],
    [/\bocho\b/gi, '8'],
    [/\bnueve\b/gi, '9'],
    [/\bmás\s*57\b|\bmas\s*57\b/gi, '+57']
  ];

  replacements.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });

  const digits = text.replace(/\D/g, '');
  if (digits.length >= 7) {
    if (digits.length === 10) {
      return `+57 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
    }
    if (digits.length === 12 && digits.startsWith('57')) {
      return `+57 ${digits.substring(2, 5)} ${digits.substring(5, 8)} ${digits.substring(8)}`;
    }
    return `+57 ${digits}`;
  }

  // If user dictated something else with numbers
  const numMatch = rawText.match(/\d[\d\s-]{5,}\d/);
  if (numMatch) {
    return numMatch[0].trim();
  }

  return rawText.trim();
}

/**
 * Parses field input when a specific step is actively being requested
 */
export function parseStepResponse(stepKey: string, rawText: string): Partial<ParsedVoiceLead> {
  if (!rawText) return {};
  const clean = rawText.trim();
  const lower = clean.toLowerCase();

  // 1. Check Voice Control Commands First
  if (lower.includes('guardar lead') || lower.includes('guardar contacto') || lower === 'guardar' || lower === 'guardar datos' || lower === 'listo') {
    return { command: 'save' };
  }
  if (lower.includes('omitir') || lower.includes('siguiente') || lower.includes('pasar') || lower === 'paso' || lower === 'siguiente') {
    return { command: 'next' };
  }
  if (lower.includes('repetir') || lower.includes('otra vez') || lower === 'repite') {
    return { command: 'repeat' };
  }
  if (lower.includes('reiniciar') || lower.includes('empezar de nuevo') || lower === 'comenzar') {
    return { command: 'restart' };
  }

  // 2. Also check if user dictated multiple fields at once (natural language multi-field dictation)
  const fullExtract = parseVoiceLeadInput(rawText);
  const detectedKeys = Object.keys(fullExtract).filter(k => k !== 'rawTranscript' && k !== 'command' && (fullExtract as any)[k]);
  
  // If multi-field entity extraction found 2 or more distinct fields, return the rich multi-field object
  if (detectedKeys.length >= 2) {
    return fullExtract;
  }

  // 3. Handle step-specific field extraction with extensive filler cleanup
  switch (stepKey) {
    case 'name': {
      let nameVal = clean
        .replace(/^(?:el\s+nombre\s+del\s+lead\s+es|el\s+nombre\s+del\s+contacto\s+es|el\s+nombre\s+es|su\s+nombre\s+es|mi\s+nombre\s+es|el\s+contacto\s+es|el\s+lead\s+es|el\s+cliente\s+es|se\s+llama|nombre\s+es|nombre|soy|es|registrar\s+a|atendí\s+a|atendi\s+a|contacto|prospecto)\s+/i, '')
        .trim();
      
      // Additional safety trim for "es " at start
      nameVal = nameVal.replace(/^es\s+/i, '').trim();
      return { name: capitalizeSpanishTitle(nameVal) };
    }

    case 'company': {
      let compVal = clean
        .replace(/^(?:la\s+empresa\s+se\s+llama|su\s+empresa\s+es|la\s+empresa\s+es|la\s+compañía\s+es|la\s+compania\s+es|trabaja\s+en|trabaja\s+para|trabajo\s+en|viene\s+de|es\s+de|pertenece\s+a|empresa|compañía|compania|de)\s+/i, '')
        .trim();
      
      compVal = compVal.replace(/^es\s+/i, '').trim();
      return { company: capitalizeSpanishTitle(compVal) };
    }

    case 'role': {
      let roleVal = clean
        .replace(/^(?:su\s+cargo\s+es|el\s+cargo\s+es|su\s+puesto\s+es|el\s+puesto\s+es|mi\s+cargo\s+es|trabaja\s+como|trabajo\s+como|es\s+el|es\s+la|rol\s+de|cargo|puesto|rol|es|soy)\s+/i, '')
        .trim();
      
      roleVal = roleVal.replace(/^es\s+/i, '').trim();
      return { role: capitalizeSpanishTitle(roleVal) };
    }

    case 'phone': {
      const formatted = normalizeSpokenPhone(clean);
      return { phone: formatted };
    }

    case 'email': {
      const email = normalizeSpokenEmail(clean);
      return { email };
    }

    case 'interests': {
      const matched: string[] = [];
      
      INTEREST_OPTIONS.forEach(opt => {
        if (lower.includes(opt.toLowerCase())) {
          matched.push(opt);
        }
      });
      
      if (lower.includes('inteligencia artificial') || lower.includes('chatgpt') || lower.includes('llm') || lower.includes('ia') || lower.includes('machine learning')) {
        if (!matched.includes('IA')) matched.push('IA');
      }
      if (lower.includes('analitica') || lower.includes('analítica') || lower.includes('power bi') || lower.includes('big data') || lower.includes('datos') || lower.includes('data')) {
        if (!matched.includes('Analítica')) matched.push('Analítica');
      }
      if (lower.includes('seguridad') || lower.includes('ciber') || lower.includes('ciberseguridad') || lower.includes('firewall')) {
        if (!matched.includes('Ciberseguridad')) matched.push('Ciberseguridad');
      }
      if (lower.includes('nube') || lower.includes('cloud') || lower.includes('aws') || lower.includes('azure') || lower.includes('gcp')) {
        if (!matched.includes('Cloud')) matched.push('Cloud');
      }
      if (lower.includes('automatizar') || lower.includes('rpa') || lower.includes('automatizacion') || lower.includes('automatización') || lower.includes('bots')) {
        if (!matched.includes('Automatización')) matched.push('Automatización');
      }
      if (lower.includes('sensores') || lower.includes('iot') || lower.includes('dispositivos') || lower.includes('hardware')) {
        if (!matched.includes('IoT')) matched.push('IoT');
      }

      if (lower.includes('todos') || lower.includes('todas')) {
        return { interests: ['IA', 'Analítica', 'Cloud', 'Automatización', 'Ciberseguridad', 'IoT'] };
      }

      // If user dictated something custom
      if (matched.length === 0 && clean.length > 1) {
        const cleanTag = clean.replace(/^(?:los\s+intereses\s+son|intereses|interés|interesado\s+en)\s+/i, '').trim();
        matched.push(capitalizeSpanishTitle(cleanTag));
      }

      return { interests: matched.length > 0 ? matched : ['IA'] };
    }

    case 'sources': {
      const matchedSources: string[] = [];
      SOURCE_OPTIONS.forEach(src => {
        if (lower.includes(src.toLowerCase())) {
          matchedSources.push(src);
        }
      });
      if (lower.includes('stand') || lower.includes('visita') || lower.includes('evento') || lower.includes('presencial')) {
        if (!matchedSources.includes('Visita Stand')) matchedSources.push('Visita Stand');
      }
      if (lower.includes('qr') || lower.includes('código') || lower.includes('codigo')) {
        if (!matchedSources.includes('QR')) matchedSources.push('QR');
      }
      if (lower.includes('referido') || lower.includes('recomendado') || lower.includes('amigo')) {
        if (!matchedSources.includes('Referido')) matchedSources.push('Referido');
      }
      if (lower.includes('tarjeta') || lower.includes('escaner') || lower.includes('escáner')) {
        if (!matchedSources.includes('Escanear Tarjeta')) matchedSources.push('Escanear Tarjeta');
      }

      const cleanSrc = clean.replace(/^(?:el\s+canal\s+es|touchpoint\s+es|canal\s+es|es|por)\s+/i, '').trim();
      return { sources: matchedSources.length > 0 ? matchedSources : [capitalizeSpanishTitle(cleanSrc)] };
    }

    case 'notes': {
      let cleanNote = clean
        .replace(/^(?:las\s+notas\s+son|la\s+nota\s+es|nota|notas|comentario|observación|observacion|dice\s+que|acuerdo\s+es)\s+/i, '')
        .trim();
      return { 
        notes: cleanNote.charAt(0).toUpperCase() + cleanNote.slice(1)
      };
    }

    default:
      return {};
  }
}

/**
 * Parses spoken natural language in Spanish to extract all Lead fields simultaneously
 */
export function parseVoiceLeadInput(rawText: string): ParsedVoiceLead {
  const result: ParsedVoiceLead = {
    rawTranscript: rawText
  };

  if (!rawText) return result;
  const text = rawText.toLowerCase().trim();

  // 1. Detect Commands
  if (
    text.includes('guardar lead') || 
    text.includes('guardar contacto') || 
    text.includes('guardar registro') ||
    text.endsWith('guardar') ||
    text.includes('enviar lead') ||
    text.includes('registrar lead')
  ) {
    result.command = 'save';
  } else if (
    text.includes('limpiar formulario') || 
    text.includes('borrar todo') || 
    text.includes('reiniciar formulario') ||
    text === 'borrar' ||
    text === 'limpiar'
  ) {
    result.command = 'clear';
    return result;
  } else if (text.includes('escanear tarjeta') || text.includes('abrir escaner')) {
    result.command = 'scan';
    return result;
  }

  // 2. Detect Priority / VIP
  if (
    text.includes('prioritario') || 
    text.includes('prioritaria') || 
    text.includes('urgente') || 
    text.includes('cliente vip') || 
    text.includes('vip') || 
    text.includes('muy interesado') || 
    text.includes('alta prioridad') ||
    text.includes('caliente') ||
    text.includes('lead caliente')
  ) {
    result.priority = true;
  }

  // 3. Extract Email (handles written and spoken formats)
  const spokenEmailMatch = rawText.match(/([a-zA-Z0-9._-]+)\s*(?:@|arroba)\s*([a-zA-Z0-9.-]+)\s*(?:\.|\bpunto\b)\s*([a-zA-Z]{2,6})/i);
  if (spokenEmailMatch) {
    const userPart = spokenEmailMatch[1].replace(/\s+/g, '');
    const domainPart = spokenEmailMatch[2].replace(/\s+/g, '');
    const tldPart = spokenEmailMatch[3].replace(/\s+/g, '');
    result.email = `${userPart}@${domainPart}.${tldPart}`.toLowerCase();
  } else {
    const standardEmailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (standardEmailMatch) {
      result.email = standardEmailMatch[0].toLowerCase();
    }
  }

  // 4. Extract Phone
  const phoneMatch = rawText.match(/(?:\+?57\s*)?(?:3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|\b3\d{9}\b|\b\d{7,10}\b)/);
  if (phoneMatch) {
    let cleanPhone = phoneMatch[0].replace(/[\s.-]/g, '');
    if (!cleanPhone.startsWith('+57') && cleanPhone.length === 10) {
      cleanPhone = `+57 ${cleanPhone.substring(0, 3)} ${cleanPhone.substring(3, 6)} ${cleanPhone.substring(6)}`;
    }
    result.phone = cleanPhone;
  } else if (text.includes('celular') || text.includes('teléfono') || text.includes('telefono')) {
    const extractedPhone = normalizeSpokenPhone(rawText);
    if (extractedPhone !== rawText.trim()) {
      result.phone = extractedPhone;
    }
  }

  // 5. Extract Interests
  const matchedInterests: string[] = [];
  INTEREST_OPTIONS.forEach(opt => {
    if (text.includes(opt.toLowerCase())) {
      matchedInterests.push(opt);
    }
  });

  if (text.includes('inteligencia artificial') || text.includes('chatgpt') || text.includes('machine learning') || text.includes('ia')) {
    if (!matchedInterests.includes('IA')) matchedInterests.push('IA');
  }
  if (text.includes('analitica') || text.includes('analítica') || text.includes('power bi') || text.includes('big data') || text.includes('datos')) {
    if (!matchedInterests.includes('Analítica')) matchedInterests.push('Analítica');
  }
  if (text.includes('seguridad') || text.includes('ciber') || text.includes('ciberseguridad')) {
    if (!matchedInterests.includes('Ciberseguridad')) matchedInterests.push('Ciberseguridad');
  }
  if (text.includes('nube') || text.includes('cloud') || text.includes('aws') || text.includes('azure') || text.includes('gcp')) {
    if (!matchedInterests.includes('Cloud')) matchedInterests.push('Cloud');
  }
  if (text.includes('automatizar') || text.includes('rpa') || text.includes('automatizacion') || text.includes('automatización')) {
    if (!matchedInterests.includes('Automatización')) matchedInterests.push('Automatización');
  }
  if (text.includes('sensores') || text.includes('hardware') || text.includes('dispositivos') || text.includes('iot')) {
    if (!matchedInterests.includes('IoT')) matchedInterests.push('IoT');
  }

  if (matchedInterests.length > 0) {
    result.interests = Array.from(new Set(matchedInterests));
  }

  // 6. Extract Role
  const roleKeywords = [
    'gerente', 'director', 'directora', 'vicepresidente', 'vp', 'líder', 'lider', 
    'jefe', 'analista', 'ingeniero', 'ingeniera', 'coordinador', 'coordinadora', 
    'desarrollador', 'desarrolladora', 'consultor', 'consultora', 'ceo', 'cto', 'cfo', 'coo', 
    'fundador', 'fundadora', 'especialista', 'asesor', 'asesora', 'arquitecto', 'arquitecta'
  ];
  for (const kw of roleKeywords) {
    const rolePattern = new RegExp(`(?:cargo|puesto|es|rol de|como)?\\s*(${kw}(?:\\s+(?:de\\s+)?[a-zA-ZáéíóúÁÉÍÓÚñÑ]+)?)`, 'i');
    const match = rawText.match(rolePattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.length > 2) {
        result.role = capitalizeSpanishTitle(extracted);
        break;
      }
    }
  }

  // 7. Extract Company
  const companyPattern = /(?:empresa|compañía|compania|de la empresa|trabaja en|trabajo en|viene de|vengo de)\s+([A-ZÁÉÍÓÚa-z0-9áéíóúÁÉÍÓÚñÑ\s.&'-]+?)(?=(?:,\s*|\.\s*|\s+con\s+|\s+telefono|\s+teléfono|\s+celular|\s+correo|\s+email|\s+cargo|\s+interesado|\s+interesada|\s+interés|\s+y\s+su\s+|$))/i;
  const companyMatch = rawText.match(companyPattern);
  if (companyMatch && companyMatch[1]) {
    const rawComp = companyMatch[1].trim();
    if (rawComp.length > 2 && !['ia', 'ti', 'bogotá', 'colombia'].includes(rawComp.toLowerCase())) {
      result.company = capitalizeSpanishTitle(rawComp);
    }
  }

  // 8. Extract Name
  const namePattern = /(?:nombre|nombre es|se llama|registrar a|nuevo lead|contacto|prospecto|soy|atendí a|atendi a)\s+([A-ZÁÉÍÓÚa-zñáéíóú]+(?:\s+[A-ZÁÉÍÓÚa-zñáéíóú]+){1,3})/i;
  const nameMatch = rawText.match(namePattern);
  if (nameMatch && nameMatch[1]) {
    const rawN = nameMatch[1].trim();
    if (!['un lead', 'una persona', 'la empresa', 'el cliente'].includes(rawN.toLowerCase())) {
      result.name = capitalizeSpanishTitle(rawN);
    }
  } else {
    // If phrase starts with standard names e.g., "Carlos Eduardo Mendoza de..."
    const startNamePattern = /^([A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+){1,2})\s+(?:de|del|cargo|gerente|director|empresa|,)/i;
    const startMatch = rawText.match(startNamePattern);
    if (startMatch && startMatch[1]) {
      result.name = capitalizeSpanishTitle(startMatch[1]);
    }
  }

  // 9. Extract Notes
  const notesPattern = /(?:nota|notas|comentario|comentarios|observación|observaciones|solicita|quiere|interesado en)\s+(.+)/i;
  const notesMatch = rawText.match(notesPattern);
  if (notesMatch && notesMatch[1]) {
    result.notes = notesMatch[1].trim();
  }

  return result;
}

