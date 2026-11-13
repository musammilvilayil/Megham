import { model, models, Schema } from "mongoose";

const cloudFileSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    publicId: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    resourceType: { type: String, required: true },
    // "upload" = legacy public Cloudinary asset, "authenticated" = private, signed delivery only.
    deliveryType: { type: String, enum: ["upload", "authenticated"], default: "upload" },
    format: String,
    bytes: { type: Number, required: true, min: 0 },
    folder: { type: Schema.Types.ObjectId, ref: "Folder", default: null, index: true },
    starred: { type: Boolean, default: false, index: true },
    // True while the file has at least one active link or recipient.
    shared: { type: Boolean, default: false },
    sharedWith: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [], index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

cloudFileSchema.index({ owner: 1, deletedAt: 1, _id: -1 });

export const CloudFile =
  models.CloudFile ?? model("CloudFile", cloudFileSchema);
