import { model, models, Schema } from "mongoose";

const shareLinkSchema = new Schema(
  {
    file: { type: Schema.Types.ObjectId, ref: "CloudFile", required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const ShareLink = models.ShareLink ?? model("ShareLink", shareLinkSchema);
