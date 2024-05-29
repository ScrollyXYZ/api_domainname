import express from 'express';
import Token from '../models/token';
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/database-status', async (req, res) => {
  try {
    const totalTokens = await Token.countDocuments();
    res.json({ totalTokens });
  } catch (error) {
    console.error('Error fetching database status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/trigger-cache', async (req, res) => {
  try {
    await buildCache();
    res.send('Cache build process triggered.');
  } catch (error) {
    console.error('Error triggering cache build:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
