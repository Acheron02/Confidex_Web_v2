import { Schema, model, models } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    href: {
      type: String,
      default: "",
      trim: true,
    },

    readAt: {
      type: Date,
      default: null,
      index: true,
    },

    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export default models.Notification || model("Notification", NotificationSchema);
