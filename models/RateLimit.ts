import { model, models, Schema } from "mongoose";

const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  // TTL index removes the document once the window has passed.
  resetAt: { type: Date, required: true, index: { expires: 0 } },
});

export const RateLimit = models.RateLimit ?? model("RateLimit", rateLimitSchema);
