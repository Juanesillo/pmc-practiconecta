// Textos y catálogos de la interfaz. Los datos del negocio (servicios, órdenes, usuarios) vienen de la API.
const STEPS = [
  { id: 'perfil', label: 'Perfil verificado' },
  { id: 'busqueda', label: 'Búsqueda y matching' },
  { id: 'chat', label: 'Chat' },
  { id: 'agenda', label: 'Agendamiento' },
  { id: 'supervision', label: 'Supervisión y reputación' },
  { id: 'pago', label: 'Pago retenido' }
];

const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'salud', label: 'Salud (Odontología)' },
  { id: 'legal', label: 'Derecho' },
  { id: 'psico', label: 'Psicología' },
  { id: 'ingenieria', label: 'Ingeniería' }
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
