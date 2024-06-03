import { ethers } from 'ethers';
import fs from 'fs';
import mongoose from 'mongoose';
import Points from './models/points';
import Token from './models/token';
import { ABI as pointsABI } from './config/pointsAbi';
import Bottleneck from 'bottleneck';

const POINTS_CONTRACT_ADDRESS = process.env.POINTS_CONTRACT_ADDRESS || '';
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const pointsContract = new ethers.Contract(POINTS_CONTRACT_ADDRESS, pointsABI, provider);

const limiter = new Bottleneck({
  minTime: 20000, // 20 seconds
  maxConcurrent: 1,
});

const progressFilePath = './pointsProgress.txt';

async function fetchPoints(address: string, index: number, total: number) {
  console.log(`Fetching points for address ${address} (${index}/${total})`);
  try {
    const points = await pointsContract.getPoints(address);
    const pointsValue = parseFloat(ethers.utils.formatEther(points));
    await Points.findOneAndUpdate({ address: address.toLowerCase() }, { points: pointsValue }, { upsert: true });
    console.log(`Points for address ${address} updated: ${pointsValue}`);
  } catch (error: any) {
    console.error(`Error fetching points for address ${address}:`, error.message || error);
  }
}

function readProgress(): number {
  if (fs.existsSync(progressFilePath)) {
    const data = fs.readFileSync(progressFilePath, 'utf8');
    const parsed = parseInt(data, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function writeProgress(index: number) {
  fs.writeFileSync(progressFilePath, index.toString(), 'utf8');
}

export async function updateAllPoints() {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const addresses = await Token.find().distinct('owner');
    const totalAddresses = addresses.length;
    console.log(`Total addresses to verify: ${totalAddresses}`);
    let lastUpdatedIndex = readProgress();

    console.log(`Resuming update from index: ${lastUpdatedIndex}`);

    for (let i = lastUpdatedIndex; i < totalAddresses; i++) {
      console.log(`Updating points for address at index ${i + 1}/${totalAddresses}`);
      await limiter.schedule(() => fetchPoints(addresses[i], i + 1, totalAddresses));

      // Always update the progress file after each address
      writeProgress(i + 1);
      console.log(`Progress updated to index ${i + 1}`);

      await new Promise(resolve => setTimeout(resolve, 20000)); // Wait 20 seconds before the next update
    }

    // Reset lastUpdatedIndex after a full cycle
    writeProgress(0);
    console.log(`Completed full update cycle. Resetting lastUpdatedIndex to 0.`);
    await session.commitTransaction();
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error in points update loop:', error.message || error);
  } finally {
    session.endSession();
  }
}

export async function fetchAllPoints() {
  try {
    const pointsData = await Points.find().sort({ points: -1 }).limit(100); // Limit to top 100 points
    return pointsData.map((data) => ({ address: data.address, points: data.points }));
  } catch (error: any) {
    console.error("Error fetching all points:", error.message || error);
    return null;
  }
}

export async function getPointsForAddress(address: string) {
  try {
    const pointsData = await Points.findOne({ address });
    return pointsData ? pointsData.points : 0;
  } catch (error: any) {
    console.error(`Error fetching points for address ${address}:`, error.message || error);
    return 0;
  }
}

setInterval(async () => {
  try {
    await updateAllPoints();
  } catch (error: any) {
    console.error('Error in periodic points update loop:', error.message || error);
  }
}, 60000); // Update points every 1 minute
