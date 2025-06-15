const AniListAPI = require('./anilist');

class AniListCommands {
    constructor() {
        this.api = new AniListAPI();
    }

    // Améliorer la qualité du français après traduction
    improveTranslation(text) {
        if (!text) return text;
        
        // Dictionnaire de corrections pour un français plus élégant et précis
        const corrections = {
            // Vocabulaire anime/manga spécialisé
            'ninja academy': 'académie ninja',
            'high school': 'lycée',
            'middle school': 'collège',
            'student council': 'conseil des élèves',
            'guild master': 'maître de guilde',
            'magic academy': 'académie de magie',
            'sword fighting': "combat à l'épée",
            'martial arts': 'arts martiaux',
            'supernatural powers': 'pouvoirs surnaturels',
            'demon slayer': 'pourfendeur de démons',
            'dragon ball': 'boule de cristal',
            'tournament arc': 'tournoi',
            'fighting tournament': 'tournoi de combat',
            'battle royale': 'bataille royale',
            'school festival': 'festival scolaire',
            'transfer student': 'élève transféré',
            'childhood friend': "ami d'enfance",
            'love triangle': 'triangle amoureux',
            'plot twist': 'rebondissement',
            
            // Expressions courantes améliorées
            'however': 'cependant',
            'meanwhile': 'pendant ce temps',
            'nevertheless': 'néanmoins',
            'furthermore': 'de plus',
            'therefore': 'par conséquent',
            'moreover': 'qui plus est',
            'in addition': 'en outre',
            'on the other hand': "d'autre part",
            'as a result': 'en conséquence',
            'in conclusion': 'en conclusion',
            'at first': "d'abord",
            'eventually': 'finalement',
            'suddenly': 'soudainement',
            'immediately': 'immédiatement',
            
            // Corrections de traductions automatiques communes
            'il découvre': 'il découvre',
            'elle découvre': 'elle découvre',
            'se rendre compte': 'réaliser',
            'se rendre compte de': 'réaliser que',
            'au bout du compte': 'finalement',
            'en train de': 'en cours de',
            'être en mesure de': 'pouvoir',
            'avoir lieu': 'se dérouler',
            'prendre place': 'se dérouler',
            'faire face à': 'affronter',
            'se retrouver': 'se trouver',
            'être capable de': 'pouvoir',
            'il s\'avère que': 'il se révèle que',
            'afin de': 'pour',
            'en dépit de': 'malgré',
            'par rapport à': 'concernant',
            'en ce qui concerne': 'concernant',
            
            // Corrections de faux-amis et traductions littérales
            'réaliser': 'comprendre',
            'actuellement': 'en fait',
            'éventuellement': 'peut-être',
            'définitivement': 'sans aucun doute',
            'opportunité': 'occasion',
            'sympathique': 'aimable',
            'large': 'grand',
            'ancien': 'précédent',
            'actuel': 'présent',
            
            // Améliorations stylistiques
            'très important': 'crucial',
            'très grand': 'immense',
            'très petit': 'minuscule',
            'très rapide': 'ultra-rapide',
            'très fort': 'puissant',
            'très dangereux': 'redoutable',
            'très beau': 'magnifique',
            'très difficile': 'ardu',
            'très intéressant': 'fascinant',
            'très populaire': 'très apprécié',
            
            // Corrections spécifiques aux synopsis d'anime
            'est un garçon': 'est un jeune homme',
            'est une fille': 'est une jeune femme',
            'des pouvoirs magiques': 'des pouvoirs mystiques',
            'un monde fantastique': 'un univers fantastique',
            'une aventure épique': 'une épopée extraordinaire',
            'combattre le mal': 'lutter contre les forces du mal',
            'sauver le monde': 'préserver le monde',
            'découvrir ses origines': 'découvrir ses véritables origines',
            'réveiller ses pouvoirs': 'éveiller ses capacités',
            
            // Expressions temporelles
            'dans le futur': 'dans le futur',
            'dans le passé': 'dans le passé',
            'autrefois': 'jadis',
            'de nos jours': 'à notre époque',
            'un jour': 'un beau jour',
            
            // Corrections grammaticales courantes
            'il y a': 'il existe',
            'il arrive que': 'il arrive parfois que',
            'il se peut que': 'il est possible que',
            'il est probable que': 'il est vraisemblable que'
        };
        
        let improved = text;
        
        // Appliquer les corrections du dictionnaire
        Object.entries(corrections).forEach(([from, to]) => {
            const regex = new RegExp(`\\b${from}\\b`, 'gi');
            improved = improved.replace(regex, to);
        });
        
        // Corrections de ponctuation française (typographie française)
        improved = improved
            .replace(/\s+,/g, ',')
            .replace(/\s+\./g, '.')
            .replace(/\s+!/g, ' !')
            .replace(/\s+\?/g, ' ?')
            .replace(/\s+:/g, ' :')
            .replace(/\s+;/g, ' ;')
            .replace(/\s+»/g, ' »')
            .replace(/«\s+/g, '« ')
            
            // Corrections des articles et prépositions contractés
            .replace(/\bde le\b/g, 'du')
            .replace(/\bde les\b/g, 'des')
            .replace(/\bà le\b/g, 'au')
            .replace(/\bà les\b/g, 'aux')
            .replace(/\bpar le\b/g, 'par le')
            .replace(/\bsur le\b/g, 'sur le')
            .replace(/\bdans le\b/g, 'dans le')
            
            // Amélioration des connecteurs logiques et temporels
            .replace(/\bCependant,\s*/g, 'Cependant, ')
            .replace(/\bToutefois,\s*/g, 'Toutefois, ')
            .replace(/\bNéanmoins,\s*/g, 'Néanmoins, ')
            .replace(/\bPar ailleurs,\s*/g, 'Par ailleurs, ')
            .replace(/\bEn effet,\s*/g, 'En effet, ')
            .replace(/\bAinsi,\s*/g, 'Ainsi, ')
            .replace(/\bDès lors,\s*/g, 'Dès lors, ')
            .replace(/\bEnsuite,\s*/g, 'Ensuite, ')
            .replace(/\bPuis,\s*/g, 'Puis, ')
            .replace(/\bEnfin,\s*/g, 'Enfin, ')
            
            // Corrections grammaticales courantes
            .replace(/\bun une\b/g, 'une')
            .replace(/\ble la\b/g, 'la')
            .replace(/\bce cette\b/g, 'cette')
            .replace(/\bson sa\b/g, 'sa')
            .replace(/\bmon ma\b/g, 'ma')
            .replace(/\bton ta\b/g, 'ta')
            
            // Corrections des répétitions de mots
            .replace(/\b(\w+)\s+\1\b/g, '$1')
            
            // Amélioration des phrases spécifiques aux synopsis d'anime
            .replace(/\best un garçon qui\b/g, 'est un jeune homme qui')
            .replace(/\best une fille qui\b/g, 'est une jeune femme qui')
            .replace(/\bdes pouvoirs magiques\b/g, 'des pouvoirs mystiques')
            .replace(/\bun monde fantastique\b/g, 'un univers fantastique')
            .replace(/\bune aventure épique\b/g, 'une épopée extraordinaire')
            .replace(/\bse bat contre\b/g, 'combat')
            .replace(/\blutter contre\b/g, 'affronter')
            .replace(/\bprotéger ses amis\b/g, 'protéger ses proches')
            
            // Corrections des temps verbaux mal traduits
            .replace(/\bavait été\b/g, 'était')
            .replace(/\baurait été\b/g, 'serait')
            .replace(/\bdevrait être\b/g, 'devrait être')
            .replace(/\bpourrait être\b/g, 'pourrait être')
            
            // Nettoyage des espaces et répétitions
            .replace(/\s+/g, ' ')
            .replace(/([.!?])\s*\1+/g, '$1')
            .replace(/\.\s*\./g, '.')
            .replace(/,\s*,/g, ',')
            .trim();
            
        // Capitaliser correctement le début des phrases
        improved = improved.replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => {
            return p1 + p2.toUpperCase();
        });
        
