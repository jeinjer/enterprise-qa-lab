# PROJECT_STATE.md — Enterprise QA Lab
**Actualizado:** 2026-09-24 · **Versión:** 0.2.0 · **Estado:** PLAN BASE APROBADO; Sprint 0 no iniciado

## Estado real
Fase: planificación consolidada. Sprint activo: ninguno. Release activa: ninguna. Aplicación implementada: no. Ambientes desplegados: ninguno. Demo pública: no. Cuentas/licencias verificadas: ninguna en esta sesión. Tests ejecutados: 0; resultados: no disponibles. Bugs reportados: 0; no implica ausencia de defectos. Repositorio GitHub: no se ha verificado creación ni publicación.

## Decisiones confirmadas en chat
D01–D16 aprobadas con ajustes, más D17: **un único repositorio** para SUT y QA. Resumen y detalles abiertos en §14 de `PROJECT_BRIEF.md`. D06: sesiones HttpOnly; D07: inventario simple/precio histórico; D08: Account/Contact/Case; D09: ownership aplicación/CRM; D10: Jira + Xray prioritario, evaluar Zephyr/Kiwi TCMS si no viable, GitHub no sustituye gestor de pruebas; D11: AI Quality independiente posterior, integración IA al SUT no aprobada; D12: DEV/QA/UAT locales separados con Docker y bases distintas, PRD demo web pública posterior a estabilizar R1; D13: 10–12 h/semana y sprints de 2 semanas; D15: k6; D16: Go/No-Go inicial aprobado. Pagos: simulador propio, sin proveedor externo.
ADR-001: **Accepted as baseline** por aprobación de D03/D05/D08/D09/D12, con detalles técnicos por refinar en Sprint 0. La aceptación del ADR no autoriza implementación ni gastos.

## Artefactos
- `PROJECT_BRIEF.md` v0.2.0: especificación consolidada.
- `PROJECT_STATE.md` v0.2.0: este estado.
- `ADR-001-architecture.md` v0.2.0: arquitectura aceptada como base.
Son archivos locales generados para revisión; no se confirmó que estén en GitHub.

## Pendientes y dependencias
- Confirmar equipo, Docker y cuentas gratuitas, especialmente Salesforce Developer Org y Jira/Xray.
- Definir matriz de permisos, máquina de estados de pedido/pago y momento de reserva/descuento de stock.
- Refinar historias, DoR/DoD y estrategia QA; seleccionar hosting tras estabilizar R1 y verificar costo/seguridad.
- Definir aislamiento Salesforce y contratos de integración antes de R3.
- Establecer umbrales medibles de release y procedimiento de rollback; no contratar herramientas sin autorización.

## Próximo paso
Revisar los documentos v0.2.0 y, tras confirmación, abrir Sprint 0 **documental y de verificación de prerrequisitos**, sin programación de aplicación. Si se pide implementar, confirmar explícitamente el inicio del sprint correspondiente.

## Registro de actividad
| Fecha | Actividad | Resultado |
|---|---|---|
| 2026-09-24 | Plan inicial v0.1.0 | propuesta sin aprobación |
| 2026-09-24 | Revisión D01–D16 y separación de repositorios | decisiones aprobadas; D17: repositorio único |
| 2026-09-24 | Consolidación v0.2.0 | archivos generados; sin despliegue, tests ni ejecución de herramientas |

## HANDOFF PARA CHAT 00
Permanecer en chat 00. Presentar v0.2.0 para revisión; no dar por iniciada la implementación. Sprint 0: verificar prerrequisitos y refinar requisitos; registrar resultados reales y actualizar este archivo.
