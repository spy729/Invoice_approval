import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | string;
  companyId?: string | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager'], default: 'manager' },
  companyId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

// Pre-save hook to hash password
UserSchema.pre<IUser>('save', async function (next) {
  const user = this;
  if (!user.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(user.password, salt);
    user.password = hash;
    next();
  } catch (err) {
    next(err as any);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  const user = this as IUser;
  return bcrypt.compare(candidatePassword, user.password);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
