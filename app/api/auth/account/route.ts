import { NextResponse } from "next/server";
import { tooMany, verifyPassword } from "@/lib/auth";
import { destroyAsset } from "@/lib/files";
import { connectMongo } from "@/lib/mongodb";
import { rateLimit } from "@/lib/rateLimit";
import { clearSession, getSessionUserId } from "@/lib/session";
import { CloudFile } from "@/models/CloudFile";
import { Folder } from "@/models/Folder";
import { ShareLink } from "@/models/ShareLink";
import { User } from "@/models/User";

// Permanently deletes the account, every file in Cloudinary, and all related records.
export async function DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const limit = await rateLimit(`account-delete:${userId}`, 5, 15 * 60);
    if (!limit.ok) return tooMany(limit.retryAfter);
    const { password } = await request.json();
    await connectMongo();
    const user = await User.findById(userId).select("+passwordHash");
    if (!user || !(await verifyPassword(String(password ?? ""), user.passwordHash))) {
      return NextResponse.json({ error: "Password is incorrect." }, { status: 403 });
    }
    const files = await CloudFile.find({ owner: userId });
    for (const file of files) {
      try {
        await destroyAsset(file);
      } catch (error) {
        console.error("MEGHAM account delete: asset removal failed", file.publicId, error);
        return NextResponse.json({ error: "Could not remove all files. Nothing was deleted; try again." }, { status: 502 });
      }
      await file.deleteOne();
    }
    await Promise.all([
      ShareLink.deleteMany({ owner: userId }),
      Folder.deleteMany({ owner: userId }),
      CloudFile.updateMany({ sharedWith: userId }, { $pull: { sharedWith: userId } }),
    ]);
    await user.deleteOne();
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MEGHAM account delete failed", error);
    return NextResponse.json({ error: "Could not delete account." }, { status: 500 });
  }
}
