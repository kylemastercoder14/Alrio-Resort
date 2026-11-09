import { RoomForm } from "../_components/room-form";

type PageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { roomId } = await params;

  return <RoomForm roomId={roomId} />;
};

export default Page;
