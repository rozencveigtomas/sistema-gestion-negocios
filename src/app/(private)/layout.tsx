import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, business } = await requireUser();
  return (
    <Shell profile={profile} business={business}>
      {children}
    </Shell>
  );
}
