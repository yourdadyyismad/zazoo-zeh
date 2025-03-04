document.addEventListener('DOMContentLoaded', () => {
    const apis = [
        {
            name: "Anime Quotes API",
            description: "Fetches a random anime quote with its author and anime title.",
            endpoint: "/api/aniQuotes"
        },
        {
            name: "Hentai API",
            description: "Retrives A Random hentai Video.",
            endpoint: "/api/hentai"
        },
                {
            name: "Ytmp3 API",
            description: `Retrives The Audio Format And Details Of A Given Song Name
            Using (?q=Faded+Alan+Walker) As The Parameter`,
            endpoint: "/api/Ytmp3"
        },
        {
            name: "Ytmp4 API",
            description: `Retrives The Video Format And Details Of A Given Song Name
            Using (?q=Faded+Alan+Walker) As The Parameter`,
            endpoint: "/api/Ytmp4"
                },
                {
            name: "YtSearch API",
            description: `Retrives Multiple Song Details Using (?q=Faded+Alan+Walker) As The Parameter`,
            endpoint: "/api/ytsearch"
        },
        {
            name: "Wikipedia API",
            description: `Retrives The Given Query Results From Wikipedia Using The Format (?q=Albert Einstein) As The Parameter`,
            endpoint: "/api/Ytmp4"
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
