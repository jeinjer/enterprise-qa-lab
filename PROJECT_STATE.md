# PROJECT_STATE.md — Enterprise QA Lab
**Actualizado:** 2026-09-28 · **Versión:** 0.4.2 · **Estado:** SPRINT 1 — CORRECCIONES VERIFICADAS EN DEV, PENDIENTE FIJAR BUILD Y QA

### Registro de versión — 2026-09-28

El propietario autorizó el commit local de la implementación y las correcciones del Sprint 1, sin push. El commit que incorpora este registro identifica el build para la siguiente fase QA; consultar su SHA con `git log -1 --format=%H`. Las referencias siguientes a cambios sin commit o autorización pendiente describen el estado anterior a este registro. QA, regresión y UAT siguen pendientes; no se modifican estados de Jira.

### Revisión técnica — 2026-09-28

Se corrigieron con autorización del propietario TR-01 (cookie compartida entre ambientes) y TR-02 (error inicial persistente después de recuperarse). La cookie deriva del nombre del proyecto Compose y el frontend limpia el error al recuperar el estado de sesión. Typecheck y build Docker pasaron; tests unitarios: 4/4; `node tests/dev-review-fixes.mjs`: 7/7 checks focalizados con dos sesiones reales en un navegador y un fallo inicial inyectado por el test. Detalles en `docs/releases/sprint1-technical-review.md`. No hubo cambios en Jira ni commit. DEV se volvió a iniciar; el stack separado `northstar-review` se detuvo conservando su volumen. La base QA no se modificó. Las 30 verificaciones de integración y 12 de navegador del 25/09 permanecen históricas, sin reejecución total. Próximo paso: fijar el build mediante commit local autorizado y comenzar QA separadamente.

## Estado real
Fase: Sprint 1 — implementación DEV y preparación del handoff. Build local: `sprint1-0.1.0`, cambios sin commit. Implementadas XSP1-62/US-01, XSP1-63/US-02, XSP1-64/US-03, XSP1-65/US-04, XSP1-66/US-07 y XSP1-67/US-08. Stack DEV Docker operativo: web, API, PostgreSQL y Mailpit. Demo pública: no. Verificación DEV ejecutada: 4 tests unitarios, 30 checks de integración API/DB/Mailpit y 12 comprobaciones de navegador. No se declara QA, regresión, UAT ni aceptación de historias. Jira no fue modificado; no hubo commit, push, PR, merge ni despliegue remoto.

### Decisión explícita de acceso — Sprint 1

El propietario aprobó que **catálogo y detalle son públicos**: `GET /api/v1/products`, `GET /api/v1/products/:id`, `/catalog` y `/catalog/:id` no requieren autenticación. Logout invalida la sesión del servidor y redirige al catálogo público; la cookie anterior ya no permite consultar `/api/v1/auth/session`. Verificación exitosa crea sesión autenticada y redirige al catálogo. Se mantienen las reglas Jira de productos activos, inactivos, desconocidos y sin stock.

Esta aclaración resuelve una ambigüedad y **no se atribuye retrospectivamente a los criterios originales de Jira**. Se documenta en `docs/adr/ADR-002-sprint1-access-and-sessions.md`. La autorización actual del propietario habilitó el desarrollo del alcance indicado, sustituyendo la anterior instrucción de permanecer en Sprint 0.

### Implementación y verificaciones DEV — 2026-09-25

- React/TypeScript/Vite/React Router; Express/TypeScript; REST `/api/v1`; PostgreSQL y Mailpit en Compose.
- Registro validado con Zod, contraseñas Argon2id, unicidad email/DNI en DB, tokens SHA-256 de un solo uso y 30 minutos; reenvío invalida tokens anteriores.
- Sesiones PostgreSQL con cookie HttpOnly/SameSite=Lax, expiración de 8 horas, regeneración al autenticar, protección de origen y JSON, limitación local de solicitudes. HTTP local usa Secure=false; HTTPS requiere Secure=true.
- Migración `001_sprint1.sql` aplicada por runner con ledger y lock; tres productos sintéticos con estados activo con stock, activo sin stock e inactivo. No se siembran usuarios.
- `npm install`, actualización de Nodemailer y `npm audit --audit-level=low`: auditoría final informa 0 vulnerabilidades. Hubo intentos iniciales bloqueados por sandbox, reejecutados con permisos; no se contabilizaron como éxitos.
- `npm test`: 4/4. `npm run typecheck` y `npm run build`: exit 0. Build informa avisos de directivas `use client` de React Router ignoradas por Vite, sin impedir el bundle.
- `docker compose up --build -d`: migración/seed y servicios iniciados. Sesión persistió tras reiniciar API.
- `node tests/dev-integration.mjs`: 30 checks completados. `node tests/dev-browser.mjs`: 12 checks completados, incluidos caída real/recuperación PostgreSQL, ausencia de datos inventados y viewport móvil. Capturas revisadas en `evidence/dev-sprint1/`.
- `git diff --check`: sin errores. `.env` ignorado. Resultados, limitaciones, usuarios sintéticos y comandos de QA en `docs/releases/sprint1-dev-handoff.md`.
- Se verificó también el arranque técnico del stack QA aislado: migración aplicada, 0 clientes y 3 productos. Se dejó detenido conservando volumen/configuración; DEV queda operativo. Esto no constituye ejecución ni aceptación QA.

