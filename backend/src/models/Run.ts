import mongoose, { Document, Model, Schema } from 'mongoose';

export type RunStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export interface IRunStep {
  nodeId?: string;
  approver?: mongoose.Types.ObjectId | string;
  assigneeId?: string | mongoose.Types.ObjectId;
  decision?: RunStatus | 'pending';
  comment?: string;
  actedAt?: Date | null;
  meta?: Record<string, any>;
}

export interface IRun extends Document {
  workflowId: mongoose.Types.ObjectId | string;
  invoiceId: mongoose.Types.ObjectId | string;
  steps: IRunStep[];
  status: RunStatus;
  meta?: Record<string, any>;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const StepSchema: Schema<IRunStep> = new Schema(
  {
    nodeId: { type: String },
  approver: { type: Schema.Types.ObjectId, ref: 'User' },
  assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
  decision: { type: String, enum: ['pending', 'approved', 'rejected', 'skipped'], default: 'pending' },
    comment: { type: String },
    actedAt: { type: Date },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const RunSchema: Schema<IRun> = new Schema(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: false, index: true },
    steps: { type: [StepSchema], default: [] },
    meta: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

const Run: Model<IRun> = mongoose.models.Run || mongoose.model<IRun>('Run', RunSchema);

export default Run;
