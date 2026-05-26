import AccountPayablePrintPage from "@/components/AccountPayablePrintPage";

export default async function FinanceAccountPayablePrintRoute({ params }) {
  const { id } = await params;

  return <AccountPayablePrintPage id={id} />;
}
