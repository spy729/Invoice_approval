import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IWorkflowNode {
  id: string;
  type?: string;
  label?: string;
  data?: Record<string, any>;
}

export interface IWorkflowEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
  data?: Record<string, any>;
}

export interface IWorkflow extends Document {
  companyId: string;
  name: string;
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  isActive: boolean;
  status: 'draft' | 'published';
  createdBy?: mongoose.Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

const NodeSchema: Schema<IWorkflowNode> = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String },
    label: { type: String },
    data: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const EdgeSchema: Schema<IWorkflowEdge> = new Schema(
  {
    id: { type: String },
    source: { type: String, required: true },
    target: { type: String, required: true },
    label: { type: String },
    data: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const WorkflowSchema: Schema<IWorkflow> = new Schema(
  {
    companyId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    nodes: { type: [NodeSchema], default: [] },
    edges: { type: [EdgeSchema], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

let WorkflowModel: Model<IWorkflow>;

try {
  // Try to get the existing model
  WorkflowModel = mongoose.model<IWorkflow>('Workflow');
} catch (error) {
  // Model doesn't exist, create it
  WorkflowModel = mongoose.model<IWorkflow>('Workflow', WorkflowSchema);
}

export default WorkflowModel;
