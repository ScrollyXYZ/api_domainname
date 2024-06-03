import express from 'express';
import Token from '../models/token';
import PointsUpdateStatus from '../models/pointsUpdateStatus';  
import { buildCache } from '../cacheBuilder';

const router = express.Router();

router.get('/tokens', async (req, res) => {
  const { address } = req.query;

  try {
    let tokens;
    if (address && typeof address === 'string') {
      tokens = await Token.find({ owner: address.toLowerCase() }).select('-__v');
    } else {
      tokens = await Token.find().select('-__v');
    }

    res.json({ totalTokens: tokens.length, tokens });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ error: 'Error fetching tokens' });
  }
});

router.get('/database-status', async (req, res) => {
  try {
    const totalTokens = await Token.countDocuments();
    res.json({ totalTokens });
  } catch (error) {
    console.error('Error fetching database status:', error);
    res.status(500).json({ error: 'Error fetching database status' });
  }
});

router.get('/trigger-cache', async (req, res) => {
  try {
    await buildCache();
    res.send('Cache build process triggered.');
  } catch (error) {
    console.error('Error triggering cache build:', error);
    res.status(500).json({ error: 'Error triggering cache build' });
  }
});

router.get('/points-update-status', async (req, res) => {
  try {
    const status = await PointsUpdateStatus.findOne();
    if (status) {
      res.json(status);
    } else {
      res.status(404).json({ error: 'No update status found' });
    }
  } catch (error) {
    console.error('Error fetching points update status:', error);
    res.status(500).json({ error: 'Error fetching points update status' });
  }
});

export default router;
