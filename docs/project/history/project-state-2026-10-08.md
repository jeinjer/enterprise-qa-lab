> Archived snapshot from 2026-10-08, retained for traceability. Some entries reflect the project state at the time they were written and are superseded. The current source of truth is the root `PROJECT_STATE.md` and the linked Sprint 1 release report.

---

# PROJECT_STATE.md — Enterprise QA Lab

**Actualizado:** 2026-10-08 · **Versión:** 0.4.8 · **Estado:** SPRINT 1 CERRADO — QA PASS, UAT ACEPTADO, 6 HISTORIAS FINALIZADAS

### Estado actual — cierre Sprint 1, 2026-10-08

Informe de salida: `docs/releases/sprint1-qa-exit-report.md`; recuperación/rollback: `docs/releases/sprint1-rollback.md`. Regresión completa: Playwright 12/12 y Xray verificado en 12/12 tests y 30/30 pasos PASSED; CAT-04 incluye outage y recuperación. Unit tests 4/4, typecheck/build PASS y `npm audit` informa 0 vulnerabilidades tras actualizar `source-map-js` 1.2.1→1.2.2. Revisión básica de controles locales documentada; no fue pentest. El propietario aceptó el UAT simulado después de resolver la observación de contraseña contra BR-11. **Go/No-Go: GO para el alcance local del Sprint 1.** Jira XSP1-62…67: **Finalizada**. Siguen abiertos tres bugs Medium de muestra sin vínculo a esas historias; no son defectos encontrados en el Sprint 1. No hubo despliegue de producción.

Observación UAT — XSP1-62: el propietario vio que el campo contraseña acepta espacios. Comprobado contra BR-11: los valores de contraseña no se recortan; BR-05 define longitud/requisitos y BR-06 exige coincidencia exacta. `apps/api/src/modules/identity/validation.test.ts` ya verifica que `" Password! "` se conserve literalmente. Comportamiento esperado, no se crea defecto ni se altera Jira. El propietario aceptó el flujo UAT.

Cierre Sprint 1 — 2026-10-08: tras el UAT aprobado por el propietario, se cambiaron XSP1-62…67 a **Finalizada**. Xray XSP1-82 verificado en 12/12 tests y 30/30 pasos PASSED; Playwright 12/12; audit 0 vulnerabilidades. Go para el entorno local del laboratorio; sin release ni despliegue de producción.

Xray Test Execution XSP1-82 verificado vía GraphQL: **12/12 PASSED y 30/30 pasos PASSED**. Incluye CAT-01…CAT-04, DET-01…DET-04 e IDN-01…IDN-04. Los cuatro casos de identidad se crearon y vincularon a XSP1-62…65: IDN-01 XSP1-83, IDN-02 XSP1-84, IDN-03 XSP1-85, IDN-04 XSP1-86. Corrida Playwright más reciente: 11/11 pasaron (CAT-01…03, DET-01…04, IDN-01…04; 26 pasos); CAT-04 ya constaba aprobado y permanece en Xray. En esa corrida no se repitió CAT-04 porque Windows bloqueó acceso a Docker; QA readiness respondió HTTP 200. QA `http://localhost:8081`, build `sprint1-0.1.0`.

La cobertura automatizada y su sincronización con Xray están terminadas. Próximo paso: decisión del propietario sobre aceptación/cierre de Sprint 1.

Importador Xray: `npm run xray:import:qa` usa el wrapper de Windows. En la primera ejecución después de este cambio pide Client ID/Secret y guarda el conjunto cifrado con DPAPI para el usuario actual en `.xray-credentials.dpapi` (ignorado por Git); ejecuciones siguientes lo reutilizan. `-ResetCredentials` permite rotarlo. Para CI, `npm run xray:import:qa:node` consume secretos desde variables de entorno.

### Registro de versión — 2026-09-28

El propietario autorizó el commit local de la implementación y las correcciones del Sprint 1, sin push. El commit que incorpora este registro identifica el build para la siguiente fase QA; consultar su SHA con `git log -1 --format=%H`. Las referencias siguientes a cambios sin commit o autorización pendiente describen el estado anterior a este registro. QA, regresión y UAT siguen pendientes; no se modifican estados de Jira.

