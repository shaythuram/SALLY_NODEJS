const express = require('express');
const { OpenAIService } = require('../services/openai-service');
const { aiCompleteValidation } = require('../middleware/validation');

const router = express.Router();
const openAIService = new OpenAIService();

/**
 * @route POST /api/ai-complete
 * @desc Complete action items with appropriate content type and markdown response
 * @access Public
 */
router.post('/ai-complete', aiCompleteValidation, async (req, res, next) => {
  try {
    const { action_item, assistantId, threadId } = req.body;
    
    console.log(`🎯 Processing action item completion`);
    console.log(`📋 Action item:`, action_item);
    
    const result = await openAIService.completeActionItem(
      action_item, 
      assistantId, 
      threadId
    );
    
    console.log(`✅ Action item completed successfully with tag: ${result.tag}`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ AI complete error:', error);
    next(error);
  }
});

module.exports = router;
