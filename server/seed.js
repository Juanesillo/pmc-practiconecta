// Datos ficticios para la demo. Ninguna persona ni institución es real.
const DEMO_PASSWORD = 'demo1234';
const FEE_RATE = 0.05; // tarifa de servicio simulada

const DOCENTES = [
  { id: 'd-martha', name: 'Dra. Martha Gil', initials: 'MG', color: '#0f766e', email: 'martha.gil@demo.edu.co', career: 'Odontología', uni: 'Universidad Demo del Norte' },
  { id: 'd-luis', name: 'Dr. Luis Herrera', initials: 'LH', color: '#0369a1', email: 'luis.herrera@demo.edu.co', career: 'Odontología', uni: 'Universidad Demo del Norte' },
  { id: 'd-camilo', name: 'Dr. Camilo Ortiz', initials: 'CO', color: '#15803d', email: 'camilo.ortiz@demo.edu.co', career: 'Derecho (consultorio jurídico)', uni: 'Universidad Demo Central' },
  { id: 'd-paula', name: 'Dra. Paula Núñez', initials: 'PN', color: '#b45309', email: 'paula.nunez@demo.edu.co', career: 'Derecho (consultorio jurídico)', uni: 'Universidad Demo Central' },
  { id: 'd-elena', name: 'Psic. Elena Vargas', initials: 'EV', color: '#be185d', email: 'elena.vargas@demo.edu.co', career: 'Psicología', uni: 'Universidad Demo del Norte' },
  { id: 'd-ricardo', name: 'Ing. Ricardo Peña', initials: 'RP', color: '#6d28d9', email: 'ricardo.pena@demo.edu.co', career: 'Ingeniería Civil', uni: 'Universidad Demo Técnica' }
];

const CLIENTES = [
  { id: 'u-client', name: 'Juan Pérez', initials: 'JP', color: '#4f46e5', email: 'juan@demo.com' },
  { id: 'u-sofia', name: 'Sofía Díaz', initials: 'SD', color: '#db2777', email: 'sofia@demo.com' }
];

// verified: false deja al estudiante sin verificación para mostrar ese flujo.
const ESTUDIANTES = [
  { id: 'u-camila', name: 'Camila Rojas', initials: 'CR', color: '#6366f1', email: 'camila.rojas@demo.edu.co', career: 'Odontología', semester: 9, uni: 'Universidad Demo del Norte', hours: 120, supervisorId: 'd-martha', rating: 4.9, reviews: 23, verified: true },
  { id: 'u-andres', name: 'Andrés Salcedo', initials: 'AS', color: '#0ea5e9', email: 'andres.salcedo@demo.edu.co', career: 'Odontología', semester: 8, uni: 'Universidad Demo del Norte', hours: 96, supervisorId: 'd-luis', rating: 4.7, reviews: 14, verified: true },
  { id: 'u-valentina', name: 'Valentina Mora', initials: 'VM', color: '#10b981', email: 'valentina.mora@demo.edu.co', career: 'Derecho', semester: 9, uni: 'Universidad Demo Central', hours: 80, supervisorId: 'd-camilo', rating: 4.8, reviews: 31, verified: true },
  { id: 'u-santiago', name: 'Santiago León', initials: 'SL', color: '#f59e0b', email: 'santiago.leon@demo.edu.co', career: 'Derecho', semester: 8, uni: 'Universidad Demo Central', hours: 60, supervisorId: 'd-paula', rating: 4.5, reviews: 9, verified: true },
  { id: 'u-daniela', name: 'Daniela Prieto', initials: 'DP', color: '#ec4899', email: 'daniela.prieto@demo.edu.co', career: 'Psicología', semester: 9, uni: 'Universidad Demo del Norte', hours: 150, supervisorId: 'd-elena', rating: 4.9, reviews: 40, verified: true },
  { id: 'u-mateo', name: 'Mateo Arango', initials: 'MA', color: '#8b5cf6', email: 'mateo.arango@demo.edu.co', career: 'Ingeniería Civil', semester: 10, uni: 'Universidad Demo Técnica', hours: 100, supervisorId: 'd-ricardo', rating: 4.6, reviews: 11, verified: true },
  { id: 'u-laura', name: 'Laura Vega', initials: 'LV', color: '#14b8a6', email: 'laura.vega@demo.edu.co', career: 'Psicología', semester: 8, uni: 'Universidad Demo del Norte', hours: 0, supervisorId: 'd-elena', rating: 0, reviews: 0, verified: false }
];

// days: getDay() (0 = domingo). times: horas de inicio.
const SERVICES = [
  { id: 's1', studentId: 'u-camila', category: 'salud', title: 'Valoración y limpieza dental', price: 35000, mode: 'presencial', zone: 'Clínica odontológica, Sede Norte', distance: 2.4, featured: 1,
    scope: 'Valoración inicial, limpieza y orientación de higiene. No incluye tratamientos de conducto ni cirugías.', days: '1,2,3,4,5', times: '14:00,15:30,17:00' },
  { id: 's2', studentId: 'u-andres', category: 'salud', title: 'Control de caries y sellantes', price: 45000, mode: 'presencial', zone: 'Clínica odontológica, Sede Norte', distance: 5.1, featured: 0,
    scope: 'Detección de caries superficiales y aplicación de sellantes bajo supervisión.', days: '2,3,4,5,6', times: '08:00,09:30,11:00' },
  { id: 's3', studentId: 'u-valentina', category: 'legal', title: 'Revisión de contrato de arriendo', price: 30000, mode: 'virtual', zone: 'Videollamada', distance: 0, featured: 0,
    scope: 'Revisión de cláusulas, riesgos y recomendaciones. No incluye representación ante juzgados.', days: '0,1,2,3,4,5,6', times: '09:00,11:00,14:00,16:30' },
  { id: 's4', studentId: 'u-santiago', category: 'legal', title: 'Derecho de petición y tutela básica', price: 20000, mode: 'virtual', zone: 'Videollamada', distance: 0, featured: 0,
    scope: 'Redacción y orientación de derechos de petición. La tutela se radica con aval docente.', days: '1,2,3,4,5', times: '10:00,15:00' },
  { id: 's5', studentId: 'u-daniela', category: 'psico', title: 'Orientación psicológica breve', price: 25000, mode: 'virtual', zone: 'Videollamada', distance: 0, featured: 0,
    scope: 'Sesión de escucha y orientación. No sustituye un tratamiento clínico ni emite diagnósticos.', days: '1,2,3,4,5,6', times: '18:00,19:30,20:30' },
  { id: 's6', studentId: 'u-mateo', category: 'ingenieria', title: 'Revisión básica de planos de vivienda', price: 60000, mode: 'presencial', zone: 'Visita en sitio, Sede Técnica', distance: 7.8, featured: 0,
    scope: 'Revisión de planos y recomendaciones generales. No reemplaza un estudio estructural firmado.', days: '0,6', times: '09:00,11:00,14:00' }
];

// Respuestas guionadas del estudiante (modo demo en solitario).
const CHAT_SCRIPT = [
  'Claro, con gusto. El servicio incluye lo que ves en la ficha, y lo hace un estudiante con la supervisión del docente en todo momento.',
  'El valor es el publicado y se paga por la plataforma: queda retenido y solo se libera cuando cierres el servicio. ¿Te sirve?',
  '¡Perfecto! Te propongo dejar las condiciones acordadas y agendar una cita en la plataforma.'
];

module.exports = { DEMO_PASSWORD, FEE_RATE, DOCENTES, CLIENTES, ESTUDIANTES, SERVICES, CHAT_SCRIPT };
