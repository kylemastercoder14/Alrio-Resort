import { PackageForm } from "../_components/package-form";

type PageProps = {
  params: Promise<{
    packageId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { packageId } = await params;

  return <PackageForm packageId={packageId} />;
};

export default Page;
