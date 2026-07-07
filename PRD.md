# PRD — Sistema de Adherencia al Manejo Integral de la Diabetes Mellitus Tipo 2

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Estado:** Borrador

---

## 1. Visión General

### 1.1 Propósito

Plataforma web clínica que permite a pacientes con Diabetes Mellitus Tipo 2 (DM2) registrar su nivel de adherencia al manejo integral de la enfermedad mediante un instrumento validado, monitorear sus datos clínicos longitudinalmente y comunicarse de forma asíncrona con su médico tratante. Los médicos pueden gestionar su lista de pacientes, consultar el historial clínico y responder dudas desde un buzón centralizado.

### 1.2 Problema que resuelve

- Los pacientes con DM2 carecen de un seguimiento continuo entre consultas.
- No existe un canal estructurado de comunicación paciente-médico fuera del consultorio.
- La adherencia al tratamiento no se mide de forma periódica ni sistemática.
- Los médicos no tienen visibilidad rápida del estado de sus pacientes entre citas.

### 1.3 Usuarios objetivo

| Rol | Descripción |
|-----|-------------|
| **Paciente** | Persona con diagnóstico de DM2, acceso a navegador web, con o sin experiencia tecnológica avanzada. |
| **Médico** | Profesional de salud que atiende pacientes con DM2. Gestiona su propia lista de pacientes y responde consultas. |

---

## 2. Stack Tecnológico

### 2.1 Stack elegido y justificación

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Backend** | FastAPI (Python) | Alto rendimiento, tipado con Pydantic, documentación automática (Swagger/ReDoc), familiar para el equipo |
| **Base de datos** | PostgreSQL | Relacional robusto, soporte nativo para datos temporales e historial, JSONB si se necesita flexibilidad |
| **ORM** | SQLAlchemy 2.x + Alembic | Migraciones controladas, queries tipadas |
| **Frontend** | HTML5 + CSS3 + Tailwind CSS v3 + Vanilla JS | Sin overhead de framework, carga rápida, Tailwind da coherencia visual sin CSS artesanal excesivo |
| **Autenticación** | JWT (python-jose) + bcrypt | Stateless, seguro, compatible con roles múltiples |
| **Chat asíncrono** | Mensajería en BD (polling o SSE ligero) | Sin necesidad de WebSockets; un endpoint de polling cada N segundos es suficiente para el caso de uso |
| **Hosting sugerido** | Railway / Render (backend) + Supabase (PostgreSQL gestionado) | Despliegue sencillo, capa gratuita generosa para MVP |

### 2.2 Sugerencias adicionales de stack

