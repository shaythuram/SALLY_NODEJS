const express = require('express');
const { OpenAIService } = require('../services/openai-service');
const { quickAnswerValidation } = require('../middleware/validation');

const router = express.Router();
const openAIService = new OpenAIService();

/**
 * @route POST /api/generate-quick-answer
 * @desc Generate real-time sales coaching insights
 * @access Public
 */
router.post('/generate-quick-answer', quickAnswerValidation, async (req, res, next) => {
  try {
    const { ai_chat, user_query, conversation } = req.body;
    
    let result;
    
    if (ai_chat === true) {
      console.log(`🤖 AI Chat mode - processing user query`);
      result = await openAIService.aiChat(user_query);
      console.log(`✅ AI chat response generated successfully` , result);
    } else {
      console.log(`📊 Quick Analysis mode - analyzing conversation`);
      result = await openAIService.quickAnalysis(conversation);
      console.log(`✅ Quick analysis completed successfully`);
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Quick answer generation error:', error);
    next(error);
  }
});

module.exports = router; 