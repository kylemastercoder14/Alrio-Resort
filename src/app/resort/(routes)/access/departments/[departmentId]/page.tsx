import { DepartmentForm } from "../_components/department-form";

type PageProps = {
  params: Promise<{
    departmentId: string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { departmentId } = await params;

  return <DepartmentForm departmentId={departmentId} />;
};

export default Page;
