import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/database';
import routes from './routes/index';
import { buildCache, monitorIdCounter, fetchAllPoints, getPointsForAddress } from './cacheBuilder';
import './eventListener';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', routes);

app.get('/trigger-cache', async (req, res) => {
  await buildCache();
  res.send('Cache build process triggered.');
});

app.get('/points-leaderboard', async (req, res) => {
  try {
    const leaderboard = await fetchAllPoints();
    if (leaderboard) {
      res.json({ leaderboard });
    } else {
      res.status(500).send('Error fetching leaderboard');
    }
  } catch (error) {
    res.status(500).send('Error fetching leaderboard');
  }
});

app.get('/points/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const points = await getPointsForAddress(address);
    res.json({ address, points });
  } catch (error) {
    res.status(500).send('Error fetching points for address');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  monitorIdCounter();
});
