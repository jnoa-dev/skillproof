# SkillProof

Plataforma para que estudiantes de Perú y Latinoamérica demuestren sus habilidades mediante desafíos técnicos, entregables y evaluación con criterios claros. Busca dar visibilidad al talento y facilitar a las pymes la revisión de evidencia práctica.

## Funcionalidades

- Registro e inicio de sesión con Supabase.
- Perfiles de estudiante y reclutador.
- Desafíos técnicos y envío de entregables con repositorio, documentación y justificación.
- Panel de evaluación con rúbrica y calificación manual.
- Revisión de código asistida por IA. Sus sugerencias no se guardan ni finalizan una evaluación.
- Pasaporte público de habilidades, visible según el consentimiento del estudiante.
- Defensa técnica asociada a una entrega.

## Tecnologías

- Next.js 16
- React 19
- TypeScript
- Supabase Auth y Postgres
- Tailwind CSS
- Gemini API para sugerencias de revisión de código

## Requisitos

- Node.js y npm
- Un proyecto de Supabase configurado
- Una clave de Gemini para usar la revisión de código con IA

## Ejecutar localmente

Instala las dependencias:

```bash
npm ci
