# Instrumento: Escala de Evaluación de Adherencia al Manejo Integral de la DM2
# (cuestionario-evaluacion.txt). El puntaje varía según el ítem: los ítems de
# REVERSE_ITEMS puntúan invertido (Nunca=5 … Siempre=1) y el resto directo
# (Nunca=1 … Siempre=5). El cálculo del puntaje vive en adherence_service.

QUESTIONS: list[str] = [
    "¿Realiza las pruebas de laboratorio cuando su médico lo indica?",
    "¿Toma su medicamento incluso si se siente bien?",
    "¿Asiste a consulta regularmente con su médico?",
    "¿Se ha hecho examen de orina?",
    "¿Toma sus medicamentos cuando sale de vacaciones, en días de descanso o festivos?",
    "¿Usted toma sus medicamentos de acuerdo con las instrucciones del médico?",
    "¿Toma sus medicamentos, aunque sean caros?",
    "¿Usted toma sus medicamentos como lo indicó el médico?",
    "¿Usted come antojitos (enchiladas, tacos, pozole, golosinas, refresco o botana)?",
    "¿Usted come alimentos hechos a base de harinas como: tortilla de harina, pan o pastas?",
    "¿Usted consume alimentos con azúcar?",
    "¿Sus alimentos están preparados con manteca?",
    "¿Usted cambia su dieta con el fin de semana por algún festejo especial?",
    "¿Usted consume diario la misma cantidad de alimentos?",
    "¿Ha cambiado sus hábitos de alimentación?",
    "¿En su dieta habitual ha disminuido el consumo de grasas?",
    "¿Ha dejado de consumir alimentos que contienen azúcar como refrescos, pastelitos y golosinas?",
    "¿Hace ejercicio físico por lo menos 3 veces por semana, al menos 30 minutos?",
    "¿Hace ejercicio físico como caminata, bicicleta o natación?",
    "¿Hace ejercicio físico aún si se siente cansado?",
    "¿Buscó información sobre la enfermedad y sus complicaciones?",
    "¿Considera sabrosa la dieta que prescribe el personal de salud?",
    "¿Usted vigila su peso?",
    "¿Sus amigos o familiares lo animan a que siga su dieta?",
    "¿Sus familiares adoptan su alimentación para que usted siga su dieta?",
    "¿Su familia o amigos le recuerdan su tratamiento para la diabetes?",
    "¿Revisa sus ojos regularmente?",
    "¿Revisa sus pies frecuentemente?",
    "¿Sus amigos o familiares lo inducen a comer alimentos prohibidos?",
]

# Opciones tal como las elige el paciente. El "value" es la elección de
# frecuencia (1=Nunca … 5=Siempre), NO el puntaje: el puntaje del ítem se
# deriva con points_for() en el backend (PRD §11.8).
ANSWER_OPTIONS = [
    {"value": 1, "label": "Nunca"},
    {"value": 2, "label": "Rara vez"},
    {"value": 3, "label": "Algunas veces"},
    {"value": 4, "label": "Casi siempre"},
    {"value": 5, "label": "Siempre"},
]

# Ítems de conducta negativa con puntaje invertido (Nunca=5 … Siempre=1):
# antojitos, harinas, azúcar, manteca, romper la dieta y alimentos prohibidos.
REVERSE_ITEMS: frozenset[int] = frozenset({9, 10, 11, 12, 13, 29})

TOTAL_QUESTIONS = len(QUESTIONS)  # 29


def points_for(question_number: int, choice: int) -> int:
    """Puntaje del ítem dada la elección de frecuencia (1=Nunca … 5=Siempre)."""
    return 6 - choice if question_number in REVERSE_ITEMS else choice
