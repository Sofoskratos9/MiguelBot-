export type ExaniArea =
  | 'Comprensión Lectora'
  | 'Pensamiento Matemático'
  | 'Pensamiento Analítico'
  | 'Estructura de la Lengua';

export interface ExaniQuestion {
  id: string;
  number: number;
  area: ExaniArea;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const EXANI_50_BANK: ExaniQuestion[] = [
  // ==========================================
  // COMPRENSIÓN LECTORA (1 - 13)
  // ==========================================
  {
    id: 'cl-01',
    number: 1,
    area: 'Comprensión Lectora',
    difficulty: 'Intermedio',
    question:
      '«La metacognición permite al estudiante supervisar qué comprende y qué desconoce en tiempo real, evitando dedicar horas extras a temas ya dominados.» De acuerdo con el fragmento, la metacognición favorece principalmente:',
    options: [
      'La velocidad de lectura mecánica.',
      'La asignación eficiente del tiempo de estudio.',
      'La memorización literal de definiciones.',
      'La eliminación total de los exámenes.',
    ],
    correctIndex: 1,
    explanation:
      'Al distinguir lo dominado de lo pendiente, el estudiante distribuye su esfuerzo de forma más eficiente.',
  },
  {
    id: 'cl-02',
    number: 2,
    area: 'Comprensión Lectora',
    difficulty: 'Intermedio',
    question:
      'En un artículo de divulgación científica, ¿qué elemento respalda con mayor rigor una afirmación sobre el rendimiento escolar?',
    options: [
      'Una anécdota personal del autor.',
      'Una metáfora literaria al inicio del texto.',
      'Datos empíricos comparados con un grupo de control.',
      'Una frase célebre de un filósofo clásico.',
    ],
    correctIndex: 2,
    explanation:
      'La evidencia empírica con grupo de control es el estándar metodológico para sustentar causalidad o eficacia.',
  },
  {
    id: 'cl-03',
    number: 3,
    area: 'Comprensión Lectora',
    difficulty: 'Avanzado',
    question:
      'Si un autor concluye su texto advirtiendo que «confundir correlación con causalidad conduce a políticas educativas ineficaces», su propósito comunicativo es:',
    options: [
      'Desacreditar toda investigación estadística.',
      'Exhortar al análisis riguroso antes de implementar intervenciones.',
      'Proponer que se eliminen las evaluaciones estandarizadas.',
      'Narrar una experiencia histórica del siglo XIX.',
    ],
    correctIndex: 1,
    explanation:
      'El autor llama a distinguir asociaciones estadísticas de causas reales para diseñar mejores decisiones educativas.',
  },
  {
    id: 'cl-04',
    number: 4,
    area: 'Comprensión Lectora',
    difficulty: 'Intermedio',
    question:
      'En un ensayo sobre ética digital, se afirma: «Delegar el criterio moral a sistemas estadísticos no elimina el sesgo humano, solo lo vuelve invisible». ¿Cuál es la tesis principal?',
    options: [
      'Los algoritmos son más objetivos que cualquier persona.',
      'Automatizar decisiones traslada los prejuicios humanos a una capa menos visible.',
      'La tecnología debería prohibirse en todas las escuelas.',
      'Los datos estadísticos carecen de utilidad social.',
    ],
    correctIndex: 1,
    explanation:
      'El conector de contraste ("no elimina..., solo lo vuelve invisible") indica que el sesgo persiste oculto bajo apariencia técnica.',
  },
  {
    id: 'cl-05',
    number: 5,
    area: 'Comprensión Lectora',
    difficulty: 'Básico',
    question:
      'Si un estudio médico concluye que «la correlación entre sueño reparador y memoria es consistente, aunque la alimentación también influye», ¿qué inferencia es válida?',
    options: [
      'Dormir 9 horas garantiza aprobar sin estudiar.',
      'El sueño se asocia con la memoria, pero no es la única variable.',
      'La alimentación anula por completo el efecto del descanso.',
      'No existe relación entre descanso y aprendizaje.',
    ],
    correctIndex: 1,
    explanation:
      'En comprensión lectora EXANI-II, las opciones con absolutos ("garantiza", "anula") suelen ser distractores frente a enunciados matizados.',
  },
  {
    id: 'cl-06',
    number: 6,
    area: 'Comprensión Lectora',
    difficulty: 'Intermedio',
    question:
      '¿Qué función cumple el primer párrafo de un artículo cuando relata brevemente el origen de la imprenta antes de analizar la lectura en pantallas?',
    options: [
      'Establecer un paralelo histórico para contextualizar el cambio actual.',
      'Contradecir las cifras presentadas en la conclusión.',
      'Demostrar que los libros impresos desaparecerán en dos años.',
      'Enumerar biografías de impresores alemanes sin relación con el tema.',
    ],
    correctIndex: 0,
    explanation:
      'Las referencias históricas introductorias cumplen una función de encuadre comparativo para explicar un fenómeno contemporáneo.',
  },
  {
    id: 'cl-07',
    number: 7,
    area: 'Comprensión Lectora',
    difficulty: 'Básico',
    question:
      'En el enunciado: «Pese a la escasez de agua, los agricultores duplicaron su eficiencia mediante riego por goteo», la expresión "Pese a" indica:',
    options: [
      'Una causa directa e inevitable.',
      'Una concesión u obstáculo superado.',
      'Una secuencia estrictamente cronológica.',
      'Una comparación de igualdad.',
    ],
    correctIndex: 1,
    explanation:
      '"Pese a" y "aunque" son nexos concesivos: introducen una dificultad que no impide el resultado posterior.',
  },
  {
    id: 'cl-08',
    number: 8,
    area: 'Comprensión Lectora',
    difficulty: 'Intermedio',
    question:
      'Un editorial critica la memorización mecánica de fórmulas y propone debates socráticos en el aula. ¿Cuál título sintetiza mejor el texto?',
    options: [
      'Historia de la Atenas clásica.',
      'Del dato memorizado al pensamiento crítico en el aula.',
      'Manual rápido para aprobar sin leer.',
      'Ventajas económicas de las plataformas digitales.',
    ],
    correctIndex: 1,
    explanation:
      'El título correcto captura la transición central del texto (de memorización mecánica a pensamiento crítico) sin ser ni vago ni ajeno.',
  },
  {
    id: 'cl-09',
    number: 9,
    area: 'Comprensión Lectora',
    difficulty: 'Avanzado',
    question:
      '«Quien confunde rapidez lectora con comprensión suele reconocer palabras aisladas, pero tropieza cuando el reactivo transforma la redacción original.» Se deduce que para resolver reactivos complejos es indispensable:',
    options: [
      'Leer lo más lento posible aunque no se termine el examen.',
      'Comprender la estructura lógica del argumento más allá de palabras clave.',
      'Subrayar únicamente los sustantivos propios.',
      'Evitar cualquier texto argumentativo.',
    ],
    correctIndex: 1,
    explanation:
      'Comprender las relaciones lógicas permite transferir el sentido cuando el examen parafrasea las premisas.',
  },
  {
    id: 'cl-10',
    number: 10,
    area: 'Comprensión Lectora',
    difficulty: 'Intermedio',
    question:
      'En una reseña literaria: «La novela destaca por su prosa sobria; sin embargo, el ritmo decae en el tercer acto por diálogos reiterativos». El tono del autor es:',
    options: [
      'Elogioso de manera incondicional.',
      'Analítico y equilibrado (reconoce aciertos y fallas).',
      'Abiertamente hostil y sarcástico.',
      'Indiferente al estilo narrativo.',
    ],
    correctIndex: 1,
    explanation:
      'La combinación de una valoración positiva inicial y una observación crítica puntual refleja objetividad y equilibrio.',
  },
  {
    id: 'cl-11',
    number: 11,
    area: 'Comprensión Lectora',
    difficulty: 'Avanzado',
    question:
      '¿Qué tipo de argumento emplea un texto cuando señala que «en tres universidades de distintos países, reducir el ruido en bibliotecas elevó 14% el puntaje de comprensión»?',
    options: [
      'Argumento de autoridad religiosa.',
      'Argumento empírico basado en estudios comparados.',
      'Falacia ad hominem.',
      'Recurso puramente poético.',
    ],
    correctIndex: 1,
    explanation:
      'Presenta resultados observables y medibles provenientes de múltiples contextos institucionales.',
  },
  {
    id: 'cl-12',
    number: 12,
    area: 'Comprensión Lectora',
    difficulty: 'Intermedio',
    question:
      'En el texto: «El estudio activo exige esfuerzo inicial, por lo que muchos prefieren releer pasivamente; no obstante, la retención a 30 días se duplica con autoevaluación». La idea secundaria que explica por qué se evita el estudio activo es:',
    options: [
      'La autoevaluación duplica la retención a un mes.',
      'Muchos estudiantes evitan el esfuerzo cognitivo inicial.',
      'Releer pasivamente es superior en exámenes finales.',
      'El estudio dura únicamente 30 días.',
    ],
    correctIndex: 1,
    explanation:
      'La cláusula causal señala que la preferencia por releer surge de evitar la fricción inicial del estudio activo.',
  },
  {
    id: 'cl-13',
    number: 13,
    area: 'Comprensión Lectora',
    difficulty: 'Básico',
    question:
      'Cuando un texto instructivo enumera pasos con verbos en imperativo («Verifique», «Complete», «Entregue»), su intención comunicativa predominante es:',
    options: [
      'Expresar emociones íntimas del autor.',
      'Regular y guiar un procedimiento específico.',
      'Debatir una postura filosófica.',
      'Entretener mediante ficción narrativa.',
    ],
    correctIndex: 1,
    explanation:
      'Los textos prescriptivos o instructivos utilizan modo imperativo y secuencia ordenada para orientar una acción concreta.',
  },

  // ==========================================
  // PENSAMIENTO MATEMÁTICO (14 - 26)
  // ==========================================
  {
    id: 'pm-01',
    number: 14,
    area: 'Pensamiento Matemático',
    difficulty: 'Intermedio',
    question:
      'Un tanque de agua tiene una capacidad de 1,200 litros. Si actualmente contiene 3/5 de su capacidad y se consumen 180 litros, ¿qué porcentaje de la capacidad total queda disponible en el tanque?',
    options: ['40%', '45%', '50%', '55%'],
    correctIndex: 1,
    explanation:
      '3/5 de 1,200 = 720 litros. Al restar 180 litros quedan 540 litros. 540 / 1,200 = 0.45 = 45%.',
  },
  {
    id: 'pm-02',
    number: 15,
    area: 'Pensamiento Matemático',
    difficulty: 'Básico',
    question:
      'Si el promedio de 5 calificaciones es 84 y cuatro de ellas son 80, 86, 90 y 78, ¿cuál es la quinta calificación?',
    options: ['82', '84', '86', '88'],
    correctIndex: 2,
    explanation:
      'La suma total debe ser 5 × 84 = 420. Las 4 conocidas suman 80+86+90+78 = 334. 420 - 334 = 86.',
  },
  {
    id: 'pm-03',
    number: 16,
    area: 'Pensamiento Matemático',
    difficulty: 'Avanzado',
    question:
      'Una recta pasa por los puntos (2, 5) y (6, 13). ¿Cuál es la ecuación que la representa?',
    options: ['y = 2x + 1', 'y = 2x + 3', 'y = 3x - 1', 'y = 0.5x + 4'],
    correctIndex: 0,
    explanation:
      'Pendiente m = (13 - 5) / (6 - 2) = 8 / 4 = 2. Sustituyendo (2, 5): 5 = 2(2) + b → b = 1. Ecuación: y = 2x + 1.',
  },
  {
    id: 'pm-04',
    number: 17,
    area: 'Pensamiento Matemático',
    difficulty: 'Intermedio',
    question:
      'En un grupo de 40 aspirantes a la UAA, 24 estudian Comprensión Lectora, 22 estudian Matemáticas y 10 estudian ambas materias. ¿Cuántos NO estudian ninguna de las dos?',
    options: ['4', '6', '8', '10'],
    correctIndex: 0,
    explanation:
      'Por inclusión-exclusión: |L ∪ M| = 24 + 22 - 10 = 36 estudiantes. Por tanto, 40 - 36 = 4 no estudian ninguna.',
  },
  {
    id: 'pm-05',
    number: 18,
    area: 'Pensamiento Matemático',
    difficulty: 'Intermedio',
    question:
      'Si 3 docentes revisan 45 ensayos en 2 horas al mismo ritmo, ¿cuántos ensayos revisarán 4 docentes en 4 horas?',
    options: ['90', '100', '120', '135'],
    correctIndex: 2,
    explanation:
      'Tasa por docente = 45 / (3×2) = 7.5 ensayos/hora. En 4 horas, 4 docentes revisan 4 × 4 × 7.5 = 120 ensayos.',
  },
  {
    id: 'pm-06',
    number: 19,
    area: 'Pensamiento Matemático',
    difficulty: 'Básico',
    question:
      'En una urna hay 5 fichas azules, 3 verdes y 2 blancas. Si se extrae una al azar, ¿cuál es la probabilidad de que NO sea verde?',
    options: ['3/10', '1/2', '7/10', '4/5'],
    correctIndex: 2,
    explanation: 'Total = 10 fichas. No verdes = 5 + 2 = 7. Probabilidad = 7/10.',
  },
  {
    id: 'pm-07',
    number: 20,
    area: 'Pensamiento Matemático',
    difficulty: 'Intermedio',
    question:
      'Un artículo cuesta $800 después de aplicar un descuento del 20%. ¿Cuál era su precio original antes del descuento?',
    options: ['$960', '$1,000', '$1,020', '$1,040'],
    correctIndex: 1,
    explanation:
      'El precio pagado representa el 80% del original: 0.80 × P = 800 → P = 800 / 0.80 = $1,000.',
  },
  {
    id: 'pm-08',
    number: 21,
    area: 'Pensamiento Matemático',
    difficulty: 'Intermedio',
    question:
      'Si 3x - 7 = 2x + 5, ¿cuál es el valor de x² - 4?',
    options: ['12', '140', '144', '148'],
    correctIndex: 1,
    explanation: '3x - 2x = 5 + 7 → x = 12. Luego x² - 4 = 12² - 4 = 144 - 4 = 140.',
  },
  {
    id: 'pm-09',
    number: 22,
    area: 'Pensamiento Matemático',
    difficulty: 'Avanzado',
    question:
      'Un rectángulo tiene perímetro de 46 cm y su largo mide 5 cm más que su ancho. ¿Cuál es su área en cm²?',
    options: ['112 cm²', '126 cm²', '132 cm²', '140 cm²'],
    correctIndex: 1,
    explanation:
      '2(w + w + 5) = 46 → 2w + 5 = 23 → w = 9 cm, largo = 14 cm. Área = 9 × 14 = 126 cm².',
  },
  {
    id: 'pm-10',
    number: 23,
    area: 'Pensamiento Matemático',
    difficulty: 'Intermedio',
    question:
      'Las calificaciones de 7 simulacros fueron: 78, 84, 91, 84, 72, 88, 95. ¿Cuál es la mediana?',
    options: ['82', '84', '86', '88'],
    correctIndex: 1,
    explanation:
      'Ordenados: 72, 78, 84, [84], 88, 91, 95. El dato central (posición 4 de 7) es 84.',
  },
  {
    id: 'pm-11',
    number: 24,
    area: 'Pensamiento Matemático',
    difficulty: 'Avanzado',
    question:
      '¿Cuál es la solución del sistema: 2x + y = 11 y x - y = 1?',
    options: ['x = 3, y = 5', 'x = 4, y = 3', 'x = 5, y = 1', 'x = 2, y = 7'],
    correctIndex: 1,
    explanation:
      'Sumando ambas ecuaciones: 3x = 12 → x = 4. Sustituyendo en x - y = 1 → y = 3.',
  },
  {
    id: 'pm-12',
    number: 25,
    area: 'Pensamiento Matemático',
    difficulty: 'Básico',
    question:
      'En un mapa a escala 1:50,000, dos bibliotecas están separadas por 6 cm. ¿Qué distancia real las separa en kilómetros?',
    options: ['1.5 km', '3.0 km', '5.0 km', '30 km'],
    correctIndex: 1,
    explanation: '6 × 50,000 cm = 300,000 cm = 3,000 m = 3.0 km.',
  },
  {
    id: 'pm-13',
    number: 26,
    area: 'Pensamiento Matemático',
    difficulty: 'Avanzado',
    question:
      'Un triángulo rectángulo tiene catetos de 9 cm y 12 cm. ¿Cuánto mide su hipotenusa?',
    options: ['14 cm', '15 cm', '16 cm', '21 cm'],
    correctIndex: 1,
    explanation: 'Por Teorema de Pitágoras: √(9² + 12²) = √(81 + 144) = √225 = 15 cm.',
  },

  // ==========================================
  // PENSAMIENTO ANALÍTICO (27 - 38)
  // ==========================================
  {
    id: 'pa-01',
    number: 27,
    area: 'Pensamiento Analítico',
    difficulty: 'Intermedio',
    question:
      'Identifica el siguiente término en la sucesión: 4, 9, 19, 39, 79, ...',
    options: ['119', '139', '159', '169'],
    correctIndex: 2,
    explanation:
      'Cada término se obtiene multiplicando el anterior por 2 y sumando 1: (79 × 2) + 1 = 159.',
  },
  {
    id: 'pa-02',
    number: 28,
    area: 'Pensamiento Analítico',
    difficulty: 'Intermedio',
    question:
      'Premisa 1: Todos los estudiantes que practican recuperación activa mejoran su retención. Premisa 2: Sofía practica recuperación activa diariamente. Conclusión válida:',
    options: [
      'Solo Sofía mejora su retención.',
      'Sofía mejora su retención.',
      'Quienes no mejoran su retención nunca estudian.',
      'La recuperación activa reemplaza el sueño.',
    ],
    correctIndex: 1,
    explanation:
      'Por silogismo categórico deductivo (Modus Ponens universal), Sofía pertenece al conjunto que mejora su retención.',
  },
  {
    id: 'pa-03',
    number: 29,
    area: 'Pensamiento Analítico',
    difficulty: 'Básico',
    question: 'MÉDICO es a DIAGNÓSTICO como ARQUITECTO es a:',
    options: ['Ladrillo', 'Plano', 'Edificio', 'Ingeniero'],
    correctIndex: 1,
    explanation:
      'La relación es profesional → instrumento o representación técnica previa a la intervención.',
  },
  {
    id: 'pa-04',
    number: 30,
    area: 'Pensamiento Analítico',
    difficulty: 'Intermedio',
    question:
      'Observa la serie alfanumérica: B2, E5, H8, K11, ... ¿Qué par continúa?',
    options: ['M13', 'N14', 'N13', 'O15'],
    correctIndex: 1,
    explanation:
      'Las letras avanzan +3 posiciones en el alfabeto (B→E→H→K→N) y los números suman +3 (2→5→8→11→14).',
  },
  {
    id: 'pa-05',
    number: 31,
    area: 'Pensamiento Analítico',
    difficulty: 'Avanzado',
    question:
      'Si "Si llueve hoy, se suspende el torneo" es verdadera y hoy NO se suspendió el torneo, ¿qué se concluye lógicamente?',
    options: [
      'Llovió levemente hoy.',
      'No llovió hoy.',
      'El torneo se jugará mañana.',
      'No se puede saber si llovió.',
    ],
    correctIndex: 1,
    explanation:
      'Por Modus Tollens: si P → Q y ¬Q, necesariamente ¬P (no llovió hoy).',
  },
  {
    id: 'pa-06',
    number: 32,
    area: 'Pensamiento Analítico',
    difficulty: 'Intermedio',
    question:
      'Cuatro amigos (Ana, Beto, Carla y Diego) se sientan en fila. Ana no está en los extremos; Diego está a la derecha de Carla pero no junto a Beto; Beto está en el extremo izquierdo. ¿Quién ocupa el último asiento de la derecha?',
    options: ['Ana', 'Carla', 'Diego', 'Beto'],
    correctIndex: 2,
    explanation:
      'Posición 1: Beto. Diego no está junto a Beto ni Carla va después de Diego. Orden válido: Beto (1), Ana (2), Carla (3), Diego (4).',
  },
  {
    id: 'pa-07',
    number: 33,
    area: 'Pensamiento Analítico',
    difficulty: 'Básico',
    question:
      'Identifica el elemento que rompe la lógica del grupo: Triángulo, Cuadrado, Rombo, Cubo.',
    options: ['Triángulo', 'Cuadrado', 'Rombo', 'Cubo'],
    correctIndex: 3,
    explanation:
      'Triángulo, cuadrado y rombo son figuras planas (2D); el cubo es un cuerpo geométrico tridimensional (3D).',
  },
  {
    id: 'pa-08',
    number: 34,
    area: 'Pensamiento Analítico',
    difficulty: 'Intermedio',
    question:
      'Completa la analogía: TERMÓMETRO es a TEMPERATURA como ANEMÓMETRO es a:',
    options: ['Humedad', 'Velocidad del viento', 'Presión arterial', 'Altitud'],
    correctIndex: 1,
    explanation: 'El anemómetro es el instrumento meteorológico que mide la velocidad del viento.',
  },
  {
    id: 'pa-09',
    number: 35,
    area: 'Pensamiento Analítico',
    difficulty: 'Avanzado',
    question:
      '¿Qué número falta en la secuencia: 3, 6, 12, 21, 33, ___?',
    options: ['45', '48', '51', '54'],
    correctIndex: 1,
    explanation:
      'Las diferencias crecen de 3 en 3: +3 (6), +6 (12), +9 (21), +12 (33), por lo que sigue +15 → 33 + 15 = 48.',
  },
  {
    id: 'pa-10',
    number: 36,
    area: 'Pensamiento Analítico',
    difficulty: 'Intermedio',
    question:
      'En una clave secreta, SOL se codifica como TPM. Siguiendo la misma regla (+1 letra siguiente), ¿cómo se codifica LUZ?',
    options: ['MVA', 'MWA', 'KTY', 'NVB'],
    correctIndex: 0,
    explanation: 'Cada letra avanza una posición en el abecedario inglés/estándar: L→M, U→V, Z→A = MVA.',
  },
  {
    id: 'pa-11',
    number: 37,
    area: 'Pensamiento Analítico',
    difficulty: 'Avanzado',
    question:
      'Afirmación: «Ningún estudiante desorganizado entrega todas sus prácticas a tiempo». ¿Cuál enunciado es su negación lógica exacta?',
    options: [
      'Todos los estudiantes desorganizados entregan todo a tiempo.',
      'Al menos un estudiante desorganizado entrega todas sus prácticas a tiempo.',
      'Ningún estudiante organizado entrega tarde.',
      'Todos los organizados son puntuales.',
    ],
    correctIndex: 1,
    explanation:
      'La negación de un cuantificador universal negativo ("Ningún A es B") es un existencial positivo ("Algún A es B").',
  },
  {
    id: 'pa-12',
    number: 38,
    area: 'Pensamiento Analítico',
    difficulty: 'Intermedio',
    question:
      'Un cubo de madera pintado por todas sus caras exteriores se corta en 27 cubitos iguales (3×3×3). ¿Cuántos cubitos quedan con exactamente 2 caras pintadas?',
    options: ['6', '8', '12', '18'],
    correctIndex: 2,
    explanation:
      'Los cubitos con 2 caras pintadas se ubican en el centro de cada arista. Un cubo tiene 12 aristas → 12 cubitos.',
  },

  // ==========================================
  // ESTRUCTURA DE LA LENGUA (39 - 50)
  // ==========================================
  {
    id: 'el-01',
    number: 39,
    area: 'Estructura de la Lengua',
    difficulty: 'Básico',
    question: 'Elige la opción que presenta concordancia gramatical correcta:',
    options: [
      'Hubieron muchos aspirantes en la convocatoria de este año.',
      'Habían varias guías disponibles en la biblioteca digital.',
      'Hubo muchos aspirantes en la convocatoria de este año.',
      'Hacen varios meses que inició el curso propedéutico.',
    ],
    correctIndex: 2,
    explanation:
      'El verbo "haber" con sentido existencial es impersonal y se conjuga siempre en tercera persona del singular ("Hubo").',
  },
  {
    id: 'el-02',
    number: 40,
    area: 'Estructura de la Lengua',
    difficulty: 'Intermedio',
    question: '¿Cuál oración utiliza correctamente el acento diacrítico?',
    options: [
      'Aún no sé si el libro qué me prestaste es de él.',
      'Aun no se si el libro que me prestaste es de el.',
      'Aún no sé si el libro que me prestaste es de él.',
      'Aun no sé sí el libro que me prestaste es de él.',
    ],
    correctIndex: 2,
    explanation:
      '"Aún" (todavía) lleva tilde; "sé" (verbo saber) lleva tilde; "si" (condicional) no lleva; "que" (relativo) no lleva; "él" (pronombre) sí lleva.',
  },
  {
    id: 'el-03',
    number: 41,
    area: 'Estructura de la Lengua',
    difficulty: 'Avanzado',
    question: 'Identifica el nexo que introduce una relación de concesión:',
    options: ['Por lo tanto', 'A pesar de que', 'Debido a que', 'En primer lugar'],
    correctIndex: 1,
    explanation:
      '"A pesar de que" introduce un obstáculo real o posible que no impide el cumplimiento de la acción principal.',
  },
  {
    id: 'el-04',
    number: 42,
    area: 'Estructura de la Lengua',
    difficulty: 'Intermedio',
    question: 'Selecciona el enunciado con puntuación correcta:',
    options: [
      'Sin embargo el tiempo límite, exige una lectura ágil.',
      'Sin embargo, el tiempo límite exige una lectura ágil.',
      'Sin embargo; el tiempo límite, exige una lectura ágil.',
      'Sin embargo el tiempo límite exige, una lectura ágil.',
    ],
    correctIndex: 1,
    explanation:
      'Los conectores discursivos al inicio de oración van seguidos de coma, y nunca se separa sujeto ("el tiempo límite") y verbo ("exige") con una coma.',
  },
  {
    id: 'el-05',
    number: 43,
    area: 'Estructura de la Lengua',
    difficulty: 'Básico',
    question: 'Identifica la oración libre de redundancia o pleonasmo:',
    options: [
      'Subió arriba del estrado para recibir su constancia.',
      'Volvió a reiterar las instrucciones del simulacro.',
      'Resumió los hallazgos principales en tres puntos.',
      'Salieron afuera del auditorio al terminar la sesión.',
    ],
    correctIndex: 2,
    explanation:
      '"Subir arriba", "volver a reiterar" y "salir afuera" son redundancias semánticas; la opción C es concisa y precisa.',
  },
  {
    id: 'el-06',
    number: 44,
    area: 'Estructura de la Lengua',
    difficulty: 'Intermedio',
    question: '¿Qué opción corrige el vicio de dequeísmo?',
    options: [
      'Pienso de que el simulacro estuvo equilibrado.',
      'Me alegro que hayas terminado el diagnóstico.',
      'Creo que la práctica constante reduce los errores.',
      'Estoy seguro que estudiar con método funciona.',
    ],
    correctIndex: 2,
    explanation:
      '"Creer" no rige la preposición "de" ("creo eso" → "creo que"), por lo que la opción C es gramaticalmente correcta.',
  },
  {
    id: 'el-07',
    number: 45,
    area: 'Estructura de la Lengua',
    difficulty: 'Intermedio',
    question: 'Elige la palabra escrita correctamente según las reglas de acentuación:',
    options: ['Exámen', 'Resumenes', 'Córtex', 'Fórcepses'],
    correctIndex: 2,
    explanation:
      '"Córtex" es grave terminada en x/consonante distinta de n o s y lleva tilde; "examen" no lleva tilde por ser grave terminada en n.',
  },
  {
    id: 'el-08',
    number: 46,
    area: 'Estructura de la Lengua',
    difficulty: 'Avanzado',
    question: '¿En cuál oración "sino" funciona correctamente como conjunción adversativa?',
    options: [
      'Sino estudias con estrategia, perderás tiempo valioso.',
      'No memorices definiciones aisladas, sino comprende la estructura.',
      'No sé sino vendrá hoy el asesor académico.',
      'El sino del estudiante depende de sino descansa bien.',
    ],
    correctIndex: 1,
    explanation:
      '"Sino" junto contrapone dos elementos tras una negación ("No memorices..., sino comprende..."); "si no" separado introduce condición negativa.',
  },
  {
    id: 'el-09',
    number: 47,
    area: 'Estructura de la Lengua',
    difficulty: 'Básico',
    question: 'En «La mayoría de los aspirantes asistió puntualmente», el núcleo del sujeto es:',
    options: ['aspirantes', 'mayoría', 'los', 'puntualmente'],
    correctIndex: 1,
    explanation:
      '"Mayoría" es el sustantivo núcleo del sintagma nominal ("La mayoría de los aspirantes"); por ello concuerda con el verbo en singular ("asistió").',
  },
  {
    id: 'el-10',
    number: 48,
    area: 'Estructura de la Lengua',
    difficulty: 'Intermedio',
    question: '¿Qué opción emplea adecuadamente los dos puntos?',
    options: [
      'Tres áreas evalúa el examen: lectura, análisis y redacción.',
      'El examen evalúa: lectura, análisis y redacción.',
      'Mis materias favoritas son: matemáticas y física.',
      'Llegamos al auditorio y: comenzó el simulacro.',
    ],
    correctIndex: 0,
    explanation:
      'Los dos puntos antes de una enumeración deben ir precedidos de un elemento catafórico o anticipador ("Tres áreas..."), nunca entre verbo y complemento directo.',
  },
  {
    id: 'el-11',
    number: 49,
    area: 'Estructura de la Lengua',
    difficulty: 'Avanzado',
    question: 'Selecciona el enunciado con uso normativo del gerundio:',
    options: [
      'Entregó un sobre conteniendo los resultados del examen.',
      'Estudió toda la tarde, aprobando el examen dos semanas después.',
      'Analizó cada reactivo aplicando el método de descarte.',
      'Publicaron una convocatoria ofreciendo treinta becas.',
    ],
    correctIndex: 2,
    explanation:
      'El gerundio modal ("aplicando") indica una acción simultánea a la principal ("analizó"). Debe evitarse el gerundio de posterioridad o especificativo.',
  },
  {
    id: 'el-12',
    number: 50,
    area: 'Estructura de la Lengua',
    difficulty: 'Intermedio',
    question: '¿Cuál conector establece adecuadamente una relación de consecuencia?',
    options: ['No obstante', 'Por consiguiente', 'En cambio', 'Sin embargo'],
    correctIndex: 1,
    explanation:
      '"Por consiguiente" introduce un efecto o conclusión lógica; los demás expresan contraste u oposición.',
  },
];

export const FREE_PREVIEW_QUESTIONS: ExaniQuestion[] = [
  EXANI_50_BANK[0],  // Comprensión Lectora
  EXANI_50_BANK[13], // Pensamiento Matemático
  EXANI_50_BANK[26], // Pensamiento Analítico
  EXANI_50_BANK[38], // Estructura de la Lengua
];
