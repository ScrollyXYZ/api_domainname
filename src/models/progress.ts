import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  lastProcessedTokenId: { type: Number, default: 0 },
});

export default mongoose.model('Progress', progressSchema);
