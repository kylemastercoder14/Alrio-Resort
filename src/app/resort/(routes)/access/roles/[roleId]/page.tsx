import { RoleForm } from "../_components/role-form";

type PageProps = {
  params: Promise<{
    roleId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { roleId } = await params;

  return <RoleForm roleId={roleId} />;
};

export default Page;
