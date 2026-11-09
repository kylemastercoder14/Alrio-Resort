import { UserRoleForm } from "../_components/user-role-form";

type PageProps = {
  params: Promise<{
    userRoleId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { userRoleId } = await params;

  return <UserRoleForm userRoleId={userRoleId} />;
};

export default Page;
