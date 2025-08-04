const express = require('express');
const { OpenAIService } = require('../services/openai-service');
const { ephemeralKeyValidation } = require('../middleware/validation');

const router = express.Router();
const openAIService = new OpenAIService();

/**
 * @route POST /api/realtime/ephemeral-key
 * @desc Generate secure keys for OpenAI Realtime API
 * @access Public
 */
router.post('/ephemeral-key', ephemeralKeyValidation, async (req, res, next) => {
  try {
    const { voice = 'alloy' } = req.body;
    
    console.log(`🔑 Generating ephemeral key for voice: ${voice}`);
    
    const result = await openAIService.generateEphemeralKey(voice);
    
    console.log(`✅ Ephemeral key generated successfully`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Ephemeral key generation error:', error);
    
    // Return error response in the expected format
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router; 