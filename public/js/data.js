// Textos y catálogos de la interfaz. Los datos del negocio (servicios, órdenes, usuarios) vienen de la API.
const CATEGORIES = [
  { id: 'all', label: 'Todas las categorías', icon: 'grid' },
  { id: 'salud', label: 'Salud y odontología', icon: 'heart-pulse' },
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

const SORTS = [
  { id: 'match', label: 'Mejor coincidencia' },
  { id: 'rating', label: 'Mejor calificados' },
  { id: 'price', label: 'Menor precio' }
];

// Guía para presentar la demo: quién actúa en cada momento del flujo.
const GUIDE = [
  { t: 'Perfil verificado', d: 'Laura valida su identidad y matrícula.', who: 'u-laura', whoName: 'Laura Vega (estudiante)', route: 'perfil' },
  { t: 'Aval docente', d: 'Su docente supervisora da el aval; Laura ya puede publicar.', who: 'd-elena', whoName: 'Psic. Elena Vargas (docente)', route: 'perfil' },
  { t: 'Búsqueda y matching', d: 'Juan filtra, compara y abre el detalle de un servicio.', who: 'u-client', whoName: 'Juan Pérez (cliente)', route: 'explorar' },
  { t: 'Chat y condiciones', d: 'Juan contacta a Camila, chatea y acepta; Camila acepta (o usa la respuesta automática).', who: 'u-camila', whoName: 'Camila Rojas (estudiante)', route: 'casos' },
  { t: 'Agendamiento y pago retenido', d: 'Juan elige horario y confirma: el pago queda en custodia.', who: 'u-client', whoName: 'Juan Pérez (cliente)', route: 'casos' },
  { t: 'Supervisión y reputación', d: 'La docente registra la supervisión y cierra; ambos se califican.', who: 'd-martha', whoName: 'Dra. Martha Gil (docente)', route: 'casos' },
  { t: 'Pago liberado', d: 'Juan confirma el servicio y libera el pago al estudiante.', who: 'u-client', whoName: 'Juan Pérez (cliente)', route: 'casos' }
];
