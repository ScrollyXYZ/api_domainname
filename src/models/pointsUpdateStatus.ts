import mongoose, { Schema, Document } from 'mongoose';

interface IPointsUpdateStatus extends Document {
  lastUpdatedIndex: number;
  totalAddresses: number;
  updatedAt: Date;
}

const PointsUpdateStatusSchema: Schema = new Schema({
  lastUpdatedIndex: { type: Number, default: 0 },
  totalAddresses: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

const PointsUpdateStatus = mongoose.model<IPointsUpdateStatus>('PointsUpdateStatus', PointsUpdateStatusSchema);
export default PointsUpdateStatus;