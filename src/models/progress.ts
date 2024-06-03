import mongoose, { Document, Schema } from 'mongoose';

interface IProgress extends Document {
  lastUpdatedIndex: number;
  lastProcessedTokenId: number;
  lock: boolean;
}

const ProgressSchema: Schema<IProgress> = new Schema({
  lastUpdatedIndex: { type: Number, default: 0 },
  lastProcessedTokenId: { type: Number, default: 0 },
  lock: { type: Boolean, default: false },
});

const Progress = mongoose.model<IProgress>('Progress', ProgressSchema);
export default Progress;
