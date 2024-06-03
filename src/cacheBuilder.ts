import { ethers } from 'ethers';
import Token from './models/token';
import Progress from './models/progress';
import { ABI as tokenABI } from './config/abi';
import Bottleneck from 'bottleneck';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const tokenContract = new ethers.Contract(CONTRACT_ADDRESS, tokenABI, provider);

const limiter = new Bottleneck({
  minTime: 20000, // 20 seconds
  maxConcurrent: 1,
});

async function fetchOwner(tokenId: number) {
  console.log(`Fetching owner for token ${tokenId}`);
  try {
    const owner = await tokenContract.ownerOf(tokenId);
    await Token.findOneAndUpdate({ tokenId }, { owner: owner.toLowerCase() }, { upsert: true });
    console.log(`Token ${tokenId} cached with owner ${owner}`);
    await updateProgress(tokenId);
  } catch (error: any) {
    console.error(`Error fetching owner for token ${tokenId}:`, error.message || error);
  }
}

async function updateProgress(tokenId: number) {
  try {
    await Progress.findOneAndUpdate({}, { lastProcessedTokenId: tokenId }, { upsert: true });
    console.log(`Progress updated to token ${tokenId}`);
  } catch (error: any) {
    console.error(`Error updating progress for token ${tokenId}:`, error.message || error);
  }
}

async function getLastProcessedTokenId(): Promise<number> {
  try {
    const progress = await Progress.findOne();
    return progress ? progress.lastProcessedTokenId : 0;
  } catch (error: any) {
    console.error('Error getting last processed token ID:', error.message || error);
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
      await limiter.schedule(() => fetchOwner(i));
    }

    console.log('All fetch tasks have been scheduled.');
  } catch (error: any) {
    console.error("Error building cache:", error.message || error);
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
          }
          currentIdCounter = newIdCounter;
        } else {
          console.log("No new tokens detected.");
        }
      } catch (error: any) {
        console.error("Error monitoring idCounter:", error.message || error);
      }
    }, 60000); // Check every 1 minute
  } catch (error: any) {
    console.error("Error initializing idCounter monitoring:", error.message || error);
  }
}
