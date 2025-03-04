const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');
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


const Ytmp3 = require('./api/Ytmp3')
app.use('/api/Ytmp3', Ytmp3);
const Ytmp4 = require('./api/Ytmp4')
app.use('/api/Ytmp4', Ytmp4);

const Wikipedia = require('./api/Wiki');
app.use('/api/Wiki', Wikipedia);

const TEXT = require('./api/Text');
app.use('/api/Text', TEXT);
                

const ytSearch = require('./api/ytsearch');
app.use('/api/ytsearch', ytSearch);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
