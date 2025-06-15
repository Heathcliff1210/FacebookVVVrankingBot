const axios = require('axios');

// Configuration de l'API AniList
const ANILIST_API_URL = 'https://graphql.anilist.co';

class AniListAPI {
    constructor() {
        this.baseURL = ANILIST_API_URL;
    }

    // Méthode générique pour faire des requêtes GraphQL
    async query(query, variables = {}) {
        try {
            const response = await axios.post(this.baseURL, {
                query,
                variables
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.data.errors) {
                throw new Error(response.data.errors[0].message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Erreur AniList API:', error.message);
            throw error;
        }
    }

    // Rechercher un anime
    async searchAnime(title) {
        const query = `
            query ($search: String) {
                Media (search: $search, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    description
                    episodes
                    duration
                    status
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    averageScore
                    meanScore
                    popularity
                    favourites
                    studios {
                        nodes {
                            name
                        }
                    }
                    genres
                    format
                    season
                    seasonYear
                    coverImage {
                        large
                        medium
                    }
                    bannerImage
                    siteUrl
                }
            }
        `;

        const data = await this.query(query, { search: title });
        return data.Media;
    }

    // Rechercher un manga
    async searchManga(title) {
        const query = `
            query ($search: String) {
                Media (search: $search, type: MANGA) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    description
                    chapters
                    volumes
                    status
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    averageScore
                    meanScore
                    popularity
                    favourites
                    staff {
                        nodes {
                            name {
                                full
                            }
                        }
                    }
                    genres
                    format
                    coverImage {
                        large
                        medium
                    }
                    bannerImage
                    siteUrl
                }
            }
        `;

        const data = await this.query(query, { search: title });
        return data.Media;
    }

    // Obtenir les animes/mangas trending
    async getTrending(type = 'ANIME', page = 1, perPage = 10) {
        const query = `
            query ($type: MediaType, $page: Int, $perPage: Int) {
                Page (page: $page, perPage: $perPage) {
                    media (type: $type, sort: TRENDING_DESC) {
                        id
                        title {
                            romaji
                            english
                        }
                        averageScore
                        popularity
                        episodes
                        chapters
                        format
                        status
                        coverImage {
                            medium
                        }
                        siteUrl
                    }
                }
            }
        `;

        const data = await this.query(query, { type, page, perPage });
        return data.Page.media;
    }

    // Obtenir les animes en cours de diffusion
    async getAiring(page = 1, perPage = 10) {
        const query = `
            query ($page: Int, $perPage: Int) {
                Page (page: $page, perPage: $perPage) {
                    media (type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
                        id
                        title {
                            romaji
                            english
                        }
                        episodes
                        nextAiringEpisode {
                            episode
                            timeUntilAiring
                            airingAt
                        }
                        averageScore
                        coverImage {
                            medium
                        }
                        siteUrl
                    }
                }
            }
        `;

        const data = await this.query(query, { page, perPage });
        return data.Page.media;
    }

    // Obtenir un anime/manga aléatoire
    async getRandom(type = 'ANIME') {
        const randomId = Math.floor(Math.random() * 150000) + 1;
        
        const query = `
            query ($id: Int, $type: MediaType) {
                Media (id: $id, type: $type) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    description
                    episodes
                    chapters
                    volumes
                    averageScore
                    genres
                    format
                    status
                    coverImage {
                        large
                    }
                    siteUrl
                }
            }
        `;

        try {
            const data = await this.query(query, { id: randomId, type });
            return data.Media;
        } catch (error) {
            // Si l'ID n'existe pas, essayer avec un autre
            return this.getRandom(type);
        }
    }

    // Rechercher un personnage
    async searchCharacter(name) {
        const query = `
            query ($search: String) {
                Character (search: $search) {
                    id
                    name {
                        full
                        native
                    }
                    description
                    image {
                        large
                        medium
                    }
                    favourites
                    media {
                        nodes {
                            title {
                                romaji
                                english
                            }
                            type
                            format
                        }
                    }
                    siteUrl
                }
            }
        `;

        const data = await this.query(query, { search: name });
        return data.Character;
    }

    // Obtenir le top des animes/mangas
    async getTop(type = 'ANIME', page = 1, perPage = 10) {
        const query = `
            query ($type: MediaType, $page: Int, $perPage: Int) {
                Page (page: $page, perPage: $perPage) {
                    media (type: $type, sort: SCORE_DESC) {
                        id
                        title {
                            romaji
                            english
                        }
                        averageScore
                        popularity
                        episodes
                        chapters
                        format
                        status
                        coverImage {
                            medium
                        }
                        siteUrl
                    }
                }
            }
        `;

        const data = await this.query(query, { type, page, perPage });
        return data.Page.media;
    }

    // Obtenir les animes d'une saison spécifique
    async getSeason(year, season) {
        const query = `
            query ($year: Int, $season: MediaSeason) {
                Page (perPage: 20) {
                    media (type: ANIME, seasonYear: $year, season: $season, sort: POPULARITY_DESC) {
                        id
                        title {
                            romaji
                            english
                        }
                        episodes
                        averageScore
                        format
                        status
                        coverImage {
                            medium
                        }
                        siteUrl
                    }
                }
            }
        `;

        const data = await this.query(query, { year, season: season.toUpperCase() });
        return data.Page.media;
    }

    // Obtenir tous les genres disponibles
    async getGenres() {
        const query = `
            query {
                GenreCollection
            }
        `;

        const data = await this.query(query);
        return data.GenreCollection;
    }

    // Obtenir les types de format/démographie (seinen, shojo, etc.)
    async getFormats() {
        const query = `
            query {
                __type(name: "MediaFormat") {
                    enumValues {
                        name
                        description
                    }
                }
            }
        `;

        const data = await this.query(query);
        return data.__type.enumValues;
    }

    // Rechercher par genre
    async searchByGenre(genre, type = 'ANIME', page = 1, perPage = 10) {
        const query = `
            query ($genre: String, $type: MediaType, $page: Int, $perPage: Int) {
                Page (page: $page, perPage: $perPage) {
                    media (type: $type, genre: $genre, sort: POPULARITY_DESC) {
                        id
                        title {
                            romaji
                            english
                        }
                        averageScore
                        episodes
                        chapters
                        format
                        genres
                        coverImage {
                            medium
                        }
                        siteUrl
                    }
                }
            }
        `;

        const data = await this.query(query, { genre, type, page, perPage });
        return data.Page.media;
    }

    // Recherche globale
    async globalSearch(term, page = 1, perPage = 5) {
        const animeQuery = `
            query ($search: String, $page: Int, $perPage: Int) {
                Page (page: $page, perPage: $perPage) {
                    media (search: $search, type: ANIME) {
                        id
                        title {
                            romaji
                            english
                        }
                        type
                        format
                        averageScore
                        coverImage {
                            medium
                        }
                        siteUrl
                    }
                }
            }
        `;

        const mangaQuery = `
            query ($search: String, $page: Int, $perPage: Int) {
                Page (page: $page, perPage: $perPage) {
                    media (search: $search, type: MANGA) {
                        id
                        title {
                            romaji
                            english
                        }
                        type
                        format
                        averageScore
                        coverImage {
                            medium
                        }
                        siteUrl
                    }
                }
            }
        `;

        const characterQuery = `
            query ($search: String, $page: Int, $perPage: Int) {
                Page (page: $page, perPage: $perPage) {
                    characters (search: $search) {
                        id
                        name {
                            full
                        }
                        image {
                            medium
                        }
                        siteUrl
                    }
                }
            }
        `;

        const [animes, mangas, characters] = await Promise.all([
            this.query(animeQuery, { search: term, page, perPage }),
            this.query(mangaQuery, { search: term, page, perPage }),
            this.query(characterQuery, { search: term, page, perPage })
        ]);

        return {
            animes: animes.Page.media,
            mangas: mangas.Page.media,
            characters: characters.Page.characters
        };
    }

    // Obtenir des recommandations basées sur un anime
    async getRecommendations(animeId) {
        const query = `
            query ($id: Int) {
                Media (id: $id, type: ANIME) {
                    recommendations {
                        nodes {
                            mediaRecommendation {
                                id
                                title {
                                    romaji
                                    english
                                }
                                averageScore
                                format
                                episodes
                                coverImage {
                                    medium
                                }
                                siteUrl
                            }
                            rating
                        }
                    }
                }
            }
        `;

        const data = await this.query(query, { id: animeId });
        return data.Media.recommendations.nodes;
    }

    // Obtenir les statistiques générales
    async getStats() {
        const query = `
            query {
                SiteStatistics {
                    anime {
                        nodes {
                            count
                            meanScore
                        }
                    }
                    manga {
                        nodes {
                            count
                            meanScore
                        }
                    }
                    characters {
                        nodes {
                            count
                        }
                    }
                    staff {
                        nodes {
                            count
                        }
                    }
                    studios {
                        nodes {
                            count
                        }
                    }
                    users {
                        nodes {
                            count
                        }
                    }
                }
            }
        `;

        const data = await this.query(query);
        return data.SiteStatistics;
    }
}

module.exports = AniListAPI;
