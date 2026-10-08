// Textos y catálogos de la interfaz. Los datos del negocio (servicios, órdenes, usuarios) vienen de la API.
const STEPS = [
  { id: 'perfil', label: 'Perfil verificado', sub: 'Identidad y aval docente', icon: 'shield-check' },
  { id: 'busqueda', label: 'Búsqueda y matching', sub: 'Encuentra el servicio ideal', icon: 'search' },
  { id: 'chat', label: 'Chat', sub: 'Acuerden las condiciones', icon: 'message' },
  { id: 'agenda', label: 'Agendamiento', sub: 'Elige fecha y paga seguro', icon: 'calendar' },
  { id: 'supervision', label: 'Supervisión y reputación', sub: 'El docente valida, ambos califican', icon: 'clipboard' },
  { id: 'pago', label: 'Pago retenido', sub: 'Custodia y liberación', icon: 'lock' }
];

const CATEGORIES = [
  { id: 'all', label: 'Todas', icon: 'grid' },
  { id: 'salud', label: 'Salud', icon: 'heart-pulse' },
  { id: 'legal', label: 'Derecho', icon: 'scale' },
  { id: 'psico', label: 'Psicología', icon: 'heart' },
  { id: 'ingenieria', label: 'Ingeniería', icon: 'hard-hat' }
];

const VERIFICATION_STEPS = [
  { title: 'Correo institucional', action: 'Confirmar correo', detail: 'Correo del dominio universitario confirmado por enlace (simulado)' },
  { title: 'Matrícula vigente', action: 'Validar matrícula', detail: 'Matrícula del periodo actual validada (simulado)' },
  { title: 'Identidad', action: 'Validar identidad', detail: 'Documento y selfie cotejados (simulado)' },
  { title: 'Aval del docente supervisor', action: null, detail: 'El docente aprueba el alcance de los servicios' }
];

const QUICK_REPLIES = [
  'Hola, ¿qué incluye exactamente el servicio?',
  '¿Quién supervisa y cuánto cuesta?',
  'Me parece bien, ¿agendamos?'
];

const SUPERVISION_STEPS = [
  'El docente aprueba el plan de atención antes de la cita',
  'Supervisión en sitio o en línea durante el servicio',
  'El docente firma el cierre y valida la práctica'
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // semana que empieza en lunes
const ROLE_LABEL = { cliente: 'Cliente', estudiante: 'Estudiante', docente: 'Docente' };
