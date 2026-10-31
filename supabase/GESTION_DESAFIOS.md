# Gestión de desafíos y candidatos

## Rutas

- `/evaluator/challenges`: catálogo de administración.
- `/evaluator/challenges/new`: creación vacía o parcial.
- `/evaluator/challenges/[challengeId]/edit`: edición, validaciones, slug ocupado/inválido y contenido bloqueado cuando existen participantes.
- `/evaluator/candidates`: directorio de entregas enviadas visibles, filtros combinables, paginación y CSV.
- `/evaluator/candidates/[candidateId]`: resultados y comentarios que la cuenta puede consultar mediante RLS.
- `/evaluator/submissions/[submissionId]/interview`: entrevista en página completa con borrador, validación, confirmación, finalización y respuesta visible del candidato.
- `/evaluator/interviews`: entrada exclusiva del equipo para seleccionar la entrega que desea entrevistar. Las rutas antiguas redirigen allí al evaluador antes de mostrar el historial del estudiante.

La navegación del equipo no ofrece «Vista estudiante». Las páginas de desafío, entrega y defensa verifican el rol. Las API de entregas, defensa y respuesta del candidato también rechazan esas acciones desde cuentas evaluadoras. «Mi cuenta» conserva perfil y seguridad para el equipo, sin la pestaña de privacidad del pasaporte del estudiante.

## Activación

Las entrevistas y el directorio reutilizan las tablas y permisos existentes. No se habilita el rol `recruiter` ni se amplía la lectura de perfiles. Por ello, los nombres pueden aparecer como «Nombre no disponible»; no se sustituyen con personas ficticias. Una evaluación o entrevista no visible no equivale a un registro inexistente. No se muestran correos o instituciones ni se deduce publicación del pasaporte a partir de una evaluación finalizada.

La creación y edición necesitan que el responsable de Supabase revise, pruebe y aplique `migrations/202610310002_challenge_management.sql` mediante el flujo de despliegue del equipo. No se ejecuta automáticamente. Las funciones comprueban el rol `admin` en el servidor; los evaluadores y reclutadores no reciben permisos adicionales. Si la migración falta, la API devuelve 503 con un aviso explícito, sin simular un guardado.

El editor guarda manualmente: no se anuncia un autoguardado inexistente. Los borradores requieren título e identificador válidos; pueden quedar pendientes descripción, contexto, dificultad, requisitos, entregables y rúbrica. Para activar deben completarse y los pesos de la rúbrica sumar 100 %. La comprobación de slug incluye desafíos inactivos y excluye el propio; la restricción única de PostgreSQL decide al guardar, incluso si dos usuarios consultaron disponibilidad a la vez.

El guardado es transaccional y comprueba una revisión optimista. No existe versionado de especificaciones por participante. Por eso, desde este módulo, si ya existe cualquier participación se bloquean identificador, contenido y rúbrica; solo se puede cambiar la disponibilidad. No se reemplazan criterios que ya se usan en entregas. El formulario de entrega sigue siendo el compartido del proyecto y su pestaña muestra sus campos reales; no permite añadir campos que el backend no soporta. Solo se utilizan los tres niveles de dificultad existentes.

La consulta del directorio está limitada a las 200 entregas enviadas más recientes. Los indicadores y el CSV corresponden a ese conjunto visible, no a un total global ni a entrevistas agendadas. El CSV protege celdas que podrían interpretarse como fórmulas. Las notas y el desglose se solicitan únicamente al abrir un perfil, no en la consulta general.

## Comprobación en un entorno de pruebas

Validar con PostgreSQL y las cuentas de prueba: rechazo a no administradores, creación de borrador parcial, activación completa con rúbrica real, slugs duplicados entre activos/inactivos, conflicto de revisiones, bloqueo con participantes y transacción revertida ante cualquier error. Verificar que el contexto aparezca en «Mi desafío» y que la rúbrica coincida con el panel evaluador. Probar entrevistas ya finalizadas, asignaciones ajenas y sesiones caducadas. Las comprobaciones locales no sustituyen estas pruebas de RLS y concurrencia en Supabase real.
