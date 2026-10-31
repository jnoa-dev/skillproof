# Activar la defensa técnica

La aplicación incluye las pantallas, API y migración, pero no ejecuta cambios sobre el Supabase remoto automáticamente.

1. El responsable del proyecto debe revisar y probar `migrations/202610310001_technical_defense.sql` en un entorno de pruebas con el esquema actual.
2. Aplicar esa migración mediante el flujo de despliegue de Supabase del equipo. Incluye una transacción: no ejecutar fragmentos aislados.
3. Con una cuenta evaluadora o administradora, abrir una entrega, entrar a **Defensa técnica → Configurar defensa**, revisar las preguntas y habilitarla.
4. Con la cuenta propietaria de esa entrega enviada, abrir **Mi desafío → Defensa técnica**.

El rol `recruiter` todavía no existe en la restricción `profiles_role_check` del esquema versionado. La nueva ruta `/recruiter` es un acceso reservado que informa de esta limitación, no un alta de permisos ni un panel con candidatos ficticios. No cambiar manualmente `user_metadata` para obtener privilegios.

## Datos y permisos

Las reglas y preguntas se copian al iniciar cada sesión. Las configuraciones posteriores afectan únicamente a nuevas sesiones. Las respuestas en curso son privadas para el candidato; la revisión exige rol evaluador/administrador y comprueba la asignación en una función del servidor. No se permite escribir directamente sobre las tablas desde el navegador.

El reloj autoritativo es PostgreSQL. Las operaciones se serializan por entrega con un bloqueo y las respuestas usan revisión optimista para evitar sobrescrituras entre pestañas. Los eventos incluyen un identificador único para evitar contarlos dos veces al reintentarlos. El envío bloquea las respuestas y es idempotente. No modifica las entregas de código, evaluaciones, rúbricas ni publicaciones existentes.

El cierre por tiempo se materializa en la siguiente petición del estudiante o del evaluador, con fecha efectiva igual al vencimiento. No requiere un cron y nunca permite guardar respuestas después del vencimiento, aunque el navegador haya estado cerrado o sin conexión. No se promete conservar cambios que aún no recibió el servidor. El tiempo restante del cliente usa una referencia del servidor y un reloj monotónico.

Las salidas y los intentos de pegado son señales del navegador; pueden perderse si se cierra o desconecta, y no constituyen un sistema de vigilancia ni una prueba de fraude. No se detecta uso de IA, no se calcula una nota automática, no se verifica un commit ni se firma criptográficamente el código. La ponderación es una referencia guardada para la revisión humana; no sustituye la rúbrica existente. La exportación utiliza el diálogo nativo de impresión/guardado PDF.

## Pruebas de aceptación en Supabase de pruebas

- Visitante y estudiante ajeno: sin acceso a la sesión ni las respuestas.
- Evaluador no asignado: sin acceso a las respuestas; candidato propietario: sí.
- Configurar, iniciar y cambiar la configuración: la sesión original conserva su copia.
- Abrir dos pestañas y guardar revisiones distintas: rechazar la sobrescritura obsoleta.
- Enviar, recargar y repetir envío: conservar el resultado, sin edición posterior.
- Vencer el plazo o alcanzar el límite de salidas: cerrar en servidor; repetir un nonce no suma otra salida.
- Interrumpir red: mostrar fallo de guardado; recuperar antes del plazo o cerrar al consultar tras vencer.

Las pruebas locales de rutas usan servicios simulados. La migración debe validarse y aplicarse en el proyecto remoto para comprobar RLS y concurrencia sobre PostgreSQL real.
