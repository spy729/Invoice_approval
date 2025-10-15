import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IInvoice extends Document {
  companyId: string | mongoose.Types.ObjectId;
  number?: string;
  amount?: number;
  currency?: string;
  vendor?: any;
  data?: Record<string, any>;
  createdBy?: mongoose.Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

const InvoiceSchema: Schema<IInvoice> = new Schema(
  {
  companyId: { type: Schema.Types.Mixed, required: false, index: true },
    number: { type: String },
    amount: { type: Number },
    currency: { type: String },
    vendor: { type: Schema.Types.Mixed },
    data: { type: Schema.Types.Mixed },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default Invoice;
