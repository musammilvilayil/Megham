import { model, models, Schema } from "mongoose";

const cloudFileSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    publicId: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    resourceType: { type: String, required: true },
    format: String,
    bytes: { type: Number, required: true, min: 0 },
    starred: { type: Boolean, default: false, index: true },
    shared: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

cloudFileSchema.index({ owner: 1, deletedAt: 1, createdAt: -1 });

export const CloudFile =
  models.CloudFile ?? model("CloudFile", cloudFileSchema);
