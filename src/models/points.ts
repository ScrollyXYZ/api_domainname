import mongoose, { Schema, Document } from 'mongoose';

interface IPoints extends Document {
  address: string;
  points: number;
}

const PointsSchema: Schema = new Schema({
  address: { type: String, required: true, unique: true, lowercase: true },
  points: { type: Number, required: true },
});

const Points = mongoose.model<IPoints>('Points', PointsSchema);
export default Points;
