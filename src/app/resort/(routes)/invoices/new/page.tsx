import { CreateInvoiceView } from "./_components/create-invoice-view";

type PageProps = {
  searchParams: Promise<{
    id?: string;
  }>;
};

const Page = async ({ searchParams }: PageProps) => {
  const { id } = await searchParams;

  return <CreateInvoiceView invoiceId={id} />;
};

export default Page;