### Revisión técnica — 2026-09-28

Se corrigieron con autorización del propietario TR-01 (cookie compartida entre ambientes) y TR-02 (error inicial persistente después de recuperarse). La cookie deriva del nombre del proyecto Compose y el frontend limpia el error al recuperar el estado de sesión. Typecheck y build Docker pasaron; tests unitarios: 4/4; `npm run test:dev:review`: 7/7 checks focalizados con dos sesiones reales en un navegador y un fallo inicial inyectado por el test. Detalles en `docs/releases/sprint1-technical-review.md`. No hubo cambios en Jira ni commit. DEV se volvió a iniciar; el stack separado `northstar-review` se detuvo conservando su volumen. La base QA no se modificó. Las 30 verificaciones de integración y 12 de navegador del 25/09 permanecen históricas, sin reejecución total. Próximo paso: fijar el build mediante commit local autorizado y comenzar QA separadamente.

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
- `npm run test:dev:integration`: 30 checks completados. `npm run test:dev:browser`: 12 checks completados, incluidos caída real/recuperación PostgreSQL, ausencia de datos inventados y viewport móvil. Capturas revisadas en `evidence/dev-sprint1/`.
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

| Fecha      | Actividad                                     | Resultado                                                                                                                                             |
| ---------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-24 | Plan inicial v0.1.0                           | propuesta sin aprobación                                                                                                                              |
| 2026-09-24 | Revisión D01–D16 y separación de repositorios | decisiones aprobadas; D17: repositorio único                                                                                                          |
| 2026-09-24 | Consolidación v0.2.0                          | archivos generados; sin despliegue, tests ni ejecución de herramientas                                                                                |
| 2026-09-25 | Inicio Sprint 0                               | herramientas locales, GitHub, Jira/Xray y Salesforce Developer Edition verificados; sin implementación del SUT                                        |
| 2026-09-25 | Sprint 1 autorizado e implementado            | seis historias leídas en Jira; ambigüedad de acceso resuelta por el propietario; aplicación persistente y verificaciones DEV realizadas; pendiente QA |

## HANDOFF PARA CHAT 00

El Sprint 1 fue autorizado posteriormente por el propietario y está implementado en DEV. El handoff vigente es `docs/releases/sprint1-dev-handoff.md`. El alcance futuro de pedidos, pagos, CRM e IA sigue fuera de esta entrega. No interpretar verificaciones DEV como aprobación QA/UAT o release aceptada.

### Preparación de casos Xray — 2026-09-28

CAT-01 fue creado por el propietario como XSP1-74, con pasos Manual y vínculo tests a XSP1-66. Se preparó docs/qa/imports/sprint1-catalog-xray.json con los siete casos restantes (16 pasos y vínculos a US-07/US-08). La carga sigue pendiente: el selector de archivos del navegador automatizado no respondió. No se crearon casos adicionales ni Test Executions ni resultados PASS/FAIL. Detalle en docs/qa/sprint1-catalog-test-design.md.

Corrección del archivo Xray: el propietario informó rechazo de las siete entradas por description no textual, con issues=[]; se convirtió description a string y se validaron 7 casos / 16 pasos. Importación y verificación aún pendientes.

### Retoma QA — 2026-10-08

Según confirmación del propietario: ocho casos importados, ejecución XSP1-82, CAT-01 PASS manual sin capturas y build informada sprint1-0.1.0. Se preparó CAT-02 en tests/qa/catalog.spec.ts con configuración Playwright QA independiente, captura automática, respuesta API y contexto de ejecución. No se importaron resultados automáticos a Xray. QA localhost:8081 rechaza conexión y Docker Engine no está disponible; ejecución funcional pendiente de levantar QA. Próximo paso: ejecutar npm run test:qa -- --grep CAT-02 y revisar juntos el reporte.

Resultado QA CAT-02 — 2026-10-08: `npm run test:qa -- --grep CAT-02` pasó (1/1). QA respondió en localhost:8081 con build reportada sprint1-0.1.0; API incluyó Slate Notebook con `available=false` y la UI mostró el producto, precio y estado sin stock. Playwright guardó contexto, respuesta API y captura en test-results/qa (ignorado por Git). Aún no se importó resultado a Xray XSP1-82. El comando Docker reportó acceso denegado al daemon, pero el stack QA ya estaba operativo y permitió ejecutar el test.

