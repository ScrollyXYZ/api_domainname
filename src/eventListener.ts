import { ethers } from 'ethers';
import Token from './models/token';
import { ABI as tokenABI } from './config/abi';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const tokenContract = new ethers.Contract(CONTRACT_ADDRESS, tokenABI, provider);

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

monitorIdCounter(); // Start monitoring the idCounter

export { fetchOwner, monitorIdCounter };
