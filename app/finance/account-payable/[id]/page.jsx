import AccountPayableDetailPage from "@/components/AccountPayableDetailPage";

export default async function FinanceAccountPayableDetailRoute({ params }) {
  const { id } = await params;

  return <AccountPayableDetailPage id={id} />;
}
