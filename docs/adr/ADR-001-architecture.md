# ADR-001 — Arquitectura modular local con integración Salesforce asíncrona
**Estado:** Accepted as baseline (aprobado en chat; detalles de implementación pendientes)  
**Fecha:** 2026-09-24 · **Versión:** 0.2.0  
**Decisores:** propietario del laboratorio, con asesoría del chat 00  
**Ámbito:** estructura del SUT, persistencia, CRM, pagos simulados e IA.

## Contexto
El laboratorio debe ofrecer comportamiento real y testeable, persistencia, autenticación, fallos reproducibles y un ciclo completo de QA. Lo desarrolla y prueba principalmente una persona, con presupuesto preferentemente cero. Salesforce es un CRM externo con límites de API y disponibilidad independientes del sistema local. Los reintentos de pago e integración crean riesgo de duplicados y divergencia.

## Decisión propuesta
1. Adoptar **monolito modular** con frontend separado, backend REST y PostgreSQL local bajo Docker Compose. Módulos de identidad, clientes, catálogo, pedidos, pagos simulados, devoluciones, soporte, integración, IA y auditoría con contratos internos explícitos.
2. Mantener PostgreSQL como fuente de verdad de transacciones comerciales locales y Salesforce como fuente de verdad de Case y campos CRM editados allí. Definir matriz de propiedad de campos antes de construir la integración.
3. Integrar Salesforce desde un adaptador backend; persistir eventos en outbox dentro de la transacción local y procesarlos mediante worker con reintentos acotados, idempotencia, trazas y reconciliación. Mostrar estado `sync_pending` cuando corresponda. No prometer consistencia inmediata ni exactly-once delivery.
4. Usar **simulador de pagos** con escenarios deterministas de aprobación, rechazo y timeout; no usar pasarela real. AI Quality se trabajará después como evaluación independiente; no se integra IA al SUT inicialmente. Toda integración futura requiere Change Request, aprobación de costo y tratamiento de datos.
5. Separar configuración, versiones y datos de DEV/QA/UAT locales y de la futura demo PRD; no afirmar aislamiento físico entre ambientes locales ni aislamiento real de Salesforce cuando se comparte una Developer Org. No exponer secretos al navegador ni al repositorio.
6. Usar React+TypeScript, Node.js+Express+TypeScript y PostgreSQL; autenticación mediante sesiones con cookies HttpOnly y controles CSRF a definir. DEV/QA/UAT en stacks Docker locales separados con bases independientes; PRD será demo pública con base propia tras estabilizar R1, sujeto a verificación de hosting, costos y seguridad.

## Alternativas consideradas
- **Microservicios:** mejor aislamiento y despliegue independiente; descartados provisionalmente por overhead operativo y riesgo de que la infraestructura opaque el aprendizaje QA.
- **Integración síncrona exclusiva:** simple al inicio, pero acopla pedidos al uptime y rate limits del CRM; no se propone para eventos de negocio.
- **Salesforce como base de todos los pedidos/pagos:** reduce algunas duplicaciones, pero aumenta dependencia externa, límites y complejidad de licencias/modelado; no se propone para este laboratorio.
- **Mocks de toda la aplicación:** rápidos de montar, pero no prueban persistencia, integridad ni errores reales; descartados. Solo se permiten simuladores explícitos de servicios externos.
- **Proveedor IA obligatorio desde R0:** crea costo y variabilidad antes de tener dataset/rubric; se difiere.

## Consecuencias positivas
Menor carga de despliegue, pruebas locales reproducibles, límites claros de responsabilidad, escenarios de integración fallida y trazabilidad de operaciones. Permite probar UI/API/DB/CRM sin representar mocks como producto real.

## Costos y consecuencias negativas
Worker/outbox, idempotencia y reconciliación agregan código y casos de prueba. La consistencia eventual exige estados visibles y procedimientos de soporte. Una Developer Org compartida no equivale a ambientes Salesforce aislados. Docker y CI consumen recursos; proveedor IA/hosting podrían generar costos si se habilitan.

## Invariantes verificables
- Un reintento con la misma clave no duplica el pago simulado ni el pedido según contrato.
- Una caída de Salesforce no revierte una transacción local ya confirmada; queda evento pendiente recuperable.
- Un cliente no puede leer ni modificar pedidos o tickets de otro cliente.
- Toda mutación crítica registra actor, timestamp y correlation ID sin secretos.
- La sugerencia IA no se publica al cliente sin aprobación del agente.
- La reconciliación identifica discrepancias y permite resolverlas sin ocultar fallos.

## Condiciones pendientes de implementación
Antes de desarrollar, refinar máquina de estados, matriz de ownership y contratos mínimos, comprobar capacidades de Developer Org y documentar sesiones/CSRF y presupuesto. El ADR fija una arquitectura base, no certifica disponibilidad de herramientas ni autoriza programación, compras o despliegue público por sí mismo.

## Revisión futura
Reevaluar si el volumen de integraciones, aislamiento, costo o capacidad de operación justifican dividir servicios. Toda modificación estructural requiere nuevo ADR y Change Request.

## Organización del proyecto
Un único repositorio `enterprise-qa-lab` contendrá el SUT y los artefactos QA en carpetas diferenciadas; no se crean dos proyectos GitHub. Jira gestiona historias/bugs y Xray es la primera opción para casos/planes/ejecuciones, sujeto a verificación de licencia; GitHub no lo sustituye. Performance: k6. Pagos: simulador propio, sin pasarela externa. UAT es simulada y se documenta como tal.
