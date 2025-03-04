const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

// Initialize OpenAI API
const openai = new OpenAI({
    apiKey: "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", 
});

console.log("✅ OpenAI API Initialized!");

router.get("/", async (req, res) => {
    const userMessage = req.query.q || (req.body && req.body.message);

    if (!userMessage) {
        return res.status(400).json({ error: "No message provided!" });
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: userMessage }],
            max_tokens: 150,
        });

        res.json({
            STATUS: 200,
            USER_MESSAGE: userMessage,
            BOT_REPLY: completion.choices[0].message.content,
        });
    } catch (error) {
        console.error("❌ OpenAI Error:", error);
        res.status(500).json({ error: "Failed to generate response." });
    }
});

module.exports = router;