Resultado QA CAT-03 — 2026-10-08: corrida conjunta `npm run test:qa -- --grep CAT-0[23]` pasó 2/2 (CAT-02 y CAT-03). CAT-03 confirmó que Archive Stand (inactivo) no aparece en API ni UI, y los dos productos activos se mantienen visibles. Evidencias automáticas bajo test-results/qa (ignorado por Git). Sin sincronización aún con Xray XSP1-82.

Resultado QA DET-01 — 2026-10-08: corrida `npm run test:qa -- --grep CAT-0[23]|DET-01` pasó 3/3. DET-01 verificó API anónima y acceso directo al detalle público con los atributos correctos de Orbit Desk Lamp; Playwright adjuntó respuesta y captura en test-results/qa (ignorado por Git). Resultados no importados aún a Xray XSP1-82.

Cierre de automatización Sprint 1 — 2026-10-08: se añadieron pruebas Playwright para CAT-02/03/04 y DET-01/02/03/04. Corrida QA completa, con CAT-04 habilitado, pasó 7/7. CAT-04 detuvo únicamente PostgreSQL del proyecto northstar-qa; restauración verificada por health/readiness HTTP 200. El reporte JUnit custom `test-results/qa/xray-junit.xml` asocia las claves XSP1-75…81, comenta ambiente/build e incrusta evidencia API/UI. Aún pendiente importar ese reporte a Xray XSP1-82: requiere Xray API Client ID/Secret, no disponibles en el entorno. `scripts/xray/import-results.ps1` ofrece prompt local y efímero para importar sin guardar secretos.

Importación Xray — 2026-10-08: primer intento autenticó e inició la importación, pero Xray devolvió HTTP 400 al actualizar `customfield_10043` en XSP1-82 porque el campo no está disponible en la pantalla aplicable. Se quitó `testEnvironments` de la solicitud; el ambiente QA y el build siguen en los comentarios de cada resultado. Pendiente reintentar la importación.

Reintento Xray — 2026-10-08: el mismo HTTP 400 persistió sin `testEnvironments`. Se quitó también `revision` para aislar la actualización de XSP1-82; la siguiente importación enviará únicamente el Test Execution existente y el XML de resultados. Si vuelve a fallar por `customfield_10043`, requerirá revisar la configuración de campos/pantalla de Test Execution con permisos de administrador de Jira/Xray.

Importación Xray completada — 2026-10-08: tras quitar también `revision`, Xray confirmó en XSP1-82 **PASSED: 8 (100%), TESTS TOTALES: 8**. Quedaron registrados CAT-01 (PASS manual) y los siete casos Playwright automatizados CAT-02/03/04 y DET-01/02/03/04. El ambiente QA y build sprint1-0.1.0 están en el comentario de cada test run.

Sincronización por paso de Xray — 2026-10-08: al revisar CAT-02 se detectó que la importación JUnit actualizaba el estado general del Test Run pero no los pasos manuales, que quedaban TODO. Se actualizó el reporter para producir Xray JSON con resultados por `test.step`, y el importador ahora usa el endpoint JSON de Xray. La suite Playwright QA completa pasó 7/7; el reporte contiene 16/16 pasos PASSED y sus evidencias globales. Pendiente reimportar en XSP1-82 y verificar los pasos en Xray.

### QA identidad y sincronización Xray — 2026-10-08

IDN-01…04 pasaron 4/4 y se importaron como XSP1-83…86, vinculados respectivamente a XSP1-62…65. La corrida Playwright de 11 casos (CAT-01…03, DET-01…04, IDN-01…04) pasó 11/11 y sincronizó 26 pasos. Consulta de verificación Xray confirmó en XSP1-82 los 12 casos existentes con 12/12 PASSED y 30/30 pasos PASSED, incluido CAT-04 aprobado previamente. Se añadió `npm run xray:verify:qa`; las credenciales DPAPI se reutilizan y el importador de Test Cases evita duplicar los casos ya creados.
