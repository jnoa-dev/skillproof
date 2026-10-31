# SkillProof

SkillProof es una plataforma para demostrar habilidades mediante desafíos técnicos, entregables y evaluaciones basadas en criterios claros. Está orientada a estudiantes y organizaciones que buscan evidencia práctica de competencias.

## Descripción

La plataforma permite que los estudiantes resuelvan desafíos, documenten su proceso y presenten sus soluciones para evaluación. Los resultados finalizados pueden compartirse mediante un pasaporte público, sujeto al consentimiento de cada estudiante.

## Funcionalidades

- Registro e inicio de sesión mediante Supabase Auth.
- Perfiles de estudiante y reclutador.
- Publicación de desafíos técnicos y envío de entregables.
- Evaluación manual mediante rúbricas y criterios definidos.
- Sugerencias de revisión de código generadas por Gemini.
- Pasaporte público con controles de consentimiento.
- Defensa técnica asociada a una entrega.

## Tecnologías

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth y Postgres
- Gemini API

## Requisitos

- Node.js y npm
- Proyecto de Supabase configurado
- Clave de Gemini para habilitar la revisión de código asistida por IA

## Instalación y ejecución local

Instalación de dependencias:

    npm ci

Variables de entorno requeridas en `.env.local`, ubicado en la raíz del proyecto:

    NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-public-key>
    GEMINI_API_KEY=<gemini-api-key>

Inicio del servidor de desarrollo:

    npm run dev

La aplicación queda disponible en `http://localhost:3000`.

Las claves y variables de entorno no deben incluirse en el repositorio. `GEMINI_API_KEY` debe mantenerse exclusivamente en el entorno del servidor.

## Base de datos y autenticación

La aplicación requiere el esquema de Supabase, sus triggers y las políticas de seguridad por fila (RLS).

El trigger `handle_new_user` utiliza el metadato `account_type` para asignar el rol inicial. La restricción `profiles_role_check` contempla los roles `student`, `recruiter`, `evaluator` y `admin`.

El historial de entrevistas es privado. Su consulta por parte de reclutadores depende del consentimiento del estudiante y de las políticas RLS correspondientes.

La funcionalidad de defensa técnica requiere la migración:

    supabase/migrations/202610310001_technical_defense.sql

El archivo `supabase/schema_actual_20261031.sql` contiene un volcado de referencia del esquema. En bases de datos existentes, el estado de las migraciones debe verificarse antes de aplicar cambios.

## Revisión de código asistida por IA

El endpoint de revisión analiza una muestra limitada de archivos de un repositorio público de GitHub y genera sugerencias vinculadas a los criterios seleccionados.

La revisión de IA es de apoyo: no ejecuta el proyecto, no realiza benchmarks, no guarda resultados ni finaliza evaluaciones. La calificación definitiva corresponde al evaluador. La disponibilidad del análisis depende del servicio de Gemini; las evaluaciones también pueden completarse manualmente.

## Rutas principales

| Ruta | Descripción |
| --- | --- |
| `/` | Página de inicio |
| `/login` | Registro e inicio de sesión |
| `/dashboard` | Panel del estudiante |
| `/challenges/[slug]` | Detalle del desafío |
| `/evaluator` | Panel del evaluador |
| `/recruiter` | Entrada al panel del reclutador |
| `/passport/[slug]` | Pasaporte público |
| `/challenges/[slug]/defense` | Defensa técnica de una entrega |

El panel de reclutador cuenta con una vista inicial. La integración de sus herramientas continúa en desarrollo.

## Verificación

Lint:

    npm run lint

Pruebas:

    node --test tests/*.test.mjs

## Despliegue

La aplicación puede desplegarse en Vercel mediante la importación del repositorio de GitHub. Las variables de entorno deben configurarse en los ambientes correspondientes de Vercel.

Para autenticación en producción, la configuración de URL de Supabase Auth debe incluir el dominio del sitio y la ruta de retorno:

    https://<production-domain>/auth/callback
