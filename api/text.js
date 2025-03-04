const express = require('express');
const flip = require('flip-text');
const morse = require('morse');
const base64 = require('base-64');

const router = express.Router();

// Reverse a string
const reverseText = (str) => str.split('').reverse().join('');

// Convert to leetspeak
const leetspeak = (str) => str
    .replace(/a/gi, '4')
    .replace(/e/gi, '3')
    .replace(/i/gi, '1')
    .replace(/o/gi, '0')
    .replace(/s/gi, '$')
    .replace(/t/gi, '7');

// ROT13 Cipher
const rot13 = (str) => str.replace(/[a-zA-Z]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13))
);

// Emojify Text
const emojifyText = (str) => str.split('').map(c => `🅰️🅱️🅲️🅳️🅴️🅵️🅶️🅷️🅸️🅹️🅺️🅻️🅼️🅽️🅾️🅿️🆀️🆁️🆂️🆃️🆄️🆅️🆆️🆇️🆈️🆉️`.charAt(c.toLowerCase().charCodeAt(0) - 97) || c).join('');

// API Route
router.get('/text-transform', (req, res) => {
    const text = req.query.text;

    if (!text) {
        return res.status(400).json({ error: "No text provided!" });
    }
const creator = "DRACULA"
    res.json({
        CREATOR: creator,
        STATUS: 200,
        original: text,
        reversed: reverseText(text),
        upside_down: flip(text),
        leetspeak: leetspeak(text),
        morse_code: morse.encode(text),
        base64_encoded: base64.encode(text),
        base64_decoded: base64.decode(text),
        rot13: rot13(text),
        emojify: emojifyText(text),
    });
});

module.exports = router;
