import { redirect } from "next/navigation";
import { validDateKey } from "@/lib/reporting";

export default async function Calendar({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day } = await searchParams;
  redirect(validDateKey(day) ? `/analisis?date=${day}` : "/analisis");
}
