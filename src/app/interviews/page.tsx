import InterviewHistory from "./_components/interview-history";

export default function InterviewsPage() {
  // No hay un servicio de entrevistas conectado. No equivale a una consulta vacía.
  return <InterviewHistory source={{ status: "disconnected" }} />;
}
