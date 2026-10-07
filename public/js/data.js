// Textos y catálogos de la interfaz. Los datos del negocio (servicios, órdenes, usuarios) vienen de la API.
const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'salud', label: 'Salud (Odontología)' },
  { id: 'legal', label: 'Derecho' },
  { id: 'psico', label: 'Psicología' },
  { id: 'ingenieria', label: 'Ingeniería' }
];

const VERIFICATION_STEPS = [
  { id: 'email', title: 'Correo institucional', detail: 'camila.rojas@demo-norte.edu.co · confirmado por enlace' },
  { id: 'enroll', title: 'Matrícula vigente', detail: 'Odontología · 9.º semestre · periodo 2026-2' },
  { id: 'id', title: 'Identidad', detail: 'Documento y selfie cotejados (simulado)' },
  { id: 'supervisor', title: 'Aval del docente supervisor', detail: 'Dra. Martha Gil aprueba el alcance de servicios' }
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

const VERIFIED_STUDENT_ID = 'u-camila'; // estudiante cuyo perfil se verifica en el paso 1
