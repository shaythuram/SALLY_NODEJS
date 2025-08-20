const express = require('express');
const { OpenAIService } = require('../services/openai-service');
const { postCallStepsValidation } = require('../middleware/validation');

const router = express.Router();
const openAIService = new OpenAIService();

/**
 * @route POST /api/post-call-steps
 * @desc Generate post-call action items and next steps
 * @access Public
 */
router.post('/post-call-steps', postCallStepsValidation, async (req, res, next) => {
  try {
    const { conversation } = req.body;
    
    console.log(`📋 Analyzing post-call steps for conversation`);
    
    const result = await openAIService.analyzePostCallSteps(conversation);
    
    console.log(`✅ Post-call steps analysis completed successfully`, result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Post-call steps analysis error:', error);
    next(error);
  }
});

module.exports = router;