- **Validación de formularios:** usar la API nativa de Constraint Validation de HTML5 + lógica custom en JS, sin librerías externas.
- **Gráficas de datos clínicos:** [Chart.js](https://www.chartjs.org/) — ligero, sin dependencias, funciona perfecto con Vanilla JS.
- **Notificaciones de nuevos mensajes:** Server-Sent Events (SSE) desde FastAPI — unidireccional, sin la complejidad de WebSockets, ideal para notificar al paciente cuando el médico respondió.
- **Fechas y zonas horarias:** `python-dateutil` en backend; `date-fns` (CDN) en frontend.
- **Variables de entorno:** `python-dotenv` para configuración segura de credenciales.

---

## 3. Roles y Autenticación

### 3.1 Modelo de usuarios

```
users
  id, email, password_hash, role (ENUM: 'patient' | 'doctor'), created_at, is_active
```

### 3.2 Registro

- **Paciente:** registro público desde la página de inicio (`/registro`). Campos: nombre, apellidos, email, contraseña, fecha de nacimiento, sexo (Hombre/Mujer).
- **Médico:** registro público desde la misma página, con campo adicional de cédula profesional. *(Nota: considerar validación manual o flag `is_verified` para médicos en versiones futuras.)*

### 3.3 Flujo de autenticación

1. Login único en `/` con email + contraseña.
2. Backend devuelve JWT con payload `{ user_id, role, exp }`.
3. Frontend redirige según rol:
   - `role === 'patient'` → `/paciente/dashboard`
   - `role === 'doctor'` → `/doctor/dashboard`
4. JWT se almacena en `localStorage` (o `httpOnly cookie` para mayor seguridad — recomendado).
5. Expiración: 24 horas. Refresh token opcional en v2.

---

## 4. Módulo Paciente

### 4.1 Flujo de acceso post-login

```
Paciente inicia sesión
        │
        ▼
¿Es nuevo usuario? (sin cuestionarios previos)
        │
    SÍ ─────────────────────────────────────────► Pantalla de bienvenida
        │                                          Confirmar sexo + Cuestionario
        │                                          → Guardar adherencia → Dashboard
        │
    NO  ▼
¿Lleva más de 30 días sin cuestionario?
        │
    SÍ ─────────────────────────────────────────► Dashboard con banner de recordatorio
        │                                          (valor de adherencia + datos clínicos)
        │                                          Banner: "Han pasado X días. Realiza tu
        │                                          cuestionario mensual para un seguimiento preciso."
        │                                          [Botón: Realizar cuestionario ahora]
        │
    NO  ▼
Dashboard completo (estadísticas + datos clínicos + chat)
```

### 4.2 Cuestionario de Adherencia

**Instrumento:** Escala de Evaluación de Adherencia al Manejo Integral de la DM2 (29 ítems).

**Escala de respuesta por ítem:**

| Opción | Puntos |
|--------|--------|
| Nunca | 5 |
| Rara vez | 4 |
| Algunas veces | 3 |
| Casi siempre | 2 |
| Siempre | 1 |

> ⚠️ **Nota importante sobre el rango de puntaje:** El cuestionario tiene 29 ítems × 5 puntos máx = **145 puntos máximo** y 29 puntos mínimo. La escala de medición provista en el documento original indica rangos que suman hasta 177 (probable error tipográfico: "Mantenimiento: 177-145"). Se interpreta que los rangos correctos son:

| Etapa | Rango de puntos |
|-------|-----------------|
| Precontemplación | 29 – 57 |
| Contemplación | 58 – 86 |
| Preparación | 87 – 115 |
| Acción | 116 – 130 |
| Mantenimiento | 131 – 145 |

> 📌 **Acción requerida:** Validar estos rangos con el tutor o investigador responsable antes de implementar el cálculo final.

**Reglas del cuestionario:**
- Se debe responder completo (los 29 ítems) para ser válido.
- Una vez enviado, no puede editarse.
- Se almacena con timestamp de realización.
- Periodicidad obligatoria: 1 vez por mes. El sistema evalúa si `dias_desde_ultimo_cuestionario > 30`.

**Resultado mostrado al paciente:**
- Puntaje numérico obtenido.
- Etapa de adherencia correspondiente (nombre + descripción breve).
- Fecha de realización.
- Próxima fecha sugerida (+ 30 días).

### 4.3 Dashboard del Paciente

#### Sección: Indicador de Adherencia
- Tarjeta con el valor más reciente de adherencia.
- Etapa textual (ej. "Preparación") con descripción motivacional breve.
- Historial de adherencias anteriores en gráfica de línea (Chart.js) — eje X: fechas, eje Y: puntaje.

#### Sección: Datos Clínicos

Formulario de captura de nuevos registros. Todos los campos son numéricos:

| Campo | Unidad | Aplica a |
|-------|--------|----------|
| Peso | kg | Todos |
| Ancho de cintura | cm | Todos |
| Estatura | cm | Todos |
| Glucosa | mg/dL | Todos |
| HbA1c | % | Todos |
| Porcentaje de grasa corporal | % | Todos |
| Gestas (número de embarazos) | entero | Solo mujeres |

- Cada captura queda guardada con fecha y hora (registro histórico, no sobreescritura).
- El paciente puede ver su historial en tablas y en gráficas individuales por variable (Chart.js).
- El médico asignado también puede agregar registros (ver §6.3).

#### Sección: Chat / Buzón
- El paciente redacta una nueva pregunta/mensaje para su médico.
- Ve el hilo de conversación con fecha de envío y respuesta.
- Indicador visual de mensaje no leído / respondido.
- Notificación (SSE o polling) cuando el médico responde.

> ⚠️ Si el paciente aún no ha sido agregado a la lista de ningún médico, se muestra un aviso: "Tu médico aún no ha confirmado tu registro. Podrás enviar mensajes una vez que sea aceptado."

---

## 5. Módulo Doctor

### 5.1 Dashboard del Doctor

Vista en dos paneles (o tabs):

#### Panel A: Pacientes Registrados
- Lista de todos los pacientes que se han registrado en el sistema y **no están** en la lista del doctor.
- Columnas: Nombre, Fecha de registro, Sexo, Etapa de adherencia más reciente.
- Botón **[Agregar a mi lista]** por paciente.
- Buscador/filtro por nombre o email.

#### Panel B: Mi Lista de Pacientes
- Lista de pacientes que el doctor ha aceptado.
- Columnas: Nombre, Última adherencia, Último dato clínico, Mensajes sin responder.
- Clic en un paciente → abre la **Vista de Paciente Individual**.

### 5.2 Vista de Paciente Individual (solo pacientes en lista)

Organizada en tabs:

1. **Resumen:** Datos del paciente, etapa de adherencia actual, alertas.
2. **Historial de Adherencia:** Gráfica + tabla con todas las aplicaciones del cuestionario.
3. **Datos Clínicos:** Tabla historial + formulario para que el doctor agregue/edite registros.
4. **Chat:** Hilo de mensajes con el paciente. Formulario de respuesta.

### 5.3 Buzón General del Doctor
- Vista compacta de todos los mensajes sin responder de todos sus pacientes.
- Ordenados por fecha (más antiguo primero).
- Clic en un mensaje → redirige al chat del paciente correspondiente.

### 5.4 Restricciones de acceso
- Un doctor **solo puede ver datos clínicos y chat** de pacientes que ya agregó a su lista.
- Un doctor **puede ver solo nombre y adherencia** de pacientes en "Pacientes Registrados" (panel A).
- Un doctor **no puede eliminar** pacientes de su lista (solo desasociar, funcionalidad v2).

---

## 6. Módulo de Chat / Mensajería

### 6.1 Modelo de datos

```
messages
  id, sender_id (FK users), receiver_id (FK users), patient_id (FK patients),
  content (TEXT), sent_at (TIMESTAMP), read_at (TIMESTAMP NULLABLE),
  replied_at (TIMESTAMP NULLABLE)
```

### 6.2 Flujo de mensajería

1. Paciente escribe mensaje → se guarda con `sender_id = paciente`, `receiver_id = doctor`.
2. Doctor ve mensaje en su buzón → responde → se guarda con `sender_id = doctor`, `receiver_id = paciente`.
3. El frontend del paciente hace polling cada 30 segundos (o SSE) para detectar nuevas respuestas.
4. Badge visual de "nueva respuesta" en el dashboard del paciente.

### 6.3 Restricciones
- Solo se pueden enviar mensajes si el paciente está en la lista del doctor.
- No hay mensajería entre doctores.
- El paciente no puede tener mensajes con más de un doctor simultáneamente (solo con el que lo agregó primero; si hay varios, el paciente elige su médico de referencia — funcionalidad a definir en v2).

---

## 7. Modelo de Datos (Esquema Relacional)

```sql
-- Usuarios (pacientes y doctores)
users (id PK, email UNIQUE, password_hash, role, full_name, created_at, is_active)

-- Perfil extendido del paciente
patients (id PK, user_id FK→users, sex ENUM('M','F'), birth_date, doctor_id FK→users NULLABLE)

-- Perfil extendido del doctor
doctors (id PK, user_id FK→users, cedula_profesional)

-- Cuestionarios de adherencia
adherence_questionnaires (id PK, patient_id FK→patients, score INT, stage VARCHAR, answered_at TIMESTAMP)

-- Respuestas individuales del cuestionario (para auditoría)
questionnaire_answers (id PK, questionnaire_id FK, question_number INT, answer_value INT)

-- Datos clínicos (historial, nunca sobreescribir)
clinical_records (
  id PK, patient_id FK→patients, recorded_by FK→users,
  weight NUMERIC, waist_cm NUMERIC, height_cm NUMERIC,
  glucose NUMERIC, hba1c NUMERIC, body_fat_pct NUMERIC,
  gestas INT NULLABLE,  -- solo mujeres
  recorded_at TIMESTAMP DEFAULT now()
)

-- Mensajes
messages (id PK, sender_id FK→users, patient_id FK→patients,
          content TEXT, sent_at TIMESTAMP, read_at TIMESTAMP NULLABLE)
```

---

## 8. Diseño de API (Endpoints principales)

### Auth
```
POST   /api/auth/register          — Registro (paciente o doctor)
POST   /api/auth/login             — Login → JWT
POST   /api/auth/logout            — Invalidar token (blacklist opcional)
```

### Paciente
```
GET    /api/patient/me             — Perfil del paciente autenticado
GET    /api/patient/adherence      — Historial de cuestionarios
POST   /api/patient/adherence      — Nuevo cuestionario
GET    /api/patient/clinical       — Historial de datos clínicos
POST   /api/patient/clinical       — Nuevo registro clínico
GET    /api/patient/messages       — Mensajes del paciente
POST   /api/patient/messages       — Nuevo mensaje al médico
```

### Doctor
```
GET    /api/doctor/registered-patients      — Pacientes no en su lista
POST   /api/doctor/patients/{id}/add        — Agregar paciente a su lista
GET    /api/doctor/patients                 — Su lista de pacientes
GET    /api/doctor/patients/{id}            — Detalle de un paciente
GET    /api/doctor/patients/{id}/adherence  — Historial adherencia del paciente
GET    /api/doctor/patients/{id}/clinical   — Datos clínicos del paciente
POST   /api/doctor/patients/{id}/clinical   — Agregar dato clínico
GET    /api/doctor/patients/{id}/messages   — Chat con paciente
POST   /api/doctor/patients/{id}/messages   — Responder mensaje
GET    /api/doctor/inbox                    — Buzón general (mensajes sin responder)
```

---

## 9. Estructura de Carpetas del Proyecto

```
dm2-adherencia/
│
├── backend/                          # FastAPI
│   ├── app/
│   │   ├── main.py                   # Entry point, monta routers, CORS, lifespan
│   │   ├── config.py                 # Settings via pydantic-settings (.env)
│   │   ├── database.py               # Engine, SessionLocal, Base
│   │   │
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── patient.py
│   │   │   ├── doctor.py
│   │   │   ├── adherence.py
│   │   │   ├── clinical_record.py
│   │   │   └── message.py
│   │   │
│   │   ├── schemas/                  # Pydantic schemas (request/response)
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── patient.py
│   │   │   ├── doctor.py
│   │   │   ├── adherence.py
│   │   │   ├── clinical_record.py
│   │   │   └── message.py
│   │   │
│   │   ├── routers/                  # Un archivo por dominio
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── patient.py
│   │   │   └── doctor.py
│   │   │
│   │   ├── services/                 # Lógica de negocio desacoplada del router
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── adherence_service.py  # Cálculo de puntaje y etapa
│   │   │   ├── clinical_service.py
│   │   │   └── message_service.py
│   │   │
│   │   ├── dependencies/             # Dependencias FastAPI reutilizables
│   │   │   ├── auth.py               # get_current_user, require_role()
│   │   │   └── db.py                 # get_db session
│   │   │
│   │   └── utils/
│   │       ├── security.py           # JWT, bcrypt helpers
│   │       └── date_utils.py         # días_desde, calcular_proxima_fecha
│   │
│   ├── migrations/                   # Alembic
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_adherence.py
│   │   ├── test_clinical.py
│   │   └── test_messages.py
│   │
│   ├── .env                          # Variables de entorno (NO versionar)
│   ├── .env.example                  # Plantilla de variables (sí versionar)
│   ├── requirements.txt
│   └── alembic.ini
│
├── frontend/                         # HTML + Tailwind + Vanilla JS
│   ├── index.html                    # Login / landing
│   ├── register.html                 # Registro público
│   │
│   ├── patient/
│   │   ├── dashboard.html            # Dashboard principal paciente
│   │   ├── questionnaire.html        # Cuestionario de adherencia
│   │   └── chat.html                 # Chat con médico
│   │
│   ├── doctor/
│   │   ├── dashboard.html            # Dashboard principal médico
│   │   ├── patient-detail.html       # Vista individual de paciente
│   │   └── inbox.html                # Buzón general
│   │
│   ├── assets/
│   │   ├── css/
│   │   │   ├── tailwind.css          # Build de Tailwind (o CDN en dev)
│   │   │   └── custom.css            # Overrides y componentes custom
│   │   ├── js/
│   │   │   ├── api/
│   │   │   │   ├── client.js         # fetch wrapper con JWT header automático
│   │   │   │   ├── auth.js           # llamadas a /auth/*
│   │   │   │   ├── patient.js        # llamadas a /patient/*
│   │   │   │   └── doctor.js         # llamadas a /doctor/*
│   │   │   ├── components/
│   │   │   │   ├── chart-adherence.js  # Chart.js: gráfica de adherencia
│   │   │   │   ├── chart-clinical.js   # Chart.js: gráficas datos clínicos
│   │   │   │   ├── toast.js            # Notificaciones tipo toast
│   │   │   │   └── modal.js            # Modal reutilizable
│   │   │   ├── pages/
│   │   │   │   ├── login.js
│   │   │   │   ├── register.js
│   │   │   │   ├── patient-dashboard.js
│   │   │   │   ├── questionnaire.js
│   │   │   │   ├── doctor-dashboard.js
│   │   │   │   └── patient-detail.js
│   │   │   └── utils/
│   │   │       ├── auth-guard.js     # Redirige si no hay token o rol incorrecto
│   │   │       ├── date-format.js    # Formateo de fechas en español
│   │   │       └── adherence-labels.js  # Mapeo puntaje → etapa → descripción
│   │   └── img/
│   │       └── logo.svg
│   │
│   └── tailwind.config.js            # Config Tailwind (si se usa CLI build)
│
├── docs/
│   ├── PRD.md                        # Este documento
│   ├── api-reference.md              # Documentación de endpoints (auto o manual)
│   └── db-schema.png                 # Diagrama ER exportado
│
├── .gitignore
├── README.md
└── docker-compose.yml                # Opcional: levantar Postgres + backend en local
```

---

## 10. Pantallas / Vistas del Sistema

| Ruta Frontend | Descripción | Rol |
|---------------|-------------|-----|
| `/` (index.html) | Login | Todos |
| `/register.html` | Registro público | Todos |
| `/patient/dashboard.html` | Dashboard paciente (3 estados) | Paciente |
| `/patient/questionnaire.html` | Cuestionario de adherencia | Paciente |
| `/patient/chat.html` | Chat con médico | Paciente |
| `/doctor/dashboard.html` | Pacientes registrados + lista | Doctor |
| `/doctor/patient-detail.html?id=X` | Vista individual de paciente | Doctor |
| `/doctor/inbox.html` | Buzón general mensajes | Doctor |

---

## 11. Reglas de Negocio Clave

1. **Cuestionario mensual obligatorio:** Si `now() - ultimo_cuestionario.answered_at > 30 días`, mostrar banner de recordatorio. El paciente puede navegar el dashboard pero el banner persiste.
2. **Nuevo usuario:** Si `adherence_questionnaires WHERE patient_id = X` está vacío → flujo de bienvenida + cuestionario.
3. **Datos clínicos inmutables:** Los registros clínicos no se editan ni eliminan una vez guardados. El historial es auditable.
4. **Médico como guardián:** Un doctor solo accede a datos completos de pacientes en su lista. Los pacientes en "Pacientes Registrados" solo muestran nombre, sexo y adherencia actual.
5. **Un médico por paciente:** En v1, un paciente es gestionado por el primer médico que lo agrega. Si un segundo doctor intenta agregarlo, se muestra aviso "Este paciente ya tiene médico asignado".
6. **Chat bloqueado:** Si el paciente no tiene médico asignado, el botón de nuevo mensaje está deshabilitado con mensaje explicativo.
7. **Sexo y gestas:** El campo `gestas` solo se muestra/valida si `patient.sex === 'F'`. El backend también lo valida.
8. **Cálculo de adherencia en backend:** El puntaje se calcula y valida en el servidor (`adherence_service.py`), no en el frontend. El frontend solo muestra el resultado.

---

## 12. Consideraciones de Seguridad

- Contraseñas hasheadas con `bcrypt` (cost factor ≥ 12).
- JWT con expiración corta (24h). Tokens no almacenados en localStorage en producción — usar `httpOnly` cookies.
- CORS configurado explícitamente en FastAPI (no `allow_origins=["*"]` en producción).
- Validación de entrada en Pydantic (backend) y HTML5 + JS (frontend) — doble capa.
- Los endpoints del doctor verifican que el `patient_id` solicitado pertenezca a su lista antes de devolver datos.
- Rate limiting básico en endpoints de autenticación (via `slowapi`).
- Variables sensibles solo en `.env`, nunca en el código.

---

## 13. Guía de Diseño Visual (Recomendaciones)

Dado el contexto médico/clínico con usuarios no técnicos:

- **Paleta:** Azul medio `#2563EB` (acción/confianza) + verde suave `#10B981` (bien/positivo) + ámbar `#F59E0B` (alertas/recordatorio) + gris neutro `#F9FAFB` (fondos) + texto `#111827`.
- **Tipografía:** Inter (body, legible en pantallas de baja resolución) + peso 600–700 para encabezados clínicos. Sin serifa — entorno médico digital, no impreso.
- **Componentes clave:** Cards con sombra suave para secciones, badges de color para etapas de adherencia (precontemplación → rojo, mantenimiento → verde), barra de progreso para el cuestionario (ítem X de 29).
- **Responsive:** Mobile-first con Tailwind. Los pacientes de mayor edad pueden acceder desde móvil.
- **Accesibilidad:** Contraste AA mínimo (WCAG 2.1), labels en todos los inputs, tamaño mínimo de fuente 16px en formularios.

---

## 14. Fases de Desarrollo Sugeridas

### Fase 1 — MVP Core (4–6 semanas)
- [ ] Auth (registro, login, JWT, roles)
- [ ] Cuestionario de adherencia (29 ítems, cálculo, historial)
- [ ] Dashboard básico del paciente (3 estados del flujo)
- [ ] Datos clínicos (captura + historial en tabla)
- [ ] Vista doctor: lista de pacientes + agregar paciente

### Fase 2 — Interacción y Visualización (2–3 semanas)
- [ ] Sistema de mensajería asíncrona (buzón paciente ↔ doctor)
- [ ] Notificaciones/polling de nuevos mensajes
- [ ] Gráficas de adherencia y datos clínicos (Chart.js)
- [ ] Buzón general del doctor

### Fase 3 — Pulido y Producción (1–2 semanas)
- [ ] Validaciones completas frontend + backend
- [ ] Diseño responsive revisado
- [ ] Tests de integración principales
- [ ] Variables de entorno, CORS, rate limiting
- [ ] Despliegue en Railway/Render + Supabase

---

## 15. Puntos Abiertos / Decisiones Pendientes

| # | Pregunta | Impacto |
|---|----------|---------|
| 1 | Validar rangos exactos de la escala de adherencia con el investigador responsable | Alto — afecta el cálculo central |
| 2 | ¿Se requiere verificación de cédula profesional para médicos? | Medio — seguridad del sistema |
| 3 | ¿Qué pasa si un paciente quiere cambiar de médico? | Medio — regla de negocio v1 |
| 4 | ¿Los datos clínicos pueden ser eliminados por el administrador? | Bajo — auditoría |
| 5 | ¿Se requiere exportar datos clínicos a PDF/Excel? | Bajo — funcionalidad v2 |

---

*Documento generado para el proyecto de adherencia DM2 — Neuxora.*