const express = require("express");
const { Configuration, OpenAIApi } = require("openai");

const router = express.Router();

// Initialize OpenAI API


const openai = new OpenAI({
    apiKey: "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"
});

console.log("Your API Key:", openai.apiKey);

router.get("/", async (req, res) => {
    const userMessage = req.query.q || (req.body && req.body.message);

    if (!userMessage) {
        return res.status(400).json({ error: "No message provided!" });
    }

    try {
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo", // You can use "gpt-4" if available
            messages: [{ role: "user", content: userMessage }],
            max_tokens: 150,
        });

        res.json({
            STATUS: 200,
            USER_MESSAGE: userMessage,
            BOT_REPLY: response.data.choices[0].message.content,
        });
    } catch (error) {
        console.error("OpenAI Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to generate response." });
    }
});

module.exports = router;
