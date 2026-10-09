# Northstar Commerce — Enterprise QA Lab

Laboratorio personal con datos sintéticos. Build `sprint1-0.1.0`: registro, verificación por correo local, sesiones, catálogo y detalle públicos. Sprint 1 está cerrado con GO para el laboratorio local; no hubo despliegue productivo.

## Mapa del repositorio

| Ruta                  | Responsabilidad                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `apps/api`            | API Express; módulos de negocio en `src/modules` e infraestructura compartida en `src`   |
| `apps/web`            | Aplicación React; rutas en `App.tsx` y páginas/componentes por feature en `src/features` |
| `database/migrations` | Cambios versionados del esquema PostgreSQL                                               |
| `tests/dev`           | Checks de integración, navegador y regresión focalizada para DEV                         |
| `tests/qa`            | Escenarios Playwright y reporter de Xray                                                 |
| `scripts/xray`        | Importación, verificación y wrapper local de credenciales Xray                           |
| `docs`                | ADR, diseño QA, handoffs y reportes de release                                           |

Mantener la lógica de cada feature junto a su módulo. La infraestructura compartida vive en la capa de aplicación; evitar dependencias entre features si alcanza con un contrato común pequeño.

Requisitos: Docker Desktop / Compose y Node.js 22 para generar configuración.

```powershell
node scripts/init-env.mjs dev
docker compose up --build -d
docker compose ps
```

Si `.env` ya existe, conservarlo: el generador no sobrescribe secretos. Aplicación: http://localhost:8080/catalog. Bandeja Mailpit: http://localhost:8025. Registrar un cliente sintético y abrir el enlace de verificación capturado en Mailpit; el enlace activa la cuenta e inicia sesión.

El catálogo y el detalle son públicos. Cerrar sesión invalida la sesión del servidor y permite seguir navegando el catálogo. No se generan usuarios iniciales con el seed. PostgreSQL se ejecuta en Docker; las migraciones y los productos sintéticos se aplican automáticamente al iniciar la API.

Consultar el [handoff DEV → QA](docs/releases/sprint1-dev-handoff.md) para el contrato, los resultados reales, las limitaciones y el arranque QA aislado. La [decisión de acceso](docs/adr/ADR-002-sprint1-access-and-sessions.md) proviene de la aclaración del propietario, sin modificar los criterios de Jira.
