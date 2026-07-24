import { model, models, Schema } from "mongoose";

const cloudFileSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    resourceType: { type: String, required: true },
    format: String,
    bytes: { type: Number, required: true },
    starred: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const CloudFile =
  models.CloudFile ?? model("CloudFile", cloudFileSchema);
