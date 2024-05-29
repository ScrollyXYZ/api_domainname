import { ethers } from 'ethers';
import Token from './models/token';
import Points from './models/points';
import { ABI as tokenABI } from './config/abi';
import { ABI as pointsABI } from './config/pointsAbi';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const POINTS_CONTRACT_ADDRESS = process.env.POINTS_CONTRACT_ADDRESS || '';
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const tokenContract = new ethers.Contract(CONTRACT_ADDRESS, tokenABI, provider);
const pointsContract = new ethers.Contract(POINTS_CONTRACT_ADDRESS, pointsABI, provider);

async function monitorIdCounter() {
  try {
    let currentIdCounter = (await tokenContract.idCounter()).toNumber();
    console.log(`Initial ID Counter: ${currentIdCounter}`);

    setInterval(async () => {
      try {
        const newIdCounter = (await tokenContract.idCounter()).toNumber();
        if (newIdCounter > currentIdCounter) {
          console.log(`New tokens detected. Updating cache from ${currentIdCounter + 1} to ${newIdCounter}`);
          for (let i = currentIdCounter + 1; i <= newIdCounter; i++) {
            await fetchOwner(i);
            await fetchPoints(i);
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

async function fetchOwner(tokenId: number) {
  console.log(`Fetching owner for token ${tokenId}`);
  try {
    const owner = await tokenContract.ownerOf(tokenId);
    await Token.findOneAndUpdate({ tokenId }, { owner: owner.toLowerCase() }, { upsert: true });
    console.log(`Token ${tokenId} cached with owner ${owner}`);
  } catch (error) {
    console.error(`Error fetching owner for token ${tokenId}:`, error);
  }
}

async function fetchPoints(tokenId: number) {
  console.log(`Fetching points for token ${tokenId}`);
  try {
    const token = await Token.findOne({ tokenId });
    if (token && token.owner) {
      const points = await pointsContract.getPoints(token.owner);
      await Points.findOneAndUpdate({ address: token.owner }, { points: points.toString() }, { upsert: true });
      console.log(`Points for address ${token.owner} updated: ${points}`);
    } else {
      console.error(`Token ${tokenId} does not have an owner yet.`);
    }
  } catch (error) {
    console.error(`Error fetching points for token ${tokenId}:`, error);
  }
}

monitorIdCounter(); // Start monitoring the idCounter

export { fetchOwner, fetchPoints, monitorIdCounter };
