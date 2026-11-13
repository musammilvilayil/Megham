import { model, models, Schema } from "mongoose";

const folderSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    parent: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
  },
  { timestamps: true },
);

export const Folder = models.Folder ?? model("Folder", folderSchema);
