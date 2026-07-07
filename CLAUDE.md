# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Plataforma web de seguimiento de pacientes con Diabetes Mellitus Tipo 2 (adherencia al tratamiento, datos clínicos y mensajería paciente–médico).

- `PRD.md` — documento de requisitos: modelo de datos, endpoints, reglas de negocio. Es la fuente de verdad funcional.
- `cuestionario-evaluacion.txt` — los 29 ítems del instrumento de adherencia con su puntaje por opción. El texto y puntajes canónicos en código están en `backend/app/data/questions.py`; mantener ambos archivos sincronizados.

La rama de trabajo es `develop`; `main` se usa para PRs.

## Comandos

Todo se ejecuta desde `backend/` con el venv local (`backend/.venv`):

```bash
.venv/bin/uvicorn app.main:app --reload   # servidor dev en :8000 (sirve también el frontend)
.venv/bin/python -m pytest tests/         # suite completa
.venv/bin/python -m pytest tests/test_adherence.py -k nombre_test   # un test
```

No hay build del frontend: Tailwind y Chart.js van por CDN, los estáticos de `frontend/` los sirve FastAPI montados en `/`.

## Arquitectura

- **Backend** (`backend/app/`): FastAPI + SQLAlchemy 2.x. Capas: `routers/` (auth, patient, doctor) → `services/` (lógica de negocio) → `models/`. Los esquemas Pydantic viven en `schemas/`, las dependencias JWT/rol en `dependencies/auth.py` (`require_role`). La BD es SQLite en dev (`dm2.db`, se crea con `create_all` en el lifespan) y PostgreSQL en producción vía `DATABASE_URL` (.env); no hay migraciones Alembic todavía.
- **Frontend** (`frontend/`): páginas HTML por rol (`patient/`, `doctor/`) con módulos ES en `assets/js/` — `api/` (wrapper fetch con JWT en `client.js`), `pages/` (un script por página), `utils/` (auth-guard, fechas, badges de etapa), `components/` (nav compartida, gráficas Chart.js, toast). La sesión se guarda en localStorage (`dm2_token`/`dm2_role`/`dm2_name`).
- **Diseño**: sistema neumórfico definido en `assets/css/neuro.css` (tokens en `:root`, clases `neu-*`, `hero-card`, `bubble-*`, `stage-*`), basado en `UX-UI-Propuesta/`. Tipografía Nunito, acento coral `#ee5366`, fondo `#dbe5f2`. Usar esas clases en páginas nuevas — no estilos ad hoc — para mantener homogeneidad. El header/nav se genera con `renderNav(role, active)` de `components/nav.js`.
- El chat es polling cada 30 s — explícitamente sin WebSockets (PRD §2).

## Reglas de negocio críticas (PRD §11)

- **Cálculo de adherencia solo en backend** (`adherence_service.py`); el frontend envía la elección cruda (1=Nunca … 5=Siempre) y únicamente muestra el resultado. El puntaje varía por ítem: directos Nunca=1…Siempre=5; los ítems 9–13 y 29 (`REVERSE_ITEMS` en `questions.py`) puntúan invertido. 29 ítems, rango 29–145.
- ⚠️ **Los rangos de etapas (Precontemplación → Mantenimiento) en PRD §4.2 son una interpretación pendiente de validar** con el investigador responsable (punto abierto #1). No tratarlos como definitivos.
- Cuestionario: los 29 ítems son obligatorios, inmutable una vez enviado, periodicidad mensual (banner si > 30 días).
- Datos clínicos inmutables: nunca editar ni borrar registros; siempre historial con timestamp.
- Un doctor solo accede a datos completos de pacientes en su lista; verificar pertenencia en cada endpoint de doctor.
- Un paciente tiene un solo médico (el primero que lo agrega, en v1).
- El campo `gestas` solo aplica/valida si `patient.sex === 'F'` (validar también en backend).

## Idioma

Toda la documentación y la interfaz de usuario están en español; mantener ese idioma en textos visibles al usuario y documentos.
