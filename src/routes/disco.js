const express = require('express');
const { OpenAIService } = require('../services/openai-service');
const { discoValidation } = require('../middleware/validation');

const router = express.Router();
const openAIService = new OpenAIService();

/**
 * @route POST /api/analyze-disco
 * @desc Extract structured DISCO framework data
 * @access Public
 */
router.post('/analyze-disco', discoValidation, async (req, res, next) => {
  try {
    const { conversation, context = {} } = req.body;
    
    
    
    const result = await openAIService.analyzeDisco(conversation,  context);
    
    console.log(`✅ DISCO analysis completed successfully` , result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ DISCO analysis error:', error);
    next(error);
  }
});

module.exports = router; 