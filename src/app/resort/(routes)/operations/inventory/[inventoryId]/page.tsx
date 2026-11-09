import { InventoryForm } from "../_components/inventory-form";

type PageProps = {
  params: Promise<{
    inventoryId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { inventoryId } = await params;

  return <InventoryForm inventoryId={inventoryId} />;
};

export default Page;
