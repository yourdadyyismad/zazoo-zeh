const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Path to the JSON file
const quotesFilePath = path.join(__dirname, '../json/aniQuotes.json');

router.get('/', (req, res) => {
    try {
        // Check if the JSON file exists
        if (!fs.existsSync(quotesFilePath)) {
            throw new Error("Quotes file not found!");
        }

        // Load and parse the JSON file
        const quotes = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));

        // Check if the file contains quotes
        if (!Array.isArray(quotes) || quotes.length === 0) {
            throw new Error("No quotes available!");
        }

        // Pick a random quote
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

        // Send a successful response
        res.json({
            CREATOR: "DRACULA",
            SUCCESS: true,
            MESSAGE: {
                    author: randomQuote.author,
                    anime: randomQuote.anime,
                    quote: randomQuote.quote
                }
        });

    } catch (error) {
        // Send an error response
        res.status(500).json({
            CREATOR: "DRACULA",
            SUCCESS: false,
            ERROR: error.message
        });
    }
});

module.exports = router;