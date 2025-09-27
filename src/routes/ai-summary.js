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
    
    // Log input details
    console.log(`🔍 INPUT - AI Summary Request:`);
    console.log(`  - Conversation length: ${conversation?.length || 0} characters`);
    console.log(`  - Assistant ID: ${assistantId || 'default'}`);
    console.log(`  - Thread ID: ${threadId || 'new thread'}`);
    console.log(`  - DISCO Analysis:`, discoAnalysis ? JSON.stringify(discoAnalysis, null, 2) : 'None');
    console.log(`  - Genie Support:`, genieSupport ? JSON.stringify(genieSupport, null, 2) : 'None');
    
    const result = await openAIService.generateAISummary(
      conversation, 
      assistantId, 
      threadId, 
      discoAnalysis, 
      genieSupport
    );
    
    // Log output details
    console.log(`✅ Comprehensive AI summary generated successfully`);
    console.log(`📤 OUTPUT - AI Summary Result:`);
    console.log(JSON.stringify(result, null, 2));
    
    res.json(result);
  } catch (error) {
    console.error('❌ AI summary generation error:', error);
    next(error);
  }
});

module.exports = router;
