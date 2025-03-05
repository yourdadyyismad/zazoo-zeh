const express = require("express");
const axios = require("axios");

const router = express.Router();

// Function to fetch character details
async function getCharacterInfo(name) {
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/characters?q=${name}&limit=1`);
        if (!response.data.data.length) return null;
        return response.data.data[0];
    } catch (error) {
        console.error("Error fetching character info:", error.message);
        return null;
    }
}

// Function to get a random anime character
async function getRandomCharacter() {
    try {
        const randomId = Math.floor(Math.random() * 20000) + 1; // Random character ID
        const response = await axios.get(`https://api.jikan.moe/v4/characters/${randomId}`);
        return response.data.data;
    } catch (error) {
        console.error("Error fetching random character:", error.message);
        return null;
    }
}

const creator = "DRACULA"

// Unified Endpoint: /anime
router.get("/", async (req, res) => {
    const { type, name } = req.query;

    if (!type) return res.status(400).json({ error: "Please specify a type (character or random)" });

    if (type === "character") {
        if (!name) return res.status(400).json({ error: "Please provide a character name" });

        const character = await getCharacterInfo(name);
        if (!character) return res.status(404).json({ error: "Character not found" });

    

        return res.json({
            CREATOR: creator,
            STATUS: 200,
            name: character.name || "Unknown",
            image: character.images?.jpg?.image_url || "No image available",
            description: character.about || "No description available",
        });
    }

    if (type === "random") {
        const character = await getRandomCharacter();
        if (!character) return res.status(500).json({ error: "Failed to fetch random character" });

        return res.json({
            CREATOR: creator,
            STATUS: 200,
            name: character.name || "Unknown",
            image: character.images?.jpg?.image_url || "No image available",
            description: character.about || "No description available",
        });
    }

    return res.status(400).json({ error: "Invalid type. Use 'character' or 'random'" });
});

module.exports = router;
