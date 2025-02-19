const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');
const pw = require('playwright');
const yts = require('yt-search');

////////////////////////////////////>>>>>>>>>>>>>>>>>>>>>>>
const app = express();
const PORT = process.env.PORT || 7860;


app.use(express.static(path.join(__dirname, 'site')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

const aniQuotes = require('./api/aniQuotes');

app.use('/api/aniQuotes', aniQuotes);


const hentaiAPI = require('./api/hentai')

app.use('/api/hentai', hentaiAPI);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

