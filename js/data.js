// Datos ficticios del prototipo. Ninguna persona ni institución es real.
const CLIENT = {
  name: 'Juan Pérez',
  initials: 'JP',
  need: 'Valoración y limpieza dental a bajo costo'
};

const SERVICES = [
  {
    id: 's1', student: 'Camila Rojas', initials: 'CR', color: '#6366f1',
    career: 'Odontología', category: 'salud', semester: 9, uni: 'Universidad Demo del Norte',
    title: 'Valoración y limpieza dental', price: 35000, mode: 'presencial', distance: 2.4,
    rating: 4.9, reviews: 23, supervisor: 'Dra. Martha Gil', featured: true,
    scope: 'Valoración inicial, limpieza y orientación de higiene. No incluye tratamientos de conducto ni cirugías.',
    availability: 'Lun–Vie, tardes', hours: 120
  },
  {
    id: 's2', student: 'Andrés Salcedo', initials: 'AS', color: '#0ea5e9',
    career: 'Odontología', category: 'salud', semester: 8, uni: 'Universidad Demo del Norte',
    title: 'Control de caries y sellantes', price: 45000, mode: 'presencial', distance: 5.1,
    rating: 4.7, reviews: 14, supervisor: 'Dr. Luis Herrera',
    scope: 'Detección de caries superficiales y aplicación de sellantes bajo supervisión.',
    availability: 'Mar–Sáb, mañanas', hours: 96
  },
  {
    id: 's3', student: 'Valentina Mora', initials: 'VM', color: '#10b981',
    career: 'Derecho', category: 'legal', semester: 9, uni: 'Universidad Demo Central',
    title: 'Revisión de contrato de arriendo', price: 30000, mode: 'virtual', distance: 0,
    rating: 4.8, reviews: 31, supervisor: 'Dr. Camilo Ortiz (consultorio jurídico)',
    scope: 'Revisión de cláusulas, riesgos y recomendaciones. No incluye representación ante juzgados.',
    availability: 'Todos los días', hours: 80
  },
  {
    id: 's4', student: 'Santiago León', initials: 'SL', color: '#f59e0b',
    career: 'Derecho', category: 'legal', semester: 8, uni: 'Universidad Demo Central',
    title: 'Derecho de petición y tutela básica', price: 20000, mode: 'virtual', distance: 0,
    rating: 4.5, reviews: 9, supervisor: 'Dra. Paula Núñez (consultorio jurídico)',
    scope: 'Redacción y orientación de derechos de petición. La tutela se radica con aval docente.',
    availability: 'Lun–Vie', hours: 60
  },
  {
    id: 's5', student: 'Daniela Prieto', initials: 'DP', color: '#ec4899',
    career: 'Psicología', category: 'psico', semester: 9, uni: 'Universidad Demo del Norte',
    title: 'Orientación psicológica breve', price: 25000, mode: 'virtual', distance: 0,
    rating: 4.9, reviews: 40, supervisor: 'Psic. Elena Vargas',
    scope: 'Sesión de escucha y orientación. No sustituye un tratamiento clínico ni emite diagnósticos.',
    availability: 'Lun–Sáb, noches', hours: 150
  },
  {
    id: 's6', student: 'Mateo Arango', initials: 'MA', color: '#8b5cf6',
    career: 'Ingeniería Civil', category: 'ingenieria', semester: 10, uni: 'Universidad Demo Técnica',
    title: 'Revisión básica de planos de vivienda', price: 60000, mode: 'presencial', distance: 7.8,
    rating: 4.6, reviews: 11, supervisor: 'Ing. Ricardo Peña',
    scope: 'Revisión de planos y recomendaciones generales. No reemplaza un estudio estructural firmado.',
    availability: 'Fines de semana', hours: 100
  }
];

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

// Respuestas guionadas del estudiante en el chat (una por cada mensaje del cliente).
const CHAT_SCRIPT = [
  'Claro, con gusto. El servicio incluye valoración y limpieza, y la hace un estudiante con la supervisión de la docente en todo momento.',
  'El valor es el publicado y se paga por la plataforma: queda retenido y solo se libera cuando cierres el servicio. ¿Te sirve?',
  '¡Perfecto! Te propongo dejar las condiciones acordadas y agendar una cita en la plataforma.'
];

const QUICK_REPLIES = [
  'Hola, ¿qué incluye exactamente el servicio?',
  '¿Quién supervisa y cuánto cuesta?',
  'Me parece bien, ¿agendamos?'
];

const PAYMENT_FEE_RATE = 0.05; // tarifa de servicio simulada
