import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const required = [
    "MONGODB_URI",
    "JWT_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  if (required.some((key) => !process.env[key])) {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }

  try {
    await connectMongo();
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
