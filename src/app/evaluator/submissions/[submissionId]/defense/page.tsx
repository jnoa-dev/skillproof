import DefenseRoute from "@/components/defense/defense-route";
export default function Page({ params }: { params: Promise<{ submissionId: string }> }) {
  return <DefenseRoute params={params} mode="review" />;
}
