import { RevenueExpenseForm } from "../_components/revenue-expense-form";

type PageProps = {
  params: Promise<{
    revenueExpenseId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { revenueExpenseId } = await params;

  return <RevenueExpenseForm revenueExpenseId={revenueExpenseId} />;
};

export default Page;
