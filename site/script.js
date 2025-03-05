document.addEventListener('DOMContentLoaded', () => {
    const apis = [
    {
        name: "Anime Quotes API",
        description: "Fetches a random anime quote with its author and anime title.",
        endpoint: "/api/aniQuotes"
    },
    {
        name: "Hentai API",
        description: "Retrieves a random hentai video.",
        endpoint: "/api/hentai"
    },
    {
        name: "Ytmp3 API",
        description: `Retrieves the audio format and details of a given song name
        using (?q=Faded+Alan+Walker) as the parameter.`,
        endpoint: "/api/Ytmp3"
    },
    {
        name: "Ytmp4 API",
        description: `Retrieves the video format and details of a given song name
        using (?q=Faded+Alan+Walker) as the parameter.`,
        endpoint: "/api/Ytmp4"
    },
    {
        name: "YtSearch API",
        description: `Retrieves multiple song details using (?q=Faded+Alan+Walker) as the parameter.`,
        endpoint: "/api/ytsearch"
    },
    {
        name: "Wikipedia API",
        description: `Retrieves search results from Wikipedia using the format (?q=Albert+Einstein) as the parameter.`,
        endpoint: "/api/Wiki"
    },
    {
        name: "Text API",
        description: `Transforms the given text into different styles using (?text=Dracula) as the parameter.`,
        endpoint: "/api/Text"
    },
    {
        name: "Movie API",
        description: `Fetches movie details based on the given query using (?query=moana+2) as the parameter.`,
        endpoint: "/api/Movie"
    },
    {
        name: "Anime Character API",
        description: `Retrieves information about an anime character.  
        - Use (?type=character&name=naruto) to search for a specific character.  
        - Use (?type=random) to get a random anime character.`,
        endpoint: "/api/Character"
    }
];

    const apiContainer = document.getElementById('api-container');

    apis.forEach(api => {
        const apiCard = document.createElement('div');
        apiCard.classList.add('api-card');

        const fullUrl = window.location.origin + api.endpoint;

        apiCard.innerHTML = `
            <h2>${api.name}</h2>
            <p>${api.description}</p>
            <div class="api-link-box">
                <input type="text" class="api-url" value="${fullUrl}" readonly>
            </div>
            <div class="button-container">
                <button class="copy-btn">Copy URL</button>
                <button class="test-btn">Test</button>
            </div>
        `;

        apiCard.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(fullUrl);
            alert("Copied: " + fullUrl);
        });

        apiCard.querySelector('.test-btn').addEventListener('click', () => {
            window.open(fullUrl, '_blank');
        });

        apiContainer.appendChild(apiCard);
    });

    document.querySelector('.copyright').addEventListener('click', () => {
        window.open("https://whatsapp.com/channel/0029Vap32qXLikg91i4TmH3K", "_blank");
    });
});