        // Correction des guillemets français
        improved = improved.replace(/"([^"]+)"/g, '« $1 »');
        
        // Validation finale et corrections de cohérence
        improved = this.finalTranslationValidation(improved);
        
        return improved;
    }

    // Validation finale de la traduction
    finalTranslationValidation(text) {
        // Vérifier et corriger les erreurs communes de traduction automatique
        let validated = text;
        
        // Détecter et corriger les phrases qui semblent mal traduites
        const problematicPatterns = [
            // Phrases qui indiquent une mauvaise traduction
            /il\/elle/gi,
            /son\/sa/gi,
            /le\/la/gi,
            /TRANSLATED BY/gi,
            /MYMEMORY WARNING/gi,
            /\[.*?\]/g, // Supprimer les crochets avec contenu technique
            /\{.*?\}/g, // Supprimer les accolades avec contenu technique
        ];
        
        problematicPatterns.forEach(pattern => {
            if (pattern.toString().includes('WARNING') || pattern.toString().includes('TRANSLATED')) {
                validated = validated.replace(pattern, '');
            } else if (pattern.toString().includes('il/elle')) {
                validated = validated.replace(pattern, 'il');
            } else if (pattern.toString().includes('son/sa')) {
                validated = validated.replace(pattern, 'son');
            } else if (pattern.toString().includes('le/la')) {
                validated = validated.replace(pattern, 'le');
            } else {
                validated = validated.replace(pattern, '');
            }
        });
        
        // Corrections de cohérence de genre et nombre
        validated = validated
            // Accords de base
            .replace(/\bun ([aeiou])/gi, 'un $1')
            .replace(/\bune ([bcdfghjklmnpqrstvwxyz])/gi, 'une $1')
            
            // Corrections des malformations communes
            .replace(/\s{2,}/g, ' ')
            .replace(/\.\s*\./g, '.')
            .replace(/,\s*,/g, ',')
            .replace(/!\s*!/g, '!')
            .replace(/\?\s*\?/g, '?')
            
            // Nettoyer les caractères indésirables
            .replace(/[^\w\sàâäçéèêëïîôöùûüÿñæœ.,!?;:()"«»-]/g, '')
            
            // S'assurer que le texte se termine par un point
            .replace(/([^.!?])$/, '$1.');
        
        // Vérifier la longueur minimale (éviter les traductions vides ou trop courtes)
        if (validated.length < 20) {
            return 'Synopsis non disponible en français.';
        }
        
        return validated.trim();
    }

    // Traduire le texte en français avec Google Translate
    async translateToFrench(text) {
        if (!text) return 'Aucune description disponible.';
        
        // Préparation du texte pour une meilleure traduction
        let cleanText = text
            .replace(/<[^>]*>/g, '') // Supprimer les balises HTML
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        try {
            const translation = await this.translateWithGoogleAPI(cleanText);
            if (translation && translation !== cleanText && translation.length > 10) {
                return this.improveTranslation(translation);
            }
        } catch (error) {
            console.log('Erreur de traduction Google:', error.message);
            // En cas d'erreur, retourner le texte original nettoyé
            return cleanText;
        }
        
        return cleanText;
    }

    // Méthode de traduction Google Translate simplifiée
    async translateWithGoogleAPI(text) {
        const axios = require('axios');
        
        // Utiliser l'API Google Translate gratuite
        const encodedText = encodeURIComponent(text);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodedText}`;
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000
        });
        
        if (response.data && response.data[0] && Array.isArray(response.data[0])) {
            let translation = '';
            for (let i = 0; i < response.data[0].length; i++) {
                if (response.data[0][i] && response.data[0][i][0]) {
                    translation += response.data[0][i][0];
                }
            }
            return translation.trim();
        }
        
        throw new Error('Format de réponse Google Translate invalide');
    }

    // Formater la description (synopsis complet)
    async formatDescription(description) {
        if (!description) return 'Aucune description disponible.';
        
        // Supprimer les balises HTML
        const cleanDescription = description.replace(/<[^>]*>/g, '');
        
        // Traduire en français (pour l'instant, retourner tel quel)
        const translatedDescription = await this.translateToFrench(cleanDescription);
        
        // Retourner le synopsis complet sans troncature
        return translatedDescription;
    }
    
    // Convertir en police Unicode gras
    toBoldUnicode(text) {
        const boldMap = {
            'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
            'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
            '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
        };
        return text.split('').map(char => boldMap[char] || char).join('');
    }
    
    // Convertir en police Unicode italique
    toItalicUnicode(text) {
        const italicMap = {
            'A': '𝐴', 'B': '𝐵', 'C': '𝐶', 'D': '𝐷', 'E': '𝐸', 'F': '𝐹', 'G': '𝐺', 'H': '𝐻', 'I': '𝐼', 'J': '𝐽', 'K': '𝐾', 'L': '𝐿', 'M': '𝑀', 'N': '𝑁', 'O': '𝑂', 'P': '𝑃', 'Q': '𝑄', 'R': '𝑅', 'S': '𝑆', 'T': '𝑇', 'U': '𝑈', 'V': '𝑉', 'W': '𝑊', 'X': '𝑋', 'Y': '𝑌', 'Z': '𝑍',
            'a': '𝑎', 'b': '𝑏', 'c': '𝑐', 'd': '𝑑', 'e': '𝑒', 'f': '𝑓', 'g': '𝑔', 'h': 'ℎ', 'i': '𝑖', 'j': '𝑗', 'k': '𝑘', 'l': '𝑙', 'm': '𝑚', 'n': '𝑛', 'o': '𝑜', 'p': '𝑝', 'q': '𝑞', 'r': '𝑟', 's': '𝑠', 't': '𝑡', 'u': '𝑢', 'v': '𝑣', 'w': '𝑤', 'x': '𝑥', 'y': '𝑦', 'z': '𝑧'
        };
        return text.split('').map(char => italicMap[char] || char).join('');
    }

    // Formater la date
    formatDate(dateObj) {
        if (!dateObj || !dateObj.year) return 'Date inconnue';
        
        const months = [
            'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
            'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
        ];
        
        let formatted = dateObj.year.toString();
        if (dateObj.month) {
            formatted = `${months[dateObj.month - 1]} ${formatted}`;
        }
        if (dateObj.day) {
            formatted = `${dateObj.day} ${formatted}`;
        }
        
        return formatted;
    }

    // Formater le statut
    formatStatus(status) {
        const statusMap = {
            'FINISHED': '✅ Terminé',
            'RELEASING': '📺 En cours',
            'NOT_YET_RELEASED': '⏳ À venir',
            'CANCELLED': '❌ Annulé',
            'HIATUS': '⏸️ En pause'
        };
        
        return statusMap[status] || status;
    }

    // Formater le temps jusqu'à la diffusion
    formatTimeUntilAiring(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}j ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    // Commande !anime
    async handleAnimeCommand(query) {
        try {
            if (!query.trim()) {
                return '❌ Veuillez spécifier le nom d\'un anime.\nExemple: !anime Naruto';
            }

            const anime = await this.api.searchAnime(query);
            
            if (!anime) {
                return `❌ Aucun anime trouvé pour "${query}".`;
            }

            const title = anime.title.english || anime.title.romaji;
            const nativeTitle = anime.title.native ? `\n🈶 Titre original: ${anime.title.native}` : '';
            const score = anime.averageScore ? `⭐ ${anime.averageScore}/100` : 'Non noté';
            const episodes = anime.episodes ? `📺 ${anime.episodes} épisodes` : 'Episodes: Non spécifié';
            const duration = anime.duration ? ` (${anime.duration}min/ep)` : '';
            const status = this.formatStatus(anime.status);
            const startDate = this.formatDate(anime.startDate);
            const endDate = anime.endDate ? this.formatDate(anime.endDate) : 'En cours';
            const studio = anime.studios.nodes.length > 0 ? anime.studios.nodes[0].name : 'Studio inconnu';
            const genres = anime.genres.length > 0 ? anime.genres.join(', ') : 'Genres non spécifiés';
            const description = await this.formatDescription(anime.description);

            const textResponse = `🎌 ${this.toBoldUnicode(title)}${nativeTitle}

${score} | ${status}
${episodes}${duration}
🎬 Studio: ${studio}
📅 Diffusion: ${startDate} - ${endDate}
🏷️ Genres: ${genres}
👥 Popularité: ${anime.popularity.toLocaleString()} fans

📖 ${this.toBoldUnicode('Synopsis:')}
${description}

🔗 Plus d'infos: ${anime.siteUrl}`;

            // Retourner le texte et l'URL de l'image
            return {
                text: textResponse,
                image: anime.coverImage?.large || anime.coverImage?.medium || null
            };

        } catch (error) {
            console.error('Erreur commande anime:', error);
            return '❌ Erreur lors de la recherche de l\'anime. Veuillez réessayer.';
        }
    }

    // Commande !manga
    async handleMangaCommand(query) {
        try {
            if (!query.trim()) {
                return '❌ Veuillez spécifier le nom d\'un manga.\nExemple: !manga One Piece';
            }

            const manga = await this.api.searchManga(query);
            
            if (!manga) {
                return `❌ Aucun manga trouvé pour "${query}".`;
            }

            const title = manga.title.english || manga.title.romaji;
            const nativeTitle = manga.title.native ? `\n🈶 Titre original: ${manga.title.native}` : '';
            const score = manga.averageScore ? `⭐ ${manga.averageScore}/100` : 'Non noté';
            const chapters = manga.chapters ? `📖 ${manga.chapters} chapitres` : 'Chapitres: Non spécifié';
            const volumes = manga.volumes ? ` | ${manga.volumes} volumes` : '';
            const status = this.formatStatus(manga.status);
            const startDate = this.formatDate(manga.startDate);
            const endDate = manga.endDate ? this.formatDate(manga.endDate) : 'En cours';
            const author = manga.staff.nodes.length > 0 ? manga.staff.nodes[0].name.full : 'Auteur inconnu';
            const genres = manga.genres.length > 0 ? manga.genres.join(', ') : 'Genres non spécifiés';
            const description = await this.formatDescription(manga.description);

            const textResponse = `📚 ${this.toBoldUnicode(title)}${nativeTitle}

${score} | ${status}
${chapters}${volumes}
✍️ Auteur: ${author}
📅 Publication: ${startDate} - ${endDate}
🏷️ Genres: ${genres}
👥 Popularité: ${manga.popularity.toLocaleString()} fans

📖 ${this.toBoldUnicode('Synopsis:')}
${description}

🔗 Plus d'infos: ${manga.siteUrl}`;

            // Retourner le texte et l'URL de l'image
            return {
                text: textResponse,
                image: manga.coverImage?.large || manga.coverImage?.medium || null
            };

        } catch (error) {
            console.error('Erreur commande manga:', error);
            return '❌ Erreur lors de la recherche du manga. Veuillez réessayer.';
        }
    }

    // Commande !trending
    async handleTrendingCommand(limit = 10) {
        try {
            const [animes, mangas] = await Promise.all([
                this.api.getTrending('ANIME', 1, limit),
                this.api.getTrending('MANGA', 1, limit)
            ]);

            let response = `🔥 ${this.toBoldUnicode('TOP TRENDING ACTUELLEMENT')}\n\n`;
            
            response += `📺 ${this.toBoldUnicode('ANIMES:')}\n`;
            animes.forEach((anime, index) => {
                const title = anime.title.english || anime.title.romaji;
                const score = anime.averageScore ? `⭐${anime.averageScore}` : 'N/A';
                response += `${index + 1}. ${title} ${score}\n`;
            });

            response += `\n📚 ${this.toBoldUnicode('MANGAS:')}\n`;
            mangas.forEach((manga, index) => {
                const title = manga.title.english || manga.title.romaji;
                const score = manga.averageScore ? `⭐${manga.averageScore}` : 'N/A';
                response += `${index + 1}. ${title} ${score}\n`;
            });

            return response;

        } catch (error) {
            console.error('Erreur commande trending:', error);
            return '❌ Erreur lors de la récupération des tendances. Veuillez réessayer.';
        }
    }

    // Commande !airing
    async handleAiringCommand() {
        try {
            const airingAnimes = await this.api.getAiring(1, 10);

            if (airingAnimes.length === 0) {
                return '❌ Aucun anime en cours de diffusion trouvé.';
            }

            let response = `📺 ${this.toBoldUnicode('ANIMES EN COURS DE DIFFUSION')}\n\n`;
            
            airingAnimes.forEach((anime, index) => {
                const title = anime.title.english || anime.title.romaji;
                const score = anime.averageScore ? `⭐${anime.averageScore}` : 'N/A';
                
                let airingInfo = '';
                if (anime.nextAiringEpisode) {
                    const timeUntil = this.formatTimeUntilAiring(anime.nextAiringEpisode.timeUntilAiring);
                    airingInfo = `\n   📅 Ep ${anime.nextAiringEpisode.episode} dans ${timeUntil}`;
                }
                
                response += `${index + 1}. ${this.toBoldUnicode(title)} ${score}${airingInfo}\n\n`;
            });

            return response;

        } catch (error) {
            console.error('Erreur commande airing:', error);
            return '❌ Erreur lors de la récupération des animes en cours. Veuillez réessayer.';
        }
    }

    // Commande !random
    async handleRandomCommand(type = 'anime') {
        try {
            const mediaType = type.toLowerCase() === 'manga' ? 'MANGA' : 'ANIME';
            const media = await this.api.getRandom(mediaType);
            
            if (!media) {
                return '❌ Impossible de trouver un anime/manga aléatoire.';
            }

            const title = media.title.english || media.title.romaji;
            const score = media.averageScore ? `⭐ ${media.averageScore}/100` : 'Non noté';
            const status = this.formatStatus(media.status);
            const genres = media.genres.length > 0 ? media.genres.join(', ') : 'Genres non spécifiés';
            const description = await this.formatDescription(media.description);
            
            const typeIcon = mediaType === 'ANIME' ? '🎌' : '📚';
            const countInfo = mediaType === 'ANIME' 
                ? (media.episodes ? `📺 ${media.episodes} épisodes` : 'Episodes: Non spécifié')
                : (media.chapters ? `📖 ${media.chapters} chapitres` : 'Chapitres: Non spécifié');

            return `🎲 ${this.toBoldUnicode(`${typeIcon} DÉCOUVERTE ALÉATOIRE`)}

${this.toBoldUnicode(title)}

${score} | ${status}
${countInfo}
🏷️ Genres: ${genres}

📖 ${this.toBoldUnicode('Synopsis:')}
${description}

🔗 Plus d'infos: ${media.siteUrl}`;

        } catch (error) {
            console.error('Erreur commande random:', error);
            return '❌ Erreur lors de la génération aléatoire. Veuillez réessayer.';
        }
    }

    // Commande !character
    async handleCharacterCommand(query) {
        try {
            if (!query.trim()) {
                return '❌ Veuillez spécifier le nom d\'un personnage.\nExemple: !character Naruto Uzumaki';
            }

            const character = await this.api.searchCharacter(query);
            
            if (!character) {
                return `❌ Aucun personnage trouvé pour "${query}".`;
            }

            const name = character.name.full;
            const nativeName = character.name.native ? `\n🈶 Nom original: ${character.name.native}` : '';
            const description = await this.formatDescription(character.description);
            const favourites = character.favourites ? `❤️ ${character.favourites.toLocaleString()} fans` : '';
            
            let mediaList = '';
            if (character.media.nodes.length > 0) {
                const topMedia = character.media.nodes.slice(0, 3);
                mediaList = `\n\n📺 ${this.toBoldUnicode('Apparitions principales:')}\n`;
                topMedia.forEach(media => {
                    const title = media.title.english || media.title.romaji;
                    const type = media.type === 'ANIME' ? '🎌' : '📚';
                    mediaList += `${type} ${title}\n`;
                });
            }

            const textResponse = `👤 ${this.toBoldUnicode(name)}${nativeName}

${favourites}

📖 ${this.toBoldUnicode('Description:')}
${description}${mediaList}

🔗 Plus d'infos: ${character.siteUrl}`;

            // Retourner le texte et l'URL de l'image
            return {
                text: textResponse,
                image: character.image?.large || character.image?.medium || null
            };

        } catch (error) {
            console.error('Erreur commande character:', error);
            return '❌ Erreur lors de la recherche du personnage. Veuillez réessayer.';
        }
    }

    // Commande !top
    async handleTopCommand(type = 'anime') {
        try {
            const mediaType = type.toLowerCase() === 'manga' ? 'MANGA' : 'ANIME';
            const topMedia = await this.api.getTop(mediaType, 1, 10);

            if (topMedia.length === 0) {
                return '❌ Impossible de récupérer le classement.';
            }

            const typeIcon = mediaType === 'ANIME' ? '🎌' : '📚';
            const typeName = mediaType === 'ANIME' ? 'ANIMES' : 'MANGAS';
            
            let response = `🏆 ${this.toBoldUnicode(`TOP 10 ${typeName} LES MIEUX NOTÉS`)}\n\n`;
            
            topMedia.forEach((media, index) => {
                const title = media.title.english || media.title.romaji;
                const score = media.averageScore ? `⭐${media.averageScore}` : 'N/A';
                response += `${index + 1}. ${this.toBoldUnicode(title)} ${score}\n`;
            });

            return response;

        } catch (error) {
            console.error('Erreur commande top:', error);
            return '❌ Erreur lors de la récupération du classement. Veuillez réessayer.';
        }
    }

    // Commande !season
    async handleSeasonCommand(year, season) {
        try {
            if (!year || !season) {
                return '❌ Format incorrect. Utilisez: !season [année] [saison]\nExemple: !season 2024 winter\nSaisons: winter, spring, summer, fall';
            }

            const validSeasons = ['winter', 'spring', 'summer', 'fall'];
            if (!validSeasons.includes(season.toLowerCase())) {
                return '❌ Saison invalide. Utilisez: winter, spring, summer, fall';
            }

            const seasonAnimes = await this.api.getSeason(parseInt(year), season);

            if (seasonAnimes.length === 0) {
                return `❌ Aucun anime trouvé pour ${season} ${year}.`;
            }

            const seasonNames = {
                'winter': 'Hiver',
                'spring': 'Printemps', 
                'summer': 'Été',
                'fall': 'Automne'
            };

            let response = `🗓️ ${this.toBoldUnicode(`ANIMES ${seasonNames[season.toLowerCase()]} ${year}`)}\n\n`;
            
            seasonAnimes.slice(0, 15).forEach((anime, index) => {
                const title = anime.title.english || anime.title.romaji;
                const score = anime.averageScore ? `⭐${anime.averageScore}` : 'N/A';
                const status = anime.status === 'RELEASING' ? '📺' : '✅';
                response += `${index + 1}. ${status} ${this.toBoldUnicode(title)} ${score}\n`;
            });

            return response;

        } catch (error) {
            console.error('Erreur commande season:', error);
            return '❌ Erreur lors de la récupération de la saison. Veuillez réessayer.';
        }
    }

    // Commande !genres
    async handleGenresCommand() {
        try {
            const genres = await this.api.getGenres();

            if (!genres || genres.length === 0) {
                return '❌ Impossible de récupérer la liste des genres.';
            }

            let response = `🏷️ ${this.toBoldUnicode('GENRES DISPONIBLES')}\n\n`;
            
            // Organiser les genres en colonnes pour un meilleur affichage
            const genreList = genres.map((genre, index) => `• ${genre}`).join('\n');
            response += genreList;
            
            // Ajouter les types de format populaires pour manga
            response += `\n\n📚 ${this.toBoldUnicode('TYPES DE MANGA:')}\n`;
            response += '• Shounen (action/aventure pour jeunes garçons)\n';
            response += '• Shoujo (romance pour jeunes filles)\n';
            response += '• Seinen (pour hommes adultes)\n';
            response += '• Josei (pour femmes adultes)\n';
            response += '• Kodomomuke (pour enfants)\n';
            
            response += '\n\n💡 Utilisez !genre [nom_genre] pour rechercher par genre';

            return response;

        } catch (error) {
            console.error('Erreur commande genres:', error);
            return '❌ Erreur lors de la récupération des genres. Veuillez réessayer.';
        }
    }

    // Commande !genre
    async handleGenreCommand(genre, type = 'anime') {
        try {
            if (!genre.trim()) {
                return '❌ Veuillez spécifier un genre.\nExemple: !genre Action\nUtilisez !genres pour voir tous les genres disponibles.';
            }

            const mediaType = type.toLowerCase() === 'manga' ? 'MANGA' : 'ANIME';
            const mediaList = await this.api.searchByGenre(genre, mediaType, 1, 15);

            if (mediaList.length === 0) {
                return `❌ Aucun ${mediaType.toLowerCase()} trouvé pour le genre "${genre}".`;
            }

            const typeIcon = mediaType === 'ANIME' ? '🎌' : '📚';
            const typeName = mediaType === 'ANIME' ? 'ANIMES' : 'MANGAS';
            
            let response = `🏷️ ${this.toBoldUnicode(`${typeName} - GENRE: ${genre.toUpperCase()}`)}\n\n`;
            
            mediaList.forEach((media, index) => {
                const title = media.title.english || media.title.romaji;
                const score = media.averageScore ? `⭐${media.averageScore}` : 'N/A';
                response += `${index + 1}. ${this.toBoldUnicode(title)} ${score}\n`;
            });

            response += `\n💡 Suggestions basées sur le genre ${this.toBoldUnicode(genre)}`;

            return response;

        } catch (error) {
            console.error('Erreur commande genre:', error);
            return '❌ Erreur lors de la recherche par genre. Veuillez réessayer.';
        }
    }

    // Commande !search
    async handleSearchCommand(query) {
        try {
            if (!query.trim()) {
                return '❌ Veuillez spécifier un terme de recherche.\nExemple: !search Demon Slayer';
            }

            const results = await this.api.globalSearch(query);

            if (!results.animes.length && !results.mangas.length && !results.characters.length) {
                return `❌ Aucun résultat trouvé pour "${query}".`;
            }

            let response = `🔍 ${this.toBoldUnicode(`RÉSULTATS DE RECHERCHE: "${query}"`)}\n\n`;

            if (results.animes.length > 0) {
                response += `🎌 ${this.toBoldUnicode('ANIMES:')}\n`;
                results.animes.forEach((anime, index) => {
                    const title = anime.title.english || anime.title.romaji;
                    const score = anime.averageScore ? `⭐${anime.averageScore}` : 'N/A';
                    response += `${index + 1}. ${title} ${score}\n`;
                });
                response += '\n';
            }

            if (results.mangas.length > 0) {
                response += `📚 ${this.toBoldUnicode('MANGAS:')}\n`;
                results.mangas.forEach((manga, index) => {
                    const title = manga.title.english || manga.title.romaji;
                    const score = manga.averageScore ? `⭐${manga.averageScore}` : 'N/A';
                    response += `${index + 1}. ${title} ${score}\n`;
                });
                response += '\n';
            }

            if (results.characters.length > 0) {
                response += `👤 ${this.toBoldUnicode('PERSONNAGES:')}\n`;
                results.characters.forEach((character, index) => {
                    response += `${index + 1}. ${character.name.full}\n`;
                });
            }

            return response;

        } catch (error) {
            console.error('Erreur commande search:', error);
            return '❌ Erreur lors de la recherche. Veuillez réessayer.';
        }
    }

    // Commande !recommendations
    async handleRecommendationsCommand(animeTitle) {
        try {
            if (!animeTitle.trim()) {
                return '❌ Veuillez spécifier un anime.\nExemple: !recommendations Naruto';
            }

            // D'abord trouver l'anime
            const anime = await this.api.searchAnime(animeTitle);
            if (!anime) {
                return `❌ Anime "${animeTitle}" non trouvé.`;
            }

            const recommendations = await this.api.getRecommendations(anime.id);

            if (!recommendations || recommendations.length === 0) {
                return `❌ Aucune recommandation trouvée pour "${anime.title.english || anime.title.romaji}".`;
            }

            const animeMainTitle = anime.title.english || anime.title.romaji;
            let response = `💡 ${this.toBoldUnicode(`RECOMMANDATIONS BASÉES SUR: ${animeMainTitle}`)}\n\n`;

            recommendations.slice(0, 8).forEach((rec, index) => {
                if (rec.mediaRecommendation) {
                    const title = rec.mediaRecommendation.title.english || rec.mediaRecommendation.title.romaji;
                    const score = rec.mediaRecommendation.averageScore ? `⭐${rec.mediaRecommendation.averageScore}` : 'N/A';
                    const rating = rec.rating > 0 ? `👍${rec.rating}` : '';
                    response += `${index + 1}. ${this.toBoldUnicode(title)} ${score} ${rating}\n`;
                }
            });

            return response;

        } catch (error) {
            console.error('Erreur commande recommendations:', error);
            return '❌ Erreur lors de la récupération des recommandations. Veuillez réessayer.';
        }
    }

    // Commande !stats
    async handleStatsCommand() {
        try {
            const stats = await this.api.getStats();

            if (!stats) {
                return '❌ Impossible de récupérer les statistiques d\'AniList.';
            }

            let response = `📊 ${this.toBoldUnicode('STATISTIQUES ANILIST')}\n\n`;
            
            if (stats.anime && stats.anime.nodes.length > 0) {
                const animeStats = stats.anime.nodes[0];
                response += `🎌 ${this.toBoldUnicode('Animes:')} ${animeStats.count.toLocaleString()}\n`;
                if (animeStats.meanScore) {
                    response += `   📊 Score moyen: ${animeStats.meanScore}/100\n`;
                }
            }

            if (stats.manga && stats.manga.nodes.length > 0) {
                const mangaStats = stats.manga.nodes[0];
                response += `📚 ${this.toBoldUnicode('Mangas:')} ${mangaStats.count.toLocaleString()}\n`;
                if (mangaStats.meanScore) {
                    response += `   📊 Score moyen: ${mangaStats.meanScore}/100\n`;
                }
            }

            if (stats.characters && stats.characters.nodes.length > 0) {
                response += `👤 ${this.toBoldUnicode('Personnages:')} ${stats.characters.nodes[0].count.toLocaleString()}\n`;
            }

            if (stats.staff && stats.staff.nodes.length > 0) {
                response += `👥 ${this.toBoldUnicode('Staff:')} ${stats.staff.nodes[0].count.toLocaleString()}\n`;
            }

            if (stats.studios && stats.studios.nodes.length > 0) {
                response += `🏢 ${this.toBoldUnicode('Studios:')} ${stats.studios.nodes[0].count.toLocaleString()}\n`;
            }

            if (stats.users && stats.users.nodes.length > 0) {
                response += `🌍 ${this.toBoldUnicode('Utilisateurs:')} ${stats.users.nodes[0].count.toLocaleString()}\n`;
            }

            response += '\n🔗 Source: AniList.co';

            return response;

        } catch (error) {
            console.error('Erreur commande stats:', error);
            return '❌ Erreur lors de la récupération des statistiques. Veuillez réessayer.';
        }
    }
}

module.exports = AniListCommands;