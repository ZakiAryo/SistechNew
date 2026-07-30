import CostRequestPrintPage from "@/components/CostRequestPrintPage";

export default async function Page({ params }) {
  const { id } = await params;
  return <CostRequestPrintPage id={id} />;
}
