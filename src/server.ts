import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/database';
import routes from './routes/index';
import { buildCache, monitorIdCounter } from './cacheBuilder';
import { updateAllPoints, fetchAllPoints, getPointsForAddress } from './updatePoints';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', routes);

app.get('/trigger-cache', async (req, res) => {
  try {
    await buildCache();
    res.send('Cache build process triggered.');
  } catch (error) {
    res.status(500).send('Error triggering cache build');
  }
});

app.get('/trigger-points-update', async (req, res) => {
  try {
    await updateAllPoints();
    res.send('Points update process triggered.');
  } catch (error) {
    res.status(500).send('Error triggering points update');
  }
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
  updateAllPoints(); // Initial points update
});
