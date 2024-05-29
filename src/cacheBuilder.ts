import { ethers } from 'ethers';
import Token from './models/token';
import Progress from './models/progress';
import Points from './models/points';
import { ABI as tokenABI } from './config/abi';
import { ABI as pointsABI } from './config/pointsAbi';
import Bottleneck from 'bottleneck';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const POINTS_CONTRACT_ADDRESS = process.env.POINTS_CONTRACT_ADDRESS || '';
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const tokenContract = new ethers.Contract(CONTRACT_ADDRESS, tokenABI, provider);
const pointsContract = new ethers.Contract(POINTS_CONTRACT_ADDRESS, pointsABI, provider);

const limiter = new Bottleneck({
  minTime: 10000, // 10 seconds
  maxConcurrent: 1,
});

async function fetchOwner(tokenId: number) {
  console.log(`Fetching owner for token ${tokenId}`);
  try {
    const owner = await tokenContract.ownerOf(tokenId);
    await Token.findOneAndUpdate({ tokenId }, { owner: owner.toLowerCase() }, { upsert: true });
    console.log(`Token ${tokenId} cached with owner ${owner}`);
    await fetchPoints(owner); // Fetch points immediately after fetching owner
    await updateProgress(tokenId);
  } catch (error) {
    console.error(`Error fetching owner for token ${tokenId}:`, error);
  }
}

async function fetchPoints(address: string) {
  console.log(`Fetching points for address ${address}`);
  try {
    const points = await pointsContract.getPoints(address);
    const pointsValue = parseFloat(ethers.utils.formatEther(points));
    await Points.findOneAndUpdate({ address: address.toLowerCase() }, { points: pointsValue }, { upsert: true });
    console.log(`Points for address ${address} updated: ${pointsValue}`);
  } catch (error) {
    console.error(`Error fetching points for address ${address}:`, error);
  }
}

async function updateProgress(tokenId: number) {
  try {
    await Progress.findOneAndUpdate({}, { lastProcessedTokenId: tokenId }, { upsert: true });
    console.log(`Progress updated to token ${tokenId}`);
  } catch (error) {
    console.error(`Error updating progress for token ${tokenId}:`, error);
  }
}

async function getLastProcessedTokenId(): Promise<number> {
  try {
    const progress = await Progress.findOne();
    return progress ? progress.lastProcessedTokenId : 0;
  } catch (error) {
    console.error('Error getting last processed token ID:', error);
    return 0;
  }
}

export async function buildCache() {
  try {
    const idCounter = (await tokenContract.idCounter()).toNumber();
    console.log(`Total tokens to fetch: ${idCounter}`);

    const lastProcessedTokenId = await getLastProcessedTokenId();
    for (let i = lastProcessedTokenId + 1; i <= idCounter; i++) {
      console.log(`Scheduling fetch for token ${i}`);
      limiter.schedule(() => fetchOwner(i));
    }

    console.log('All fetch tasks have been scheduled.');
  } catch (error) {
    console.error("Error building cache:", error);
  }
}

export async function recoverMissingData() {
  try {
    const idCounter = (await tokenContract.idCounter()).toNumber();
    console.log(`Recovering missing data up to token ${idCounter}`);

    for (let i = 1; i <= idCounter; i++) {
      const token = await Token.findOne({ tokenId: i });
      if (!token) {
        console.log(`Token ${i} is missing. Scheduling fetch.`);
        await limiter.schedule(() => fetchOwner(i));
      }
    }

    console.log('Missing data recovery tasks have been scheduled.');
  } catch (error) {
    console.error("Error recovering missing data:", error);
  }
}

export async function monitorIdCounter() {
  try {
    const initialIdCounter = (await tokenContract.idCounter()).toNumber();
    let currentIdCounter = initialIdCounter;
    console.log(`Initial ID Counter: ${initialIdCounter}`);

    setInterval(async () => {
      try {
        const newIdCounter = (await tokenContract.idCounter()).toNumber();
        if (newIdCounter > currentIdCounter) {
          console.log(`New tokens detected. Updating cache from ${currentIdCounter + 1} to ${newIdCounter}`);
          for (let i = currentIdCounter + 1; i <= newIdCounter; i++) {
            await limiter.schedule(() => fetchOwner(i));
            await prioritizeNewTokenPoints(i);
          }
          currentIdCounter = newIdCounter;
        } else {
          console.log("No new tokens detected.");
        }
      } catch (error) {
        console.error("Error monitoring idCounter:", error);
      }
    }, 60000); // Check every 1 minute
  } catch (error) {
    console.error("Error initializing idCounter monitoring:", error);
  }
}

export async function prioritizeNewTokenPoints(tokenId: number) {
  try {
    const token = await Token.findOne({ tokenId });
    if (token) {
      await fetchPoints(token.owner);
    }
  } catch (error) {
    console.error(`Error prioritizing points for new token ${tokenId}:`, error);
  }
}

export async function fetchAllPoints() {
  try {
    const pointsData = await Points.find().sort({ points: -1 }).limit(100); // Limit to top 100 points
    return pointsData.map((data) => ({ address: data.address, points: data.points }));
  } catch (error) {
    console.error("Error fetching all points:", error);
    return null;
  }
}

export async function getPointsForAddress(address: string) {
  try {
    const pointsData = await Points.findOne({ address });
    return pointsData ? pointsData.points : 0;
  } catch (error) {
    console.error(`Error fetching points for address ${address}:`, error);
    return 0;
  }
}

setInterval(async () => {
  try {
    const addresses = await Token.find().distinct('owner');
    for (let i = 0; i < addresses.length; i += 5) {
      const addressBatch = addresses.slice(i, i + 5);
      await Promise.all(addressBatch.map(address => limiter.schedule(() => fetchPoints(address))));
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute before the next batch
    }
  } catch (error) {
    console.error('Error in points update loop:', error);
  }
}, 60000); // Update points every 1 minute
