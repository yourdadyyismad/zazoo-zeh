const express = require("express");
const { search } = require("googlethis");

const router = express.Router();

router.get("/", async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: "No search query provided!" });
    }

    try {
        const options = {
            page: 0, // First page of results
            safe: false, // Disable safe search
            additional_params: { hl: "en" } // English language results
        };

        const results = await search(query, options);

        res.json({
            CREATOR: "DRACULA",
            STATUS: 200,
            QUERY: query,
            RESULTS: results.results.slice(0, 5) // Limiting to 5 results
        });

    } catch (error) {
        console.error("Google Search Error:", error);
        res.status(500).json({ error: "Failed to fetch search results." });
    }
});

module.exports = router;
