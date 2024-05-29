import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  tokenId: { type: Number, required: true, unique: true },
  owner: { type: String, required: true },
  points: { type: Number, default: 0 }
});

const Token = mongoose.model('Token', tokenSchema);

export default Token;
