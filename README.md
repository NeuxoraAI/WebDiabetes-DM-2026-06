# WebDiabetes-DM-2026-06

Plataforma web para el seguimiento de pacientes con **Diabetes Mellitus Tipo 2 (DM2)**: los pacientes registran su adherencia al manejo integral mediante un instrumento validado de 29 ítems, capturan sus datos clínicos de forma longitudinal y se comunican de manera asíncrona con su médico tratante. Los médicos gestionan su lista de pacientes, consultan historiales y responden dudas desde un buzón centralizado.

Los requisitos completos están en [`PRD.md`](PRD.md); el instrumento de adherencia, en [`cuestionario-evaluacion.txt`](cuestionario-evaluacion.txt).

## Estado actual

Funcionalidades implementadas y verificadas:

- ✅ **Autenticación** con JWT y roles (`patient` / `doctor`); registro público para ambos roles (el médico indica cédula profesional).
- ✅ **Cuestionario de adherencia** (29 ítems): el paciente elige la frecuencia (Nunca … Siempre); el backend calcula el puntaje — los ítems 9–13 y 29 puntúan invertido — y la etapa (Precontemplación → Mantenimiento). Periodicidad mensual con recordatorio.
- ✅ **Datos clínicos** inmutables con historial y gráficas (peso, cintura, estatura, glucosa, HbA1c, grasa corporal y gestas solo para mujeres). Pueden capturarlos el paciente o su médico.
- ✅ **Módulo doctor**: pacientes registrados vs. mi lista (un médico por paciente), vista individual con tabs (resumen, adherencia, clínicos, chat) y buzón de mensajes sin responder.
- ✅ **Mensajería asíncrona** paciente ↔ médico con polling cada 30 s y marcado de leído/respondido.
- ✅ **UI neumórfica** homogénea en todas las vistas (sistema de diseño propio en `frontend/assets/css/neuro.css`), responsive con navegación inferior en móvil.
- ✅ Suite de **37 tests** de backend (pytest).

Los pendientes conocidos están documentados como issues del repositorio.

## Herramientas y stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12 · FastAPI · SQLAlchemy 2.x · Pydantic v2 |
| Base de datos | SQLite en desarrollo · PostgreSQL en producción (vía `DATABASE_URL`) |
| Autenticación | JWT (python-jose) · bcrypt |
| Frontend | HTML5 · Tailwind CSS (CDN) · JavaScript Vanilla (módulos ES) · Chart.js |
| Tipografía / diseño | Nunito · sistema neumórfico propio (`neuro.css`) |
| Tests | pytest · httpx (TestClient) |

No hay paso de build del frontend: los estáticos de `frontend/` los sirve la propia app FastAPI montados en `/`.

## Levantar el servidor local

Requisitos: Python 3.12+ con `venv`.

```bash
git clone git@github.com:NeuxoraAI/WebDiabetes-DM-2026-06.git
cd WebDiabetes-DM-2026-06/backend

# 1. Crear entorno e instalar dependencias
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 2. (Opcional) Configurar variables de entorno
cp .env.example .env   # editar SECRET_KEY / DATABASE_URL si aplica

# 3. Arrancar el servidor de desarrollo
.venv/bin/uvicorn app.main:app --reload
```

- Aplicación: <http://localhost:8000> (login) — regístrate como paciente y como médico para probar el flujo completo.
- Documentación interactiva de la API: <http://localhost:8000/docs>.
- La base SQLite `backend/dm2.db` se crea sola al arrancar (no se versiona).

## Tests

```bash
cd backend
.venv/bin/python -m pytest tests/            # suite completa
.venv/bin/python -m pytest tests/test_adherence.py -k reverse   # un test puntual
```

## Estructura del proyecto

```
backend/
  app/
    main.py            # App FastAPI, CORS, montaje de estáticos
    config.py          # Settings (pydantic-settings, .env)
    database.py        # Engine y sesión SQLAlchemy
    data/questions.py  # Ítems del cuestionario y regla de puntaje (REVERSE_ITEMS)
    models/            # ORM: users, patients, doctors, cuestionarios, clínicos, mensajes
    schemas/           # Pydantic (request/response)
    services/          # Lógica de negocio (cálculo de adherencia, mensajería…)
    routers/           # /api/auth, /api/patient, /api/doctor
    dependencies/      # get_db, get_current_user, require_role
    utils/             # JWT/bcrypt, utilidades de fechas
  tests/               # pytest
frontend/
  index.html           # Login
  register.html        # Registro público
  patient/             # Dashboard, cuestionario, chat
  doctor/              # Dashboard, detalle de paciente, buzón
  assets/css/neuro.css # Sistema de diseño neumórfico
  assets/js/           # api/ (fetch+JWT) · pages/ · components/ · utils/
```

## Notas para colaborar

- Rama de trabajo: `develop`; `main` se reserva para releases vía PR.
- El cálculo del puntaje de adherencia vive **solo en el backend** (`app/services/adherence_service.py`); el frontend envía la elección cruda (1=Nunca … 5=Siempre) y muestra el resultado.
- Los registros clínicos y cuestionarios son **inmutables**: nunca se editan ni borran (historial auditable).
- En vistas nuevas usa las clases del sistema de diseño (`neu-*`, `hero-card`, `stage-*`) y `renderNav()` de `assets/js/components/nav.js` para mantener la homogeneidad visual.
