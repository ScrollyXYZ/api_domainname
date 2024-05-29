import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.set('strictQuery', true);

const mongoDBConnectionString = process.env.MONGODB_CONNECTION_STRING;

if (!mongoDBConnectionString) {
  console.error("MongoDB connection string is not defined in environment variables.");
  process.exit(1);
}

const options: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

mongoose.connect(mongoDBConnectionString, options)
  .then(() => console.log('Connected to MongoDB'))
  .catch(error => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('MongoDB connection is open');
});

export default mongoose;
