import DefenseRoute from "@/components/defense/defense-route";
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <DefenseRoute params={params} mode="receipt" />;
}
