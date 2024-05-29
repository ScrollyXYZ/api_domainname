import mongoose, { Schema, Document } from 'mongoose';

interface IPoints extends Document {
  address: string;
  points: string;
}

const PointsSchema: Schema = new Schema({
  address: { type: String, required: true, unique: true },
  points: { type: String, required: true },
});

const Points = mongoose.model<IPoints>('Points', PointsSchema);
export default Points;
