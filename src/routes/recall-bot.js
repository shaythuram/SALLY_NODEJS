const express = require('express');
const axios = require('axios');

const router = express.Router();

/**
 * @route POST /api/recall-bot
 * @desc Create a Recall.ai bot for meeting transcription
 * @access Public
 */
router.post('/recall-bot', async (req, res, next) => {
  try {
    const { meeting_url } = req.body;
    
    // Hardcoded API key - replace this after testing
    const apiKey = "034aa69fedc5687bccea993bd49b27c45a04d403";
    
    // Default meeting URL if not provided
    const defaultMeetingUrl = "https://teams.microsoft.com/l/meetup-join/19%3ameeting_MTFhMjFiNTMtMzEzMS00NjYzLWI5ODgtYzk5ZWJkNDgwODcw%40thread.v2/0?context=%7b%22Tid%22%3a%2215ce9348-be2a-462b-8fc0-e1765a9b204a%22%2c%22Oid%22%3a%2230caf9a2-310c-483c-8630-036c5a89dc25%22%7d";
    
    const recallApiUrl = "https://us-west-2.recall.ai/api/v1/bot";

    const payload = {
      meeting_url: meeting_url || defaultMeetingUrl,
      bot_name: "Meeting Notetaker",
      recording_config: {
        transcript: {
          provider: {
            recallai_streaming: {
              language_code: "en",
              filter_profanity: false,
              mode: "prioritize_low_latency",
            },
          },
        },
        realtime_endpoints: [
          {
            type: "websocket",
            url: "wss://aabd3e375bd5.ngrok-free.app",
            events: ["transcript.data"],
          },
        ],
      },
    };

    console.log(`🤖 Creating Recall.ai bot for meeting: ${payload.meeting_url}`);

    const response = await axios.post(recallApiUrl, payload, {
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    // Log full response data
    console.log("✅ Recall.ai API response:", response.data);

    res.json(response.data.id);

  } catch (error) {
    console.error("❌ Error calling Recall.ai API:", error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: "Failed to create Recall.ai bot",
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
