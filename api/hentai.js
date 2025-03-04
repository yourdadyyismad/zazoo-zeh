const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

// Initialize OpenAI API
const openai = new OpenAI({
    apiKey: "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",
});

console.log("OpenAI API Initialized!");

router.get("/", async (req, res) => {
    const userMessage = req.query.q || (req.body && req.body.message);

    if (!userMessage) {
        return res.status(400).json({ error: "No message provided!" });
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Use "gpt-4" if needed
            messages: [{ role: "user", content: userMessage }],
            max_tokens: 150,
        });

        res.json({
            STATUS: 200,
            USER_MESSAGE: userMessage,
            BOT_REPLY: response.choices[0].message.content,
        });
    } catch (error) {
        console.error("OpenAI Error:", error);
        res.status(500).json({ error: "Failed to generate response." });
    }
});

module.exports = router;
