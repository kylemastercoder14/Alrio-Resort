import { ServiceForm } from "../_components/service-form";

type PageProps = {
  params: Promise<{
    serviceId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { serviceId } = await params;

  return <ServiceForm serviceId={serviceId} />;
};

export default Page;
