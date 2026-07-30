import CostRequestDetailPage from "@/components/CostRequestDetailPage";

export default async function Page({ params }) {
  const { id } = await params;
  return <CostRequestDetailPage id={id} />;
}
