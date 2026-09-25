# PROJECT_STATE.md — Enterprise QA Lab
**Actualizado:** 2026-09-25 · **Versión:** 0.3.0 · **Estado:** SPRINT 0 EN CURSO

## Estado real
Fase: Sprint 0 — preparación del laboratorio. Sprint activo: Sprint 0. Release activa: ninguna. Aplicación implementada: no. Ambientes Northstar desplegados: ninguno. Demo pública: no. Tests del SUT ejecutados: 0. Bugs del SUT reportados: 0; esto no implica ausencia de defectos.

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
- `PROJECT_STATE.md` v0.2.0: este estado.
- `ADR-001-architecture.md` v0.2.0: arquitectura aceptada como base.
Son archivos locales generados para revisión; no se confirmó que estén en GitHub.

## Pendientes y dependencias
- Vigilar almacenamiento local (~48 GB libres al verificar) por crecimiento de imágenes/volúmenes Docker y futuros artefactos de testing.
- Definir matriz de permisos, máquina de estados de pedido/pago y momento de reserva/descuento de stock.
- Refinar historias, DoR/DoD y estrategia QA; seleccionar hosting tras estabilizar R1 y verificar costo/seguridad.
- Definir aislamiento Salesforce y contratos de integración antes de R3.
- Establecer umbrales medibles de release y procedimiento de rollback; no contratar herramientas sin autorización.

## Próximo paso
Continuar Sprint 0 con refinamiento del backlog inicial, criterios de aceptación, DoR/DoD y estrategia QA. No iniciar implementación de Northstar Commerce hasta preparar los prerrequisitos de Sprint 1.

## Registro de actividad
| Fecha | Actividad | Resultado |
|---|---|---|
| 2026-09-24 | Plan inicial v0.1.0 | propuesta sin aprobación |
| 2026-09-24 | Revisión D01–D16 y separación de repositorios | decisiones aprobadas; D17: repositorio único |
| 2026-09-24 | Consolidación v0.2.0 | archivos generados; sin despliegue, tests ni ejecución de herramientas |
| 2026-09-25 | Inicio Sprint 0 | herramientas locales, GitHub, Jira/Xray y Salesforce Developer Edition verificados; sin implementación del SUT |

## HANDOFF PARA CHAT 00
Permanecer en chat 00. Sprint 0 está en curso. Prerrequisitos principales verificados; siguiente bloque: refinamiento del backlog y preparación de Sprint 1. No dar por iniciada la implementación del SUT.
