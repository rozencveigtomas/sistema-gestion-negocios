import { redirect } from "next/navigation";

/** The subscription screen was removed from the product. Keep old bookmarks safe. */
export default function RemovedSubscription() {
  redirect("/inicio");
}