### Verificaciones realizadas — 2026-09-25
- Windows con WSL2 operativo.
- Hardware informado: 16 GB DDR5 y ~48 GB libres en C:.
- Git 2.48.1.windows.1, Node.js v22.19.0 y npm 10.9.3 disponibles.
- Docker Desktop 28.3.2 y Docker Compose v2.39.1-desktop.1 disponibles.
- Docker Engine verificado con `docker info` y `hello-world`; reportó 12 CPUs y 7.39 GiB disponibles para Docker.
- VS Code y Postman Desktop instalados y capaces de iniciar.
- Repositorio GitHub `enterprise-qa-lab` creado, clonado y con documentación inicial publicada, según confirmación del propietario.
- Jira: cuenta y sitio disponibles.
- Xray: trial de un mes disponible y operativo en el proyecto reutilizado. Tipos Xray presentes; cobertura, defectos y entornos DEV/QA/UAT configurados según confirmación del propietario.
- Salesforce Developer Edition creada y acceso verificado visualmente.
- PostgreSQL no se instalará por separado: se ejecutará mediante Docker cuando corresponda.

## Decisiones confirmadas en chat
D01–D16 aprobadas con ajustes, más D17: **un único repositorio** para SUT y QA. Resumen y detalles abiertos en §14 de `PROJECT_BRIEF.md`. D06: sesiones HttpOnly; D07: inventario simple/precio histórico; D08: Account/Contact/Case; D09: ownership aplicación/CRM; D10: Jira + Xray prioritario, evaluar Zephyr/Kiwi TCMS si no viable, GitHub no sustituye gestor de pruebas; D11: AI Quality independiente posterior, integración IA al SUT no aprobada; D12: DEV/QA/UAT locales separados con Docker y bases distintas, PRD demo web pública posterior a estabilizar R1; D13: 10–12 h/semana y sprints de 2 semanas; D15: k6; D16: Go/No-Go inicial aprobado. Pagos: simulador propio, sin proveedor externo.
ADR-001: **Accepted as baseline** por aprobación de D03/D05/D08/D09/D12, con detalles técnicos por refinar en Sprint 0. La aceptación del ADR no autoriza implementación ni gastos.

## Artefactos
- `PROJECT_BRIEF.md` v0.2.0: especificación consolidada.
- `PROJECT_STATE.md` v0.4.0: este estado.
- `ADR-001-architecture.md` v0.2.0: arquitectura aceptada como base.
La documentación previa estaba en el checkout. La implementación y documentación de Sprint 1 son cambios locales sin commit. Se añadieron ADR-002, README bilingüe, contrato/handoff, código, migración y verificaciones DEV.

## Pendientes y dependencias
- Vigilar almacenamiento local (~48 GB libres al verificar) por crecimiento de imágenes/volúmenes Docker y futuros artefactos de testing.
- Definir matriz de permisos, máquina de estados de pedido/pago y momento de reserva/descuento de stock.
- Refinar historias, DoR/DoD y estrategia QA; seleccionar hosting tras estabilizar R1 y verificar costo/seguridad.
- Definir aislamiento Salesforce y contratos de integración antes de R3.
- Establecer umbrales medibles de release y procedimiento de rollback; no contratar herramientas sin autorización.

## Próximo paso
Entregar build local Sprint 1 a QA y ejecutar la fase QA separadamente con sus casos, evidencia y gestión de defectos. No declarar aceptación ni ampliar alcance sin autorización. Consultar el handoff para levantar una base QA aislada de DEV.

## Registro de actividad
| Fecha | Actividad | Resultado |
|---|---|---|
| 2026-09-24 | Plan inicial v0.1.0 | propuesta sin aprobación |
| 2026-09-24 | Revisión D01–D16 y separación de repositorios | decisiones aprobadas; D17: repositorio único |
| 2026-09-24 | Consolidación v0.2.0 | archivos generados; sin despliegue, tests ni ejecución de herramientas |
| 2026-09-25 | Inicio Sprint 0 | herramientas locales, GitHub, Jira/Xray y Salesforce Developer Edition verificados; sin implementación del SUT |
| 2026-09-25 | Sprint 1 autorizado e implementado | seis historias leídas en Jira; ambigüedad de acceso resuelta por el propietario; aplicación persistente y verificaciones DEV realizadas; pendiente QA |

## HANDOFF PARA CHAT 00
El Sprint 1 fue autorizado posteriormente por el propietario y está implementado en DEV. El handoff vigente es `docs/releases/sprint1-dev-handoff.md`. El alcance futuro de pedidos, pagos, CRM e IA sigue fuera de esta entrega. No interpretar verificaciones DEV como aprobación QA/UAT o release aceptada.
