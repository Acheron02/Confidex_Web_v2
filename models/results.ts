import mongoose, { Schema, model, models } from "mongoose";

export type ResultReviewStatus =
  | "none"
  | "under_review"
  | "overridden"
  | "completed"
  | "resolved";

export interface IResult {
  user_id: mongoose.Types.ObjectId | string;
  productID: string;
  result: string;
  transaction_id: string;
  testedDate: Date;

  /**
   * result_image / annotated_image:
   * The image with ONLY the final result text overlay.
   */
  result_image?: string;
  annotated_image?: string;

  /**
   * original_image / raw_image:
   * The untouched captured image from the Raspberry Pi camera.
   * This is what admins should use for reviewing.
   */
  original_image?: string;
  raw_image?: string;

  review_status?: ResultReviewStatus;
  original_result?: string;
  override_result?: string;
  reviewed_by?: mongoose.Types.ObjectId | string | null;
  reviewed_at?: Date | null;
  review_notes?: string;

  review_history_deleted?: boolean;
  review_history_deleted_by?: mongoose.Types.ObjectId | string | null;
  review_history_deleted_at?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

const resultSchema = new Schema<IResult>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    productID: {
      type: String,
      required: true,
      trim: true,
    },

    result: {
      type: String,
      required: true,
      trim: true,
    },

    transaction_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    testedDate: {
      type: Date,
      default: Date.now,
    },

    result_image: {
      type: String,
      default: "",
    },

    annotated_image: {
      type: String,
      default: "",
    },

    original_image: {
      type: String,
      default: "",
    },

    raw_image: {
      type: String,
      default: "",
    },

    review_status: {
      type: String,
      enum: ["none", "under_review", "overridden", "completed", "resolved"],
      default: "none",
    },

    original_result: {
      type: String,
      default: "",
    },

    override_result: {
      type: String,
      default: "",
    },

    reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    reviewed_at: {
      type: Date,
      default: null,
    },

    review_notes: {
      type: String,
      default: "",
    },

    review_history_deleted: {
      type: Boolean,
      default: false,
    },

    review_history_deleted_by: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    review_history_deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// One result record per transaction per user.
resultSchema.index({ user_id: 1, transaction_id: 1 }, { unique: true });
resultSchema.index({ review_status: 1, updatedAt: -1 });
resultSchema.index({ review_history_deleted: 1, reviewed_at: -1 });

const Result = models.Result || model<IResult>("Result", resultSchema);

export default Result;
