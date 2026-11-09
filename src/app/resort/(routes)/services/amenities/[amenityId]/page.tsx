import { AmenityForm } from "../_components/amenity-form";

type PageProps = {
  params: Promise<{
    amenityId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { amenityId } = await params;

  return <AmenityForm amenityId={amenityId} />;
};

export default Page;
