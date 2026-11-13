import type { Metadata } from "next";
import Workspace from "@/components/app/workspace";

export const metadata: Metadata = { title: "Workspace — MEGHAM" };

export default function DashboardPage() {
  return <Workspace />;
}
