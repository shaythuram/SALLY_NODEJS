const express = require('express');
const { OpenAIService } = require('../services/openai-service');
const { aiSummaryValidation } = require('../middleware/validation');

const router = express.Router();
const openAIService = new OpenAIService();

/**
 * @route POST /api/ai-summary
 * @desc Generate comprehensive yet succinct call summary
 * @access Public
 */
router.post('/ai-summary', aiSummaryValidation, async (req, res, next) => {
  try {
    const { conversation, discoAnalysis, genieSupport, assistantId, threadId } = req.body;
    
    console.log(`📝 Generating comprehensive AI summary`);
    console.log(`📊 DISCO Analysis provided:`, !!discoAnalysis);
    console.log(`🧞 Genie Support provided:`, !!genieSupport);
    
    const result = await openAIService.generateAISummary(
      conversation, 
      assistantId, 
      threadId, 
      discoAnalysis, 
      genieSupport
    );
    
    console.log(`✅ Comprehensive AI summary generated successfully`);
    
    res.json(result);
  } catch (error) {
    console.error('❌ AI summary generation error:', error);
    next(error);
  }
});

module.exports = router;
