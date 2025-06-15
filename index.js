const login = require('rapido-fca');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { keepAlive, startPinging } = require('./keep_alive');

// Importer les nouveaux modules
const AniListCommands = require('./modules/anilistCommands');
const GroupManagement = require('./modules/groupManagement');
const EnhancedCommands = require('./modules/enhancedCommands');

// ===================== CONFIGURATION INITIALE =====================
const SUPER_ADMIN_ID = '100069577772026'; // Facebook User ID as string
const LEADERBOARD_FILE = 'leaderboard.json';
const HISTORY_FILE = 'history.json';
const BACKUP_DIR = 'backups';
const MERGE_MEMORY_FILE = 'merge_memory.json';
const CONFIG_FILE = 'bot_config.json';
const APPSTATE_FILE = 'appstate.json';

// Configuration par défaut
const DEFAULT_CONFIG = {
    commandPrefix: '!',
    autoAcceptFriends: true,
    enableLogging: true
};

let api;
let botConfig = { ...DEFAULT_CONFIG };

// Système de sessions pour les confirmations
const pendingSessions = new Map();

// Cache des messages pour la détection automatique des suppressions
const messageCache = new Map();

// Initialiser les modules
let anilistCommands;
let groupManagement;
let enhancedCommands;

// Créer les dossiers et fichiers nécessaires s'ils n'existent pas
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

// Structure des catégories de rang (correction: 500 E pour ANAHATA au lieu de VISHUDDHA)
const CATEGORIES = [
    { name: "MULADHARA", min: 90000, max: 100000, emoji: "🔴", reward: null },
    { name: "SVADHISHTHANA", min: 80001, max: 90000, emoji: "🟠", reward: null },
    { name: "MANIPURA", min: 70001, max: 80000, emoji: "🟡", reward: null },
    { name: "ANAHATA", min: 60001, max: 70000, emoji: "🟢", reward: "⭐️ RÉCOMPENSE : 500 E ⭐️" },
    { name: "VISHUDDHA", min: 50001, max: 60000, emoji: "🔵", reward: null },
    { name: "AJNA", min: 40001, max: 50000, emoji: "💠", reward: null },
    { name: "SAHASRARA", min: 30001, max: 40000, emoji: "🟣", reward: "⭐️ RÉCOMPENSE : 300 E ⭐️" },
    { name: "LA COLÉRE", min: 15001, max: 30000, emoji: "🔥", reward: null },
    { name: "L' ORGUEIL", min: 10001, max: 15000, emoji: "🛡", reward: null },
    { name: "LA LUXURE", min: 8001, max: 10000, emoji: "🔞", reward: null },
    { name: "L' AVARICE", min: 6001, max: 8000, emoji: "💰", reward: "⭐️ RÉCOMPENSE : 150 E ⭐️\n[sauf pour ceux déjà passé par la]" },
    { name: "L' ENVIE", min: 4001, max: 6000, emoji: "🥇", reward: null },
    { name: "LA GOURMANDISE", min: 2001, max: 4000, emoji: "🎂", reward: null },
    { name: "LA PARESSE", min: 0, max: 2000, emoji: "⛱️", reward: null }
];

// ===================== MODULE DE STOCKAGE =====================
const storage = {
    admins: new Set([SUPER_ADMIN_ID]),
    leaderboard: { players: [] },
    history: [],
    mergeMemory: {},

    loadData() {
        try {
            if (fs.existsSync(LEADERBOARD_FILE)) {
                this.leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_FILE));
            }
            if (fs.existsSync(HISTORY_FILE)) {
                this.history = JSON.parse(fs.readFileSync(HISTORY_FILE));
            }
            if (fs.existsSync(MERGE_MEMORY_FILE)) {
                this.mergeMemory = JSON.parse(fs.readFileSync(MERGE_MEMORY_FILE));
            }
            if (fs.existsSync(CONFIG_FILE)) {
                const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
                botConfig = { ...DEFAULT_CONFIG, ...config };
                
                // Charger la liste des admins sauvegardés
                if (config.admins && Array.isArray(config.admins)) {
                    this.admins = new Set([SUPER_ADMIN_ID, ...config.admins]);
                }
            }
        } catch (e) {
            console.error('Erreur de chargement des données:', e);
        }
    },

    saveData() {
        try {
            // Sauvegarder la liste des admins dans la config (excluant le super admin)
            const adminsList = Array.from(this.admins).filter(id => id !== SUPER_ADMIN_ID);
            const configToSave = { ...botConfig, admins: adminsList };
            
            fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(this.leaderboard, null, 2));
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2));
            fs.writeFileSync(MERGE_MEMORY_FILE, JSON.stringify(this.mergeMemory, null, 2));
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
        } catch (e) {
            console.error('Erreur de sauvegarde des données:', e);
        }
    },

    createBackup() {
        try {
            const timestamp = moment().format('YYYYMMDD_HHmmss');
            const backupFile = path.join(BACKUP_DIR, `leaderboard_${timestamp}.json`);
            fs.copyFileSync(LEADERBOARD_FILE, backupFile);
            console.log(`Sauvegarde créée: ${backupFile}`);
        } catch (e) {
            console.error('Erreur de création de sauvegarde:', e);
        }
    },

    cleanOldBackups() {
        try {
            const files = fs.readdirSync(BACKUP_DIR);
            const now = moment();
            
            files.forEach(file => {
                if (file.startsWith('leaderboard_') && file.endsWith('.json')) {
                    const fileDate = moment(file.replace('leaderboard_', '').replace('.json', ''), 'YYYYMMDD_HHmmss');
                    if (now.diff(fileDate, 'hours') > 24) {
                        fs.unlinkSync(path.join(BACKUP_DIR, file));
                        console.log(`Sauvegarde expirée supprimée: ${file}`);
                    }
                }
            });
        } catch (e) {
            console.error('Erreur de nettoyage des sauvegardes:', e);
        }
    },

    getBackups() {
        try {
            return fs.readdirSync(BACKUP_DIR)
                .filter(file => file.startsWith('leaderboard_') && file.endsWith('.json'))
                .map(file => ({
                    filename: file,
                    timestamp: moment(file.replace('leaderboard_', '').replace('.json', ''), 'YYYYMMDD_HHmmss').format('LLL')
                }));
        } catch (e) {
            console.error('Erreur de liste des sauvegardes:', e);
            return [];
        }
    },

    restoreBackup(filename) {
        try {
            const backupFile = path.join(BACKUP_DIR, filename);
            if (fs.existsSync(backupFile)) {
                const backupData = JSON.parse(fs.readFileSync(backupFile));
                this.leaderboard = backupData;
                this.saveData();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Erreur de restauration:', e);
            return false;
        }
    },

    addAdmin(userId) {
        this.admins.add(String(userId));
        this.saveData(); // Sauvegarder immédiatement
        return `✅ Administrateur ${userId} ajouté avec succès`;
    },

    removeAdmin(userId) {
        // Empêcher la suppression du super admin
        if (String(userId) === SUPER_ADMIN_ID) {
            return `❌ Impossible de supprimer le super administrateur`;
        }
        
        if (this.admins.has(String(userId))) {
            this.admins.delete(String(userId));
            this.saveData(); // Sauvegarder immédiatement
            return `✅ Administrateur ${userId} supprimé avec succès`;
        } else {
            return `❌ L'utilisateur ${userId} n'est pas administrateur`;
        }
    },

    isAdmin(userId) {
        return this.admins.has(String(userId));
    },

    recordModeration(modo, quizId, date) {
        this.history.push({ modo, quizId, date });
        this.saveData();
    },

    getModoHistory() {
        return this.history;
    },

    addMergeMemory(originalName, mergedName) {
        const key = originalName.toLowerCase().trim();
        this.mergeMemory[key] = mergedName;
        this.saveData();
    },

    getMergedName(name) {
        const key = name.toLowerCase().trim();
        return this.mergeMemory[key] || null;
    },

    clearMergeMemory() {
        this.mergeMemory = {};
        this.saveData();
    }
};

// ===================== MODULE DE PARSING =====================
const parser = {
    parseQuizText(text) {
        const lines = text.split('\n');
        const result = { modo: null, participants: [], rubriques: [], modePoints: null };
        
        // Détection du modérateur dans tous les formats possibles
        for (const line of lines) {
            // Format avec points explicites: "MODO: NOM 250"
            const modoWithPointsMatch = line.match(/(?:MODO|MODÉRATEUR)\s*[:=]?\s*(.+?)\s+(\d+)/i);
            if (modoWithPointsMatch) {
                result.modo = modoWithPointsMatch[1].trim();
                result.modePoints = parseInt(modoWithPointsMatch[2]);
                break;
            }
            
            // Format avec emoji: ⚔️ MODO : nom ⚔️ (supports Unicode)
            const modoEmojiMatch = line.match(/⚔️\s*(?:MODO|MODÉRATEUR|𝗠𝗢𝗗𝗢|𝐌𝐎𝐃𝐎|𝑴𝑶𝑫𝑶|𝙼𝙾𝙳𝙾)\s*[:=]?\s*(.+?)\s*⚔️/i);
            if (modoEmojiMatch) {
                result.modo = modoEmojiMatch[1].trim();
                break;
            }
            
            // Format standard: MODO : nom ou MODO nom (même ligne) (supports Unicode)
            const modoStandardMatch = line.match(/(?:MODO|MODÉRATEUR|𝗠𝗢𝗗𝗢|𝐌𝐎𝐃𝐎|𝑴𝑶𝑫𝑶|𝙼𝙾𝙳𝙾)\s*[:=]?\s*(.+)/i);
            if (modoStandardMatch) {
                // Nettoyer le nom du modo en supprimant les caractères spéciaux de fin
                let modoName = modoStandardMatch[1].trim();
                // Supprimer les emojis et caractères spéciaux à la fin
                modoName = modoName.replace(/[⚔️🛡🔥💰🎯]+\s*$/, '').trim();
                result.modo = modoName;
                break;
            }
        }
        
        // Détection des rubriques (si pas de points explicites pour le modo)
        if (result.modePoints === null) {
            const rubriquePatterns = [
                // Patterns avec nombre de questions
                /^(ANAGRAMMES?)\s*(\d+)\s*Q?/i,
                /^(CAPITAL\s*PAYS?)\s*(\d+)\s*Q?/i,
                /^(VAURIEN)\s*(\d+)\s*Q?/i,
                /^(LP)\s*(\d+)\s*Q?/i,
                /^(CULTURE\s*G)\s*(\d+)\s*Q?/i,
                /^(HISTOIRE)\s*(\d+)\s*Q?/i,
                /^(GEOGRAPHIE)\s*(\d+)\s*Q?/i,
                /^(SPORT)\s*(\d+)\s*Q?/i,
                /^(SCIENCE)\s*(\d+)\s*Q?/i,
                /^(CINEMA)\s*(\d+)\s*Q?/i,
                /^(MUSIQUE)\s*(\d+)\s*Q?/i,
                /^([A-Z\s]+)\s*(\d+)\s*Q/i,
                
                // Patterns sans nombre de questions
                /^(ANAGRAMMES?)$/i,
                /^(ID)$/i,
                /^(CAPITAL\s*PAYS?)$/i,
                /^(VAURIEN)$/i,
                /^(LP)$/i,
                /^(CULTURE\s*G)$/i,
                /^(HISTOIRE)$/i,
                /^(GEOGRAPHIE)$/i,
                /^(SPORT)$/i,
                /^(SCIENCE)$/i,
                /^(CINEMA)$/i,
                /^(MUSIQUE)$/i,
                /^(ID)\s*(\d+)?$/i
            ];
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                
                if (!trimmedLine || trimmedLine.length < 2) continue;
                
                for (const pattern of rubriquePatterns) {
                    const match = trimmedLine.match(pattern);
                    if (match) {
                        const rubrique = match[1].trim();
                        const nbQuestions = match[2] ? parseInt(match[2]) : 1;
                        
                        if (!result.rubriques.find(r => r.name.toLowerCase() === rubrique.toLowerCase())) {
                            result.rubriques.push({ name: rubrique, questions: nbQuestions });
                        }
                        break;
                    }
                }
            }
        }
        
        const rubriqueNames = result.rubriques.map(r => r.name.toLowerCase());
        
        // Détection des participants avec support des nombres négatifs
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            let isRubrique = false;
            for (const rubrique of result.rubriques) {
                const rubriquePattern = new RegExp(`^${rubrique.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\d*\\s*Q?\\s*$`, 'i');
                if (rubriquePattern.test(trimmedLine)) {
                    isRubrique = true;
                    break;
                }
            }
            
            if (isRubrique) continue;
            
            // Pattern amélioré pour capturer les noms avec calculs mathématiques
            let participantMatch = null;
            
            // Pattern pour les calculs complexes: "NOM 190 P - 100 P : 90 P" ou "NOM 30 P + 300 P : 330 P"
            const complexCalculMatch = line.match(/(?:[🛡⚔️•▪▫▬●○◦‣⁃-]\s*)*-?\s*(?:@)?\s*([\w\sÀ-ÿ'.-]+?)\s+.*?(?:[:=]\s*(-?\d+)\s*P?)/i);
            
            if (complexCalculMatch) {
                let rawName = complexCalculMatch[1].trim();
                const finalPoints = parseInt(complexCalculMatch[2]); // Résultat final du calcul
                
                rawName = rawName.replace(/^[-•▪▫▬●○◦‣⁃_*~`\s]+|[-•▪▫▬●○◦‣⁃_*~`\s]+$/g, '').trim();
                
                const isRubriqueMatch = rubriqueNames.some(rubName => 
                    rawName.toLowerCase().includes(rubName) || rubName.includes(rawName.toLowerCase())
                );
                
                if (rawName && rawName.length >= 2 && !isNaN(finalPoints) && !isRubriqueMatch) {
                    // Vérifier la mémoire de merge
                    const mergedName = storage.getMergedName(rawName);
                    const finalName = mergedName || rawName;
                    
                    result.participants.push({ name: finalName, points: finalPoints, originalName: rawName });
                    
                    if (mergedName) {
                        console.log(`🔄 Auto-merge appliqué: ${rawName} → ${finalName}`);
                    }
                }
            } else {
                // Pattern simple: nom -40, nom 50, etc.
                participantMatch = line.match(/(?:[🛡⚔️•▪▫▬●○◦‣⁃-]\s*)*-?\s*(?:@)?\s*([\w\sÀ-ÿ'.-]+?)\s+(-?\d+)(?:\s|$)/i);
                
                if (participantMatch) {
                    let rawName = participantMatch[1].trim();
                    const points = parseInt(participantMatch[2]); // Peut être négatif
                    
                    rawName = rawName.replace(/^[-•▪▫▬●○◦‣⁃_*~`\s]+|[-•▪▫▬●○◦‣⁃_*~`\s]+$/g, '').trim();
                    
                    const isRubriqueMatch = rubriqueNames.some(rubName => 
                        rawName.toLowerCase().includes(rubName) || rubName.includes(rawName.toLowerCase())
                    );
                    
                    if (rawName && rawName.length >= 2 && !isNaN(points) && !isRubriqueMatch) {
                        // Vérifier la mémoire de merge
                        const mergedName = storage.getMergedName(rawName);
                        const finalName = mergedName || rawName;
                        
                        result.participants.push({ name: finalName, points, originalName: rawName });
                        
                        if (mergedName) {
                            console.log(`🔄 Auto-merge appliqué: ${rawName} → ${finalName}`);
                        }
                    }
                }
            }
        }
        
        return result;
    },

    parseLeaderboardText(text) {
        const lines = text.split('\n');
        const players = [];
        let currentCategory = null;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            // Format avec catégories (ancien format)
            const categoryMatch = trimmedLine.match(/^([🔴🟠🟡🟢🔵💠🟣🔥🛡🔞💰🥇🎂⛱️])\s*([\w\sÀ-ÿ'-]+)\s*\[([\d\s-]+)P?\]/i);
            if (categoryMatch) {
                currentCategory = categoryMatch[2].trim();
                continue;
            }
            
            // Nouveau format: "1- 57,781 SYD" ou "10- 10,560 YUMI – DARK"
            const newFormatMatch = trimmedLine.match(/^(\d+)-\s*([\d,]+)\s+(.+)$/);
            if (newFormatMatch) {
                const rank = parseInt(newFormatMatch[1]);
                const pointsStr = newFormatMatch[2].replace(/,/g, ''); // Supprimer les virgules
                const points = parseInt(pointsStr);
                const name = newFormatMatch[3].trim().toUpperCase();
                
                if (!isNaN(rank) && !isNaN(points) && name) {
                    players.push({
                        rank,
                        name,
                        points,
                        category: null, // Sera assignée automatiquement
                        joinDate: new Date().toISOString()
                    });
                }
                continue;
            }
            
            // Ancien format: "1. PLAYER 1000 P" (avec catégorie existante)
            const oldFormatMatch = trimmedLine.match(/^(\d+)\.\s*(.+?)\s+(\d+)\s*P?\s*(?:\(([^)]+)\))?/);
            if (oldFormatMatch && currentCategory) {
                const player = {
                    rank: parseInt(oldFormatMatch[1]),
                    name: oldFormatMatch[2].trim().toUpperCase(),
                    points: parseInt(oldFormatMatch[3]),
                    category: currentCategory,
                    lastQuiz: oldFormatMatch[4] || null,
                    joinDate: new Date().toISOString()
                };
                players.push(player);
            }
        }
        
        return players;
    }
};

// ===================== MODULE DE CLASSEMENT =====================
const leaderboard = {
    findPlayer(name) {
        const trimmedName = name.trim();
        const normalizedName = trimmedName.toUpperCase();
        
        // Chercher d'abord une correspondance exacte
        let player = storage.leaderboard.players.find(p => p.name === trimmedName);
        
        // Si pas trouvé, chercher en ignorant la casse
        if (!player) {
            player = storage.leaderboard.players.find(p => p.name.toUpperCase() === normalizedName);
        }
        
        return player;
    },

    addPointsToPlayer(name, points) {
        // Normaliser le nom (trim et uppercase pour uniformité)
        const normalizedName = name.trim().toUpperCase();
        
        // Chercher d'abord une correspondance exacte (sensible à la casse)
        let player = storage.leaderboard.players.find(p => p.name === name.trim());
        
        // Si pas trouvé, chercher en ignorant la casse
        if (!player) {
            player = storage.leaderboard.players.find(p => p.name.toUpperCase() === normalizedName);
        }
        
        if (player) {
            // Joueur existant trouvé - ajouter les points
            player.points += points;
            console.log(`Points ajoutés à ${player.name}: ${points > 0 ? '+' : ''}${points} (total: ${player.points})`);
        } else {
            // Nouveau joueur - utiliser le nom normalisé
            const newPlayer = {
                name: normalizedName,
                points,
                joinDate: new Date().toISOString()
            };
            storage.leaderboard.players.push(newPlayer);
            console.log(`Nouveau joueur créé: ${normalizedName} avec ${points} points`);
        }
    },

    addModeratorBonus(modoName, points) {
        if (modoName && points > 0) {
            this.addPointsToPlayer(modoName.toUpperCase(), points);
            return `⭐ Bonus de ${points} points ajouté à ${modoName}`;
        }
        return null;
    },

    sortLeaderboard() {
        storage.leaderboard.players.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return new Date(a.joinDate) - new Date(b.joinDate);
        });
    },

    assignRanks() {
        this.sortLeaderboard();
        storage.leaderboard.players.forEach((player, index) => {
            player.rank = index + 1;
            player.category = this.getCategory(player.points);
        });
    },

    getCategory(points) {
        return CATEGORIES.find(cat => points >= cat.min && points <= cat.max);
    },

    updateLeaderboard(quizData, quizId, date) {
        const changes = [];
        
        // Ajouter les participants
        quizData.participants.forEach(({ name, points }) => {
            const before = this.findPlayer(name)?.points || 0;
            this.addPointsToPlayer(name, points);
            const after = before + points;
            changes.push({ name, before, after, points });
        });
        
        // Ajouter le bonus modo
        let modoPoints = 0;
        if (quizData.modePoints !== null) {
            // Points explicites dans le quiz
            modoPoints = quizData.modePoints;
        } else if (quizData.rubriques.length > 0) {
            // Calcul automatique : 50 points par rubrique
            modoPoints = quizData.rubriques.length * 50;
        }
        
        const modoBonus = this.addModeratorBonus(quizData.modo, modoPoints);
        if (modoBonus) changes.push(modoBonus);
        
        // Mettre à jour les rangs
        this.assignRanks();
        
        // Enregistrer l'historique
        if (quizData.modo) {
            storage.recordModeration(quizData.modo, quizId, date);
        }
        
        // Sauvegarder et créer une sauvegarde
        storage.saveData();
        storage.createBackup();
        storage.cleanOldBackups();
        
        return changes;
    },

    setLeaderboardData(players) {
        storage.leaderboard.players = players;
        this.assignRanks();
        storage.saveData();
        storage.createBackup();
        return true;
    }
};

// ===================== MODULE DE DÉTECTION DE DOUBLONS =====================
const duplicateDetector = {
    // Calcule la distance de Levenshtein entre deux chaînes
    levenshteinDistance(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;

        for (let i = 0; i <= len2; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len1; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len2; i++) {
            for (let j = 1; j <= len1; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[len2][len1];
    },

    // Calcule le pourcentage de similarité entre deux chaînes
    calculateSimilarity(str1, str2) {
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 100;
        
        const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        return ((maxLength - distance) / maxLength) * 100;
    },

    // Vérifie si un nom est contenu dans un autre
    isSubstring(str1, str2) {
        const lower1 = str1.toLowerCase();
        const lower2 = str2.toLowerCase();
        return lower1.includes(lower2) || lower2.includes(lower1);
    },

    // Vérifie si deux noms partagent un préfixe/suffixe commun
    hasCommonPrefixSuffix(str1, str2, minLength = 3) {
        const lower1 = str1.toLowerCase();
        const lower2 = str2.toLowerCase();
        
        // Préfixe commun
        let prefixLength = 0;
        for (let i = 0; i < Math.min(lower1.length, lower2.length); i++) {
            if (lower1[i] === lower2[i]) {
                prefixLength++;
            } else {
                break;
            }
        }
        
        // Suffixe commun
        let suffixLength = 0;
        for (let i = 1; i <= Math.min(lower1.length, lower2.length); i++) {
            if (lower1[lower1.length - i] === lower2[lower2.length - i]) {
                suffixLength++;
            } else {
                break;
            }
        }
        
        return prefixLength >= minLength || suffixLength >= minLength;
    },

    // Normalise un nom (supprime les caractères spéciaux, espaces, etc.)
    normalizeName(name) {
        return name.replace(/[^a-zA-Z0-9À-ÿ]/g, '').toLowerCase();
    },

    // Détecte les doublons potentiels dans la liste des joueurs
    detectDuplicates() {
        const players = storage.leaderboard.players;
        const duplicateGroups = [];
        const processed = new Set();

        for (let i = 0; i < players.length; i++) {
            if (processed.has(i)) continue;
            
            const currentPlayer = players[i];
            const currentName = currentPlayer.name;
            const normalizedCurrent = this.normalizeName(currentName);
            
            const similarPlayers = [currentPlayer];
            
            for (let j = i + 1; j < players.length; j++) {
                if (processed.has(j)) continue;
                
                const otherPlayer = players[j];
                const otherName = otherPlayer.name;
                const normalizedOther = this.normalizeName(otherName);
                
                // Critères de similarité
                const similarity = this.calculateSimilarity(normalizedCurrent, normalizedOther);
                const isSubstr = this.isSubstring(currentName, otherName);
                const hasCommonPart = this.hasCommonPrefixSuffix(normalizedCurrent, normalizedOther);
                
                // Seuils de détection
                const isSimilar = similarity >= 70 || // 70% de similarité
                                 isSubstr || // Un nom contient l'autre
                                 hasCommonPart || // Préfixe/suffixe commun
                                 normalizedCurrent === normalizedOther; // Identiques après normalisation
                
                if (isSimilar) {
                    similarPlayers.push(otherPlayer);
                    processed.add(j);
                }
            }
            
            if (similarPlayers.length > 1) {
                duplicateGroups.push({
                    players: similarPlayers,
                    totalPoints: similarPlayers.reduce((sum, p) => sum + p.points, 0)
                });
            }
            
            processed.add(i);
        }
        
        return duplicateGroups;
    },

    // Formate le rapport de doublons
    formatDuplicateReport(duplicateGroups) {
        if (duplicateGroups.length === 0) {
            return "✅ AUCUN DOUBLON DÉTECTÉ\n\nTous les noms semblent uniques dans le classement.";
        }

        let report = `🔍 DOUBLONS POTENTIELS DÉTECTÉS\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `📊 ${duplicateGroups.length} groupe(s) de noms similaires trouvé(s)\n\n`;

        duplicateGroups.forEach((group, index) => {
            const sortedPlayers = group.players.sort((a, b) => b.points - a.points);
            const mainPlayer = sortedPlayers[0];
            
            report += `🔸 GROUPE ${index + 1}:\n`;
            report += `🎯 Joueur principal suggéré: ${mainPlayer.name} (${mainPlayer.points.toLocaleString()} pts)\n`;
            report += `💰 Points totaux du groupe: ${group.totalPoints.toLocaleString()}\n`;
            report += `👥 Comptes similaires:\n`;
            
            sortedPlayers.forEach(player => {
                const status = player === mainPlayer ? " 👑 PRINCIPAL" : " 📥 À fusionner";
                report += `   • ${player.name} - ${player.points.toLocaleString()} pts - Rang #${player.rank}${status}\n`;
            });
            
            // Génère la commande merge suggérée
            const prefix = botConfig.commandPrefix;
            const mergeCommand = `${prefix}merge ${sortedPlayers.map(p => p.name).join(' ')}`;
            report += `⚡ Commande suggérée: ${mergeCommand}\n\n`;
        });

        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `💡 Utilisez ${botConfig.commandPrefix}merge [noms] pour fusionner les comptes\n`;
        report += `⚠️ Vérifiez manuellement avant de fusionner!`;

        return report;
    }
};

// ===================== MODULE DE FORMATAGE =====================
const formatter = {
    formatLeaderboard() {
        let output = `---🏆 VEƝI🌿VIƊI🌿VIĆI 🏆---\n\n🪽CLASSEMENT DU GROUPE 🪽\n   ⭐️⭐️⭐️JACKPOT ⭐️⭐️⭐️\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n`;
        
        CATEGORIES.forEach(category => {
            const players = storage.leaderboard.players
                .filter(p => p.category?.name === category.name)
                .sort((a, b) => a.rank - b.rank);
            
            if (players.length > 0) {
                output += `${category.emoji}${category.name} [${category.min.toLocaleString()}-${category.max.toLocaleString()} P]\n`;
                output += "-\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n";
                
                players.forEach(player => {
                    const pointsFormatted = player.points.toLocaleString().padStart(6, ' ');
                    output += `-${player.rank}- ${pointsFormatted} - ${player.name}\n`;
                });
                
                output += "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n";
            }
            
            if (category.reward) {
                output += `${category.reward}\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n`;
            }
        });
        
        output += `\n⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️\nŠI VIS PACÈM, PARÁ BELLƯM\n⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️`;
        return output;
    },

    formatUpdateReport(changes, quizId) {
        let report = `📊 MISE À JOUR DU QUIZ: ${quizId}\n\n`;
        const categoryChanges = [];
        
        changes.forEach(change => {
            if (typeof change === 'string') {
                report += `${change}\n`;
            } else {
                const { name, before, after, points } = change;
                const player = leaderboard.findPlayer(name);
                
                // Détecter les changements de catégorie
                const beforeCat = leaderboard.getCategory(before)?.name;
                const afterCat = leaderboard.getCategory(after)?.name;
                
                if (beforeCat && afterCat && beforeCat !== afterCat) {
                    categoryChanges.push(`🚀 ${name} est passé de ${beforeCat} à ${afterCat}`);
                }
                
                const pointsDisplay = points > 0 ? `+${points}` : `${points}`;
                report += `➤ ${name}: ${before} → ${after} (${pointsDisplay})\n`;
            }
        });
        
        if (categoryChanges.length > 0) {
            report += `\n🎯 CHANGEMENTS DE CATÉGORIE:\n${categoryChanges.join('\n')}`;
        }
        
        return report;
    },

    formatPlayerInfo(playerName) {
        const player = leaderboard.findPlayer(playerName.toUpperCase());
        if (!player) return `❌ Joueur "${playerName}" introuvable`;
        
        return `👤 ${player.name}\n🏆 Rang: ${player.rank}\n⭐ Points: ${player.points.toLocaleString()}\n📌 Catégorie: ${player.category.emoji} ${player.category.name}`;
    }
};

// ===================== MODULE DE COMMANDES =====================
const commands = {
    // Commande pour changer le préfixe
    setPrefix(prefix, userId) {
        if (!storage.isAdmin(userId)) {
            return "❌ Seuls les administrateurs peuvent changer le préfixe des commandes.";
        }
        
        if (!prefix || prefix.length > 3) {
            return "❌ Le préfixe doit faire entre 1 et 3 caractères.";
        }
        
        botConfig.commandPrefix = prefix;
        storage.saveData();
        return `✅ Préfixe des commandes changé pour: ${prefix}`;
    },

    // Commande kick pour supprimer un membre du groupe
    kickUser(threadID, mentionedUsers, adminId) {
        if (!storage.isAdmin(adminId)) {
            return "❌ Seuls les administrateurs peuvent utiliser cette commande.";
        }

        if (!mentionedUsers || mentionedUsers.length === 0) {
            return `❌ Vous devez mentionner un utilisateur à expulser.\nUsage: ${botConfig.commandPrefix}kick @utilisateur`;
        }

        const userToKick = mentionedUsers[0];
        
        // Empêcher de kick le super admin
        if (userToKick === SUPER_ADMIN_ID) {
            return "❌ Impossible d'expulser le super administrateur.";
        }

        // Empêcher de se kick soi-même
        if (userToKick === adminId) {
            return "❌ Vous ne pouvez pas vous expulser vous-même.";
        }

        try {
            // Expulser l'utilisateur du groupe
            api.removeUserFromGroup(userToKick, threadID, (err) => {
                if (err) {
                    console.error('Erreur lors de l\'expulsion:', err);
                    api.sendMessage("❌ Erreur lors de l'expulsion de l'utilisateur.", threadID);
                } else {
                    // Message de kick personnalisé
                    const kickMessage = `━━━━━━━◇◆◇━━━━━━━
  
𝘓𝘦𝘴 𝘧𝘭𝘢𝘮𝘮𝘦𝘴 𝘪𝘯𝘤𝘢𝘯𝘥𝘦𝘴𝘤𝘦𝘯𝘵𝘦𝘴 𝘴𝘰𝘯𝘵 𝘭𝘦 𝘴𝘰𝘶𝘧𝘧𝘭𝘦 𝘥𝘦 𝘭'𝘢̂𝘮𝘦. 𝘓𝘢 𝘧𝘶𝘮𝘦́𝘦 𝘯𝘰𝘪𝘳𝘦 𝘭𝘪𝘣𝘦̀𝘳𝘦 𝘭𝘦𝘴 𝘢̂𝘮𝘦𝘴. 𝘗𝘰𝘶𝘴𝘴𝘪𝘦̀𝘳𝘦 𝘵𝘶 𝘳𝘦𝘥𝘦𝘷𝘪𝘦𝘯𝘴 𝘱𝘰𝘶𝘴𝘴𝘪𝘦̀𝘳𝘦, 𝘦𝘵 𝘵𝘰𝘯 𝘢̂𝘮𝘦 𝘥𝘦́𝘭𝘪𝘷𝘳𝘦́𝘦 𝘳𝘦𝘵𝘰𝘶𝘳𝘯𝘦𝘳𝘢 𝘥𝘢𝘯𝘴 𝘭𝘦𝘴 𝘧𝘭𝘢𝘮𝘮𝘦𝘴 𝘢𝘳𝘥𝘦𝘯𝘵𝘦𝘴. 𝙇𝙖𝙩𝙪𝙢.
 
━━━━━━━◇◆◇━━━━━━━`;
                    
                    setTimeout(() => {
                        api.sendMessage(kickMessage, threadID);
                    }, 1000);
                }
            });
            
            return null; // Pas de réponse immédiate, gérée dans le callback
        } catch (error) {
            console.error('Erreur kick:', error);
            return "❌ Erreur lors de l'expulsion de l'utilisateur.";
        }
    },

    // Commande pour obtenir des informations sur le groupe
    getGroupInfo(threadID, adminId) {
        if (!storage.isAdmin(adminId)) {
            return "❌ Seuls les administrateurs peuvent voir les informations du groupe.";
        }

        return new Promise((resolve) => {
            api.getThreadInfo(threadID, (err, info) => {
                if (err) {
                    console.error('Erreur getThreadInfo:', err);
                    resolve("❌ Impossible de récupérer les informations du groupe.");
                    return;
                }

                const memberCount = info.participantIDs ? info.participantIDs.length : 0;
                const adminList = Array.from(storage.admins).slice(0, 10).join(', ');
                const hasMoreAdmins = storage.admins.size > 10;
                
                let response = `📊 **INFORMATIONS DU GROUPE**\n\n`;
                response += `🏷️ **Nom:** ${info.threadName || 'Non défini'}\n`;
                response += `👥 **Membres:** ${memberCount}\n`;
                response += `🆔 **ID du groupe:** ${threadID}\n`;
                response += `👑 **Administrateurs du bot:** ${storage.admins.size}\n`;
                response += `📝 **Liste des admins:** ${adminList}${hasMoreAdmins ? '...' : ''}\n`;
                response += `⚙️ **Préfixe:** ${botConfig.commandPrefix}\n`;
                response += `📅 **Type:** ${info.isGroup ? 'Groupe' : 'Chat privé'}`;

                resolve(response);
            });
        });
    },

    // Commande ping
    ping() {
        const uptimeSeconds = Math.floor(process.uptime());
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        
        return `🏓 **Pong!**\n\n⚡ **Latence:** Instantanée\n⏰ **Uptime:** ${hours}h ${minutes}m ${seconds}s\n✅ **Statut:** En ligne et opérationnel`;
    },

    // Commande pour obtenir le statut détaillé du bot
    getBotStatus() {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const playerCount = storage.leaderboard.players.length;
        const adminCount = storage.admins.size;
        const mergeCount = Object.keys(storage.mergeMemory).length;
        const historyCount = storage.history.length;
        const backupCount = storage.getBackups().length;
        
        return `🤖 **STATUT DÉTAILLÉ DU BOT V.V.V**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ **Temps d'activité:** ${hours}h ${minutes}m ${seconds}s
📊 **Préfixe des commandes:** ${botConfig.commandPrefix}
🆔 **Super Admin:** ${SUPER_ADMIN_ID}

👥 **Base de données:**
   • Joueurs enregistrés: ${playerCount}
   • Administrateurs: ${adminCount}
   • Merges en mémoire: ${mergeCount}
   • Historique modérations: ${historyCount}
   • Sauvegardes disponibles: ${backupCount}

⚙️ **Configuration:**
   • Auto-accept friends: ${botConfig.autoAcceptFriends ? '✅' : '❌'}
   • Logging activé: ${botConfig.enableLogging ? '✅' : '❌'}

🚀 **Fonctionnalités actives:**
   ✅ Traitement automatique des quiz
   ✅ Gestion complète du classement
   ✅ Support des scores négatifs
   ✅ Mémoire des noms fusionnés
   ✅ Détection intelligente de doublons
   ✅ Commandes administrateur avancées
   ✅ Système de kick/expulsion

🏆 **Version:** V.V.V Facebook Bot v2.1
💙 **Développé exclusivement pour V.V.V**`;
    },

    // Amélioration de la commande addAdmin avec support des mentions
    addAdmin(mentionedUsers, adminId, userIdFromText = null) {
        if (adminId !== SUPER_ADMIN_ID) {
            return "❌ Seuls le super administrateur peut ajouter des administrateurs.";
        }

        let userToAdd = null;

        // Priorité aux mentions
        if (mentionedUsers && mentionedUsers.length > 0) {
            userToAdd = mentionedUsers[0];
        } else if (userIdFromText) {
            // Fallback sur l'ID fourni en texte
            userToAdd = userIdFromText;
        }

        if (!userToAdd) {
            return `❌ Veuillez mentionner un utilisateur ou fournir un ID.\nUsage: ${botConfig.commandPrefix}ajouteradmin @utilisateur\nOu: ${botConfig.commandPrefix}ajouteradmin [userID]`;
        }

        if (storage.admins.has(String(userToAdd))) {
            return "❌ Cet utilisateur est déjà administrateur.";
        }

        const result = storage.addAdmin(userToAdd);
        return `${result}\n🎉 Nouvel administrateur ajouté avec succès!`;
    },

    // Commande pour lister les administrateurs
    listAdmins(userId) {
        if (!storage.isAdmin(userId)) {
            return "❌ Seuls les administrateurs peuvent voir la liste des administrateurs.";
        }

        const adminArray = Array.from(storage.admins);
        
        let response = `👑 **LISTE DES ADMINISTRATEURS**\n\n`;
        response += `📊 **Total:** ${adminArray.length} administrateur(s)\n\n`;
        
        adminArray.forEach((adminId, index) => {
            const isSuperAdmin = adminId === SUPER_ADMIN_ID;
            const prefix = isSuperAdmin ? "👑" : "⚡";
            const suffix = isSuperAdmin ? " (Super Admin)" : "";
            response += `${prefix} ${adminId}${suffix}\n`;
        });

        return response;
    },

    // Menu d'aide adapté selon le format spécifié
    help() {
        const prefix = botConfig.commandPrefix;
        return `🏆 BOT DE CLASSEMENT V.V.V v2.0 🏆
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Conçu exclusivement pour le groupe V.V.V
👤 Développé par Izumi Hearthcliff 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 COMMANDES GÉNÉRALES:
🔹 ${prefix}menu - Affiche ce menu d'aide
🔹 ${prefix}classement - Affiche le classement complet
🔹 ${prefix}top [n] - Affiche le top N (défaut: top 10)
🔹 ${prefix}position [nom] - Position d'un joueur
🔹 ${prefix}statut - Vos informations personnelles
🔹 ${prefix}ping - Test de connectivité
🔹 ${prefix}status - Statut détaillé du bot

🎌 COMMANDES ANILIST:
🔸 ${prefix}anime [nom] - Rechercher un anime
🔸 ${prefix}manga [nom] - Rechercher un manga
🔸 ${prefix}trending [nombre] - Tendances (10 anime + 10 manga par défaut)
🔸 ${prefix}airing - Animes en cours de diffusion
🔸 ${prefix}random [anime/manga] - Découverte aléatoire
🔸 ${prefix}character [nom] - Info personnage
🔸 ${prefix}animetop / mangatop - Top 10 mieux notés
🔸 ${prefix}season [année] [saison] - Animes saisonniers
🔸 ${prefix}genres - Liste tous les genres
🔸 ${prefix}genre [nom] [type] - Recherche par genre
🔸 ${prefix}search [terme] - Recherche globale
🔸 ${prefix}recommendations [anime] - Recommandations
🔸 ${prefix}anistats - Statistiques AniList

📊 HISTORIQUE & SAUVEGARDES:
🔹 ${prefix}historiquemodo - Historique des modérations
🔹 ${prefix}sauvegardes - Liste des sauvegardes
🔹 ${prefix}restaurer [fichier] - Restaurer une sauvegarde

⚙️ COMMANDES ADMINISTRATEUR:
🔸 ${prefix}ajouteradmin @user - Ajouter un admin
🔸 ${prefix}supprimeradmin [id] - Retirer un admin
🔸 ${prefix}listadmins - Liste des administrateurs
🔸 ${prefix}add @user / [userID] - Ajouter membre au groupe
🔸 ${prefix}kick @user - Expulser un membre
🔸 ${prefix}deleted - Messages supprimés récents
🔸 ${prefix}deletionstats - Statistiques suppressions
🔸 ${prefix}groupinfo - Infos du groupe
🔸 ${prefix}botinfo - Informations techniques
🔸 ${prefix}version - Version du bot
🔸 ${prefix}uptime - Temps d'activité
🔸 ${prefix}health - Vérification santé
🔸 ${prefix}setclassement - Définir classement initial
🔸 ${prefix}merge [nom1] [nom2] ... - Fusionner les comptes
🔸 ${prefix}detecterdoublons - Détecter les noms similaires
🔸 Envoyez un quiz pour mise à jour automatique

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 NOUVEAUTÉS v2.0: AniList + Gestion avancée 🌟
🌟 VEƝI🌿VIƊI🌿VIĆI - V.V.V 🌟`;
    },

    // Alias pour le menu
    menu() {
        return this.help();
    },

    // Traitement des quiz avec support des nombres négatifs
    processQuiz(text, userId) {
        if (!storage.isAdmin(userId)) {
            return "❌ Seuls les administrateurs peuvent traiter les quiz.";
        }

        const quizData = parser.parseQuizText(text);
        
        if (!quizData.modo && quizData.participants.length === 0) {
            return "❌ Aucun modérateur ou participant détecté dans ce texte.";
        }

        let response = "📊 **QUIZ TRAITÉ AVEC SUCCÈS** 📊\n\n";
        
        if (quizData.modo) {
            response += `⚔️ **Modérateur:** ${quizData.modo}`;
            if (quizData.modePoints !== null) {
                response += ` (+${quizData.modePoints} points)`;
            }
            response += "\n\n";
        }

        if (quizData.participants.length > 0) {
            response += `👥 **Participants (${quizData.participants.length}):**\n`;
            quizData.participants.forEach(p => {
                const pointsDisplay = p.points > 0 ? `+${p.points}` : `${p.points}`;
                const mergeInfo = p.originalName && p.originalName !== p.name ? ` (fusionné: ${p.originalName})` : '';
                response += `• ${p.name}: ${pointsDisplay} points${mergeInfo}\n`;
            });
            response += "\n";
        }

        if (quizData.rubriques.length > 0) {
            response += `📚 **Rubriques détectées (${quizData.rubriques.length}):**\n`;
            quizData.rubriques.forEach(r => {
                response += `• ${r.name} (${r.questions} question(s))\n`;
            });
            response += "\n";
        }

        // Auto-traitement du quiz pour les admins
        const quizId = `QUIZ_${Date.now()}`;
        const changes = leaderboard.updateLeaderboard(quizData, quizId, moment().format('DD/MM/YYYY'));
        
        response += "✅ **CLASSEMENT MIS À JOUR AUTOMATIQUEMENT**\n\n";
        response += formatter.formatUpdateReport(changes, quizId);

        return response;
    },

    // Fusionner des noms avec mémoire
    merge(oldName, newName, userId) {
        if (!storage.isAdmin(userId)) {
            return "❌ Seuls les administrateurs peuvent fusionner des comptes.";
        }

        const oldPlayer = leaderboard.findPlayer(oldName);
        const newPlayer = leaderboard.findPlayer(newName);

        if (!oldPlayer) {
            return `❌ Joueur "${oldName}" introuvable.`;
        }

        if (!newPlayer) {
            return `❌ Joueur "${newName}" introuvable.`;
        }

        // Fusionner les points
        const totalPoints = oldPlayer.points + newPlayer.points;
        newPlayer.points = totalPoints;

        // Supprimer l'ancien joueur
        const index = storage.leaderboard.players.findIndex(p => p.name === oldPlayer.name);
        if (index !== -1) {
            storage.leaderboard.players.splice(index, 1);
        }

        // Ajouter à la mémoire de merge
        storage.addMergeMemory(oldName, newName);

        // Mettre à jour les rangs
        leaderboard.assignRanks();
        storage.saveData();

        return `✅ Fusion réussie: ${oldName} (${oldPlayer.points}) + ${newName} (${newPlayer.points - oldPlayer.points}) = ${newName} (${totalPoints})`;
    },

    // Afficher l'historique des merges
    showMergeHistory(userId) {
        if (!storage.isAdmin(userId)) {
            return "❌ Seuls les administrateurs peuvent voir l'historique des merges.";
        }

        const mergeMemory = storage.mergeMemory;
        const entries = Object.entries(mergeMemory);

        if (entries.length === 0) {
            return "📝 Aucun historique de merge trouvé.";
        }

        let response = "📋 **HISTORIQUE DES MERGES**\n\n";
        entries.forEach(([original, merged], index) => {
            response += `${index + 1}. ${original} → ${merged}\n`;
        });

        return response;
    },

    // Vider la mémoire de merge
    clearMergeHistory(userId) {
        if (!storage.isAdmin(userId)) {
            return "❌ Seuls les administrateurs peuvent vider l'historique des merges.";
        }

        storage.clearMergeMemory();
        return "✅ Mémoire de merge vidée avec succès.";
    },

    // Afficher le classement
    showLeaderboard(limit = null) {
        if (storage.leaderboard.players.length === 0) {
            return "📊 Le classement est vide.";
        }

        if (limit) {
            const players = storage.leaderboard.players.slice(0, limit);
            let response = `🏆 **TOP ${limit}** 🏆\n\n`;
            players.forEach((player, index) => {
                response += `${index + 1}. ${player.name} - ${player.points.toLocaleString()} pts\n`;
            });
            return response;
        }

        return formatter.formatLeaderboard();
    },

    // Obtenir la catégorie d'un joueur
    getPlayerCategory(points) {
        const category = leaderboard.getCategory(points);
        return category ? `${category.emoji} ${category.name}` : "❓ Catégorie inconnue";
    },

    // Commande pour définir un classement initial
    setLeaderboard(userId, threadID) {
        if (userId !== SUPER_ADMIN_ID) {
            return "❌ Commande réservée au super-admin.";
        }
        
        api.sendMessage("📋 Veuillez envoyer le classement actuel au format texte dans le prochain message", threadID);
        
        // Marquer qu'on attend un classement
        this.waitingForLeaderboard = { userId, threadID };
        return null;
    },

    // Traiter le classement reçu
    processLeaderboardInput(text, userId, threadID) {
        if (!this.waitingForLeaderboard || 
            this.waitingForLeaderboard.userId !== userId || 
            this.waitingForLeaderboard.threadID !== threadID) {
            return null;
        }

        try {
            const players = parser.parseLeaderboardText(text);
            if (players.length > 0) {
                leaderboard.setLeaderboardData(players);
                this.waitingForLeaderboard = null;
                
                const leaderboardText = commands.showLeaderboard();
                setTimeout(() => {
                    if (leaderboardText.length > 2000) {
                        const chunks = splitMessage(leaderboardText, 2000);
                        chunks.forEach((chunk, index) => {
                            setTimeout(() => {
                                api.sendMessage(chunk, threadID);
                            }, index * 1000);
                        });
                    } else {
                        api.sendMessage(leaderboardText, threadID);
                    }
                }, 500);
                
                return "✅ Classement initial défini avec succès!";
            } else {
                this.waitingForLeaderboard = null;
                return "❌ Aucun joueur trouvé dans le classement. Vérifiez le format.";
            }
        } catch (e) {
            this.waitingForLeaderboard = null;
            return `❌ Erreur de traitement: ${e.message}`;
        }
    },

    // Historique des modérations
    getModerationHistory(userId) {
        if (!storage.isAdmin(userId)) {
            return "❌ Seuls les administrateurs peuvent voir l'historique des modérations.";
        }

        const history = storage.getModoHistory();
        if (history.length === 0) {
            return "📜 Aucun historique de modération trouvé.";
        }

        let response = "📜 **HISTORIQUE DES MODÉRATIONS**\n\n";
        history.slice(-20).forEach((record, index) => {
            response += `${index + 1}. ${record.modo} - ${record.quizId} (${record.date})\n`;
        });

        if (history.length > 20) {
            response += `\n... et ${history.length - 20} autres entrées plus anciennes`;
        }

        return response;
    },

    // Liste des sauvegardes
    getBackupsList(userId) {
        if (!storage.isAdmin(userId)) {
            return "❌ Seuls les administrateurs peuvent voir les sauvegardes.";
        }

        const backups = storage.getBackups();
        if (backups.length === 0) {
            return "❌ Aucune sauvegarde disponible.";
        }

        let response = "📂 **SAUVEGARDES DISPONIBLES:**\n\n";
        backups.forEach((backup, index) => {
            response += `${index + 1}. ${backup.filename}\n   📅 ${backup.timestamp}\n\n`;
        });

        response += `💡 Utilisez ${botConfig.commandPrefix}restaurer [nom_fichier] pour restaurer une sauvegarde`;
        return response;
    },

    // Restaurer une sauvegarde
    restoreFromBackup(filename, userId) {
        if (!storage.isAdmin(userId)) {
            return "❌ Seuls les administrateurs peuvent restaurer des sauvegardes.";
        }

        if (!filename) {
            return `❌ Usage: ${botConfig.commandPrefix}restaurer [nom_fichier]`;
        }

        if (storage.restoreBackup(filename)) {
            return `✅ Classement restauré à partir de ${filename}`;
        } else {
            return "❌ Échec de la restauration. Fichier introuvable ou invalide.";
        }
    },

    // Informations personnelles d'un utilisateur
    getUserStatus(userId) {
        // Pour Facebook, on ne peut pas facilement obtenir le nom d'utilisateur
        // donc on demande à l'utilisateur de spécifier le nom
        return `🔍 Pour connaître votre position, utilisez: ${botConfig.commandPrefix}ma_position [votre_nom]

💡 Exemple: ${botConfig.commandPrefix}ma_position JOHN`;
    },

    // Commande merge avancée avec parsing intelligent
    advancedMerge(input, userId) {
        if (!storage.isAdmin(userId)) {
            return "❌ Seuls les administrateurs peuvent fusionner des comptes.";
        }

        // Parsing intelligent pour gérer les noms composés
        let playerNames = [];
        
        if (input.includes(',')) {
            // Séparation par virgules
            playerNames = input.split(',').map(name => name.trim().toUpperCase()).filter(name => name);
        } else {
            // Séparation par espaces avec détection intelligente
            const words = input.split(/\s+/);
            
            if (words.length <= 3) {
                playerNames = words.map(name => name.trim().toUpperCase()).filter(name => name);
            } else {
                // Logique avancée pour détecter les noms composés
                const allPlayers = storage.leaderboard.players.map(p => p.name);
                const potentialNames = [];
                
                // Essayer toutes les combinaisons possibles
                for (let i = 0; i < words.length; i++) {
                    for (let j = i + 1; j <= words.length; j++) {
                        const candidateName = words.slice(i, j).join(' ').toUpperCase();
                        
                        if (allPlayers.some(playerName => playerName === candidateName)) {
                            potentialNames.push({
                                name: candidateName,
                                startIndex: i,
                                endIndex: j,
                                length: j - i
                            });
                        }
                    }
                }
                
                // Prioriser les noms les plus longs
                potentialNames.sort((a, b) => b.length - a.length);
                
                // Sélectionner sans chevauchement
                const selectedNames = [];
                const usedIndices = new Set();
                
                for (const candidate of potentialNames) {
                    let hasOverlap = false;
                    for (let k = candidate.startIndex; k < candidate.endIndex; k++) {
                        if (usedIndices.has(k)) {
                            hasOverlap = true;
                            break;
                        }
                    }
                    
                    if (!hasOverlap) {
                        selectedNames.push(candidate.name);
                        for (let k = candidate.startIndex; k < candidate.endIndex; k++) {
                            usedIndices.add(k);
                        }
                    }
                }
                
                // Traiter les mots restants
                for (let i = 0; i < words.length; i++) {
                    if (!usedIndices.has(i)) {
                        const singleName = words[i].toUpperCase();
                        if (allPlayers.some(playerName => playerName === singleName)) {
                            selectedNames.push(singleName);
                        }
                    }
                }
                
                playerNames = selectedNames;
                
                // Fallback à la méthode simple
                if (playerNames.length < 2) {
                    playerNames = words.map(name => name.trim().toUpperCase()).filter(name => name);
                }
            }
        }
        
        if (playerNames.length < 2) {
            return `❌ Usage: ${botConfig.commandPrefix}merge [nom1] [nom2] [nom3] ...

Exemples:
• ${botConfig.commandPrefix}merge RYOMEN, RYOMEN SK
• ${botConfig.commandPrefix}merge PLAYER1 PLAYER2 PLAYER3

Le premier nom sera le compte principal qui recevra tous les points.`;
        }

        const mainPlayerName = playerNames[0];
        const playersToMerge = playerNames.slice(1);
        
        // Vérifier l'existence des joueurs
        const existingPlayers = [];
        const missingPlayers = [];
        
        [mainPlayerName, ...playersToMerge].forEach(name => {
            const player = leaderboard.findPlayer(name);
            if (player) {
                existingPlayers.push(player);
            } else {
                missingPlayers.push(name);
            }
        });

        if (missingPlayers.length > 0) {
            return `❌ Joueurs introuvables: ${missingPlayers.join(', ')}

💡 Noms détectés: ${playerNames.join(', ')}
📋 Utilisez les noms exactement comme ils apparaissent dans le classement.`;
        }

        const mainPlayer = leaderboard.findPlayer(mainPlayerName);
        let totalMergedPoints = 0;
        const mergeReport = [];
        
        // Processus de fusion
        playersToMerge.forEach(playerName => {
            const playerToMerge = leaderboard.findPlayer(playerName);
            if (playerToMerge) {
                totalMergedPoints += playerToMerge.points;
                mergeReport.push(`📥 ${playerName}: ${playerToMerge.points.toLocaleString()} pts`);
                
                // Ajouter à la mémoire de merge
                storage.addMergeMemory(playerName, mainPlayerName);
                
                // Supprimer le joueur
                const playerIndex = storage.leaderboard.players.findIndex(p => p.name === playerName);
                if (playerIndex !== -1) {
                    storage.leaderboard.players.splice(playerIndex, 1);
                }
            }
        });

        if (totalMergedPoints === 0) {
            return "❌ Aucun point à fusionner.";
        }

        // Ajouter les points au joueur principal
        const beforePoints = mainPlayer.points;
        mainPlayer.points += totalMergedPoints;
        
        // Réassigner les rangs
        leaderboard.assignRanks();
        storage.saveData();
        storage.createBackup();

        // Détection de changement de catégorie
        const beforeCat = leaderboard.getCategory(beforePoints)?.name;
        const afterCat = leaderboard.getCategory(mainPlayer.points)?.name;
        const categoryChange = (beforeCat !== afterCat) ? 
            `\n🚀 ${mainPlayerName} est passé de ${beforeCat} à ${afterCat}!` : '';

        // Rapport de fusion
        let response = `🔄 **FUSION DE COMPTES RÉUSSIE!**\n\n`;
        response += `🎯 Compte principal: ${mainPlayerName}\n`;
        response += `📊 Points avant fusion: ${beforePoints.toLocaleString()}\n`;
        response += `📊 Points après fusion: ${mainPlayer.points.toLocaleString()}\n`;
        response += `🏆 Nouveau rang: #${mainPlayer.rank}\n\n`;
        response += `📥 **COMPTES FUSIONNÉS:**\n${mergeReport.join('\n')}\n\n`;
        response += `➕ Total des points ajoutés: ${totalMergedPoints.toLocaleString()}${categoryChange}`;

        // Enregistrer dans l'historique
        storage.recordModeration(
            `ADMIN-MERGE`,
            `MERGE-${Date.now()}`,
            moment().format('DD/MM/YYYY')
        );

        return response;
    }
};

// ===================== GESTION DES SESSIONS DE CONFIRMATION =====================
function createConfirmationSession(userId, threadId, data) {
    const sessionId = `${userId}_${threadId}_${Date.now()}`;
    pendingSessions.set(sessionId, {
        userId,
        threadId,
        type: data.type,
        data: data,
        timestamp: Date.now(),
        expiresAt: Date.now() + 300000 // 5 minutes
    });
    return sessionId;
}

function handleConfirmationResponse(userId, threadId, response) {
    const userSessions = Array.from(pendingSessions.entries())
        .filter(([id, session]) => session.userId === userId && session.threadId === threadId)
        .sort(([,a], [,b]) => b.timestamp - a.timestamp);
    
    if (userSessions.length === 0) return null;
    
    const [sessionId, session] = userSessions[0];
    
    if (Date.now() > session.expiresAt) {
        pendingSessions.delete(sessionId);
        return { expired: true };
    }
    
    pendingSessions.delete(sessionId);
    return { session, confirmed: response.toLowerCase().includes('oui') || response.toLowerCase().includes('yes') || response.toLowerCase().includes('confirmer') };
}

// Traitement confirmé des mises à jour de quiz
async function processConfirmedQuizUpdate(sessionData, threadID, senderID) {
    try {
        const { quizData, quizId, date, modoName } = sessionData;
        
        // Demander les points du modérateur
        api.sendMessage(`🎯 Combien de points voulez-vous attribuer au modérateur ${modoName} ?
        
💡 Répondez avec un nombre (par défaut: 50 points)
⏰ Vous avez 60 secondes pour répondre.`, threadID);
        
        // Créer une session pour les points du modo
        const modoPointsSession = createConfirmationSession(senderID, threadID, {
            type: 'modo_points',
            data: { quizData, quizId, date, modoName }
        });
        
    } catch (error) {
        console.error('Erreur processConfirmedQuizUpdate:', error);
        api.sendMessage("❌ Erreur lors du traitement de la mise à jour.", threadID);
    }
}

// Traitement des points du modérateur
async function processModoPoints(sessionData, threadID, senderID, pointsInput) {
    try {
        const { quizData, quizId, date, modoName } = sessionData;
        
        // Parser les points du modo (par défaut 50)
        let modoPoints = 50;
        const parsedPoints = parseInt(pointsInput);
        if (!isNaN(parsedPoints)) {
            modoPoints = parsedPoints;
        }
        
        // Traiter la mise à jour du classement
        const result = leaderboard.updateLeaderboard(quizData, quizId, date);
        
        // Ajouter le bonus modérateur
        leaderboard.addModeratorBonus(modoName, modoPoints);
        
        // Sauvegarder
        storage.saveData();
        storage.createBackup();
        
        // Envoyer le rapport final
        let response = `✅ MISE À JOUR DU CLASSEMENT TERMINÉE !

📊 ${result.report}

👑 BONUS MODÉRATEUR: ${modoName} +${modoPoints} points

🏆 Classement mis à jour avec succès !`;
        
        api.sendMessage(response, threadID);
        
        // Envoyer le nouveau classement si demandé
        setTimeout(() => {
            const leaderboardText = commands.showLeaderboard(10);
            if (leaderboardText.length > 2000) {
                const chunks = splitMessage(leaderboardText, 2000);
                chunks.forEach((chunk, index) => {
                    setTimeout(() => {
                        api.sendMessage(chunk, threadID);
                    }, index * 1000);
                });
            } else {
                api.sendMessage(leaderboardText, threadID);
            }
        }, 2000);
        
    } catch (error) {
        console.error('Erreur processModoPoints:', error);
        api.sendMessage("❌ Erreur lors du traitement des points du modérateur.", threadID);
    }
}

// Nettoyer les sessions expirées
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of pendingSessions.entries()) {
        if (now > session.expiresAt) {
            pendingSessions.delete(sessionId);
        }
    }
}, 60000); // Nettoyer toutes les minutes

// ===================== GESTION DES MESSAGES FACEBOOK =====================
async function handleMessage(event) {
    const message = event.body;
    const threadID = event.threadID;
    const senderID = event.senderID;
    
    if (!message || typeof message !== 'string') return;

    // Mettre en cache tous les messages entrants pour la détection de suppression
    if (event.messageID) {
        messageCache.set(event.messageID, {
            messageID: event.messageID,
            senderID: senderID,
            threadID: threadID,
            body: message,
            timestamp: new Date(),
            attachments: event.attachments || []
        });
        
        // Nettoyer le cache (garder seulement les 1000 derniers messages)
        if (messageCache.size > 1000) {
            const oldestKey = messageCache.keys().next().value;
            messageCache.delete(oldestKey);
        }
    }

    // Vérifier s'il s'agit d'une réponse à une confirmation
    const confirmationResponse = handleConfirmationResponse(senderID, threadID, message);
    if (confirmationResponse) {
        if (confirmationResponse.expired) {
            api.sendMessage("⏰ Session de confirmation expirée. Veuillez recommencer.", threadID);
            return;
        }
        
        const session = confirmationResponse.session;
        if (confirmationResponse.confirmed) {
            if (session.type === 'quiz_update') {
                await processConfirmedQuizUpdate(session.data, threadID, senderID);
            }
        } else {
            api.sendMessage("❌ Mise à jour annulée.", threadID);
        }
        return;
    }
    
    // Vérifier s'il s'agit d'une réponse pour les points du modérateur
    const userSessions = Array.from(pendingSessions.entries())
        .filter(([id, session]) => session.userId === senderID && session.threadId === threadID && session.type === 'modo_points')
        .sort(([,a], [,b]) => b.timestamp - a.timestamp);
    
    if (userSessions.length > 0) {
        const [sessionId, session] = userSessions[0];
        if (Date.now() <= session.expiresAt) {
            pendingSessions.delete(sessionId);
            await processModoPoints(session.data, threadID, senderID, message);
            return;
        }
    }

    const prefix = botConfig.commandPrefix;
    
    // Vérifier si c'est une commande
    if (message.startsWith(prefix)) {
        const commandText = message.slice(prefix.length).trim();
        const args = commandText.split(/\s+/);
        const cmd = args[0].toLowerCase();
        
        console.log(`🎯 Commande reçue: ${cmd} de ${senderID} dans ${threadID}`);
        
        try {
            // Utiliser switch sans await dans les cases, gérer l'async différemment
            if (cmd === 'anime') {
                if (args.length > 1) {
                    const query = args.slice(1).join(' ');
                    api.sendMessage("🔍 Recherche en cours...", threadID);
                    try {
                        const result = await anilistCommands.handleAnimeCommand(query);
                        if (result && result.text) {
                            // Envoyer d'abord le texte
                            api.sendMessage(result.text, threadID);
                            // Puis essayer d'envoyer l'image séparément si elle existe
                            if (result.image) {
                                try {
                                    const axios = require('axios');
                                    const response = await axios.get(result.image, { responseType: 'stream' });
                                    setTimeout(() => {
                                        api.sendMessage({
                                            attachment: response.data
                                        }, threadID);
                                    }, 1000);
                                } catch (imgError) {
                                    console.log('Erreur envoi image anime:', imgError.message);
                                }
                            }
                        } else if (typeof result === 'string') {
                            api.sendMessage(result, threadID);
                        } else {
                            api.sendMessage("❌ Erreur lors de la recherche de l'anime.", threadID);
                        }
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la recherche de l'anime.", threadID);
                    }
                } else {
                    api.sendMessage(`❌ Usage: ${prefix}anime [nom de l'anime]`, threadID);
                }
            } else if (cmd === 'manga') {
                if (args.length > 1) {
                    const query = args.slice(1).join(' ');
                    api.sendMessage("🔍 Recherche en cours...", threadID);
                    try {
                        const result = await anilistCommands.handleMangaCommand(query);
                        if (result && result.text) {
                            // Envoyer d'abord le texte
                            api.sendMessage(result.text, threadID);
                            // Puis essayer d'envoyer l'image séparément si elle existe
                            if (result.image) {
                                try {
                                    const axios = require('axios');
                                    const response = await axios.get(result.image, { responseType: 'stream' });
                                    setTimeout(() => {
                                        api.sendMessage({
                                            attachment: response.data
                                        }, threadID);
                                    }, 1000);
                                } catch (imgError) {
                                    console.log('Erreur envoi image manga:', imgError.message);
                                }
                            }
                        } else if (typeof result === 'string') {
                            api.sendMessage(result, threadID);
                        } else {
                            api.sendMessage("❌ Erreur lors de la recherche du manga.", threadID);
                        }
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la recherche du manga.", threadID);
                    }
                } else {
                    api.sendMessage(`❌ Usage: ${prefix}manga [nom du manga]`, threadID);
                }
            } else if (cmd === 'trending') {
                const limit = args.length > 1 ? parseInt(args[1]) : 10;
                const actualLimit = isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 25);
                api.sendMessage(`🔥 Récupération du top ${actualLimit} tendances...`, threadID);
                try {
                    const result = await anilistCommands.handleTrendingCommand(actualLimit);
                    api.sendMessage(result, threadID);
                } catch (error) {
                    api.sendMessage("❌ Erreur lors de la récupération des tendances.", threadID);
                }
            } else if (cmd === 'airing') {
                api.sendMessage("📺 Récupération des animes en cours...", threadID);
                try {
                    const result = await anilistCommands.handleAiringCommand();
                    api.sendMessage(result, threadID);
                } catch (error) {
                    api.sendMessage("❌ Erreur lors de la récupération des animes en cours.", threadID);
                }
            } else if (cmd === 'random') {
                const randomType = args[1] && args[1].toLowerCase() === 'manga' ? 'manga' : 'anime';
                api.sendMessage("🎲 Génération aléatoire...", threadID);
                try {
                    const result = await anilistCommands.handleRandomCommand(randomType);
                    api.sendMessage(result, threadID);
                } catch (error) {
                    api.sendMessage("❌ Erreur lors de la génération aléatoire.", threadID);
                }
            } else if (cmd === 'character' || cmd === 'personnage') {
                if (args.length > 1) {
                    const query = args.slice(1).join(' ');
                    api.sendMessage("👤 Recherche du personnage...", threadID);
                    try {
                        const result = await anilistCommands.handleCharacterCommand(query);
                        if (result && result.text) {
                            // Envoyer d'abord le texte
                            api.sendMessage(result.text, threadID);
                            // Puis essayer d'envoyer l'image séparément si elle existe
                            if (result.image) {
                                try {
                                    const axios = require('axios');
                                    const response = await axios.get(result.image, { responseType: 'stream' });
                                    setTimeout(() => {
                                        api.sendMessage({
                                            attachment: response.data
                                        }, threadID);
                                    }, 1000);
                                } catch (imgError) {
                                    console.log('Erreur envoi image character:', imgError.message);
                                }
                            }
                        } else if (typeof result === 'string') {
                            api.sendMessage(result, threadID);
                        } else {
                            api.sendMessage("❌ Erreur lors de la recherche du personnage.", threadID);
                        }
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la recherche du personnage.", threadID);
                    }
                } else {
                    api.sendMessage(`❌ Usage: ${prefix}character [nom du personnage]`, threadID);
                }
            } else if (cmd === 'animetop' || cmd === 'mangatop') {
                const topType = cmd === 'mangatop' ? 'manga' : 'anime';
                api.sendMessage("🏆 Récupération du classement...", threadID);
                try {
                    const result = await anilistCommands.handleTopCommand(topType);
                    api.sendMessage(result, threadID);
                } catch (error) {
                    api.sendMessage("❌ Erreur lors de la récupération du classement.", threadID);
                }
            } else if (cmd === 'season') {
                if (args.length >= 3) {
                    const year = args[1];
                    const season = args[2];
                    api.sendMessage("🗓️ Récupération de la saison...", threadID);
                    try {
                        const result = await anilistCommands.handleSeasonCommand(year, season);
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la récupération de la saison.", threadID);
                    }
                } else {
                    api.sendMessage(`❌ Usage: ${prefix}season [année] [saison]\nExemple: ${prefix}season 2024 winter`, threadID);
                }
            } else if (cmd === 'genres') {
                api.sendMessage("🏷️ Récupération des genres...", threadID);
                try {
                    const result = await anilistCommands.handleGenresCommand();
                    api.sendMessage(result, threadID);
                } catch (error) {
                    api.sendMessage("❌ Erreur lors de la récupération des genres.", threadID);
                }
            } else if (cmd === 'genre') {
                if (args.length > 1) {
                    const genre = args[1];
                    const type = args[2] && args[2].toLowerCase() === 'manga' ? 'manga' : 'anime';
                    api.sendMessage("🔍 Recherche par genre...", threadID);
                    try {
                        const result = await anilistCommands.handleGenreCommand(genre, type);
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la recherche par genre.", threadID);
                    }
                } else {
                    api.sendMessage(`❌ Usage: ${prefix}genre [nom_genre] [anime/manga]`, threadID);
                }
            } else if (cmd === 'search' || cmd === 'recherche') {
                if (args.length > 1) {
                    const query = args.slice(1).join(' ');
                    api.sendMessage("🔍 Recherche globale...", threadID);
                    try {
                        const result = await anilistCommands.handleSearchCommand(query);
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la recherche globale.", threadID);
                    }
                } else {
                    api.sendMessage(`❌ Usage: ${prefix}search [terme de recherche]`, threadID);
                }
            } else if (cmd === 'recommendations' || cmd === 'recommandations') {
                if (args.length > 1) {
                    const query = args.slice(1).join(' ');
                    api.sendMessage("💡 Recherche de recommandations...", threadID);
                    try {
                        const result = await anilistCommands.handleRecommendationsCommand(query);
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la recherche de recommandations.", threadID);
                    }
                } else {
                    api.sendMessage(`❌ Usage: ${prefix}recommendations [nom de l'anime]`, threadID);
                }
            } else if (cmd === 'anistats' || cmd === 'anilistats') {
                api.sendMessage("📊 Récupération des statistiques...", threadID);
                try {
                    const result = await anilistCommands.handleStatsCommand();
                    api.sendMessage(result, threadID);
                } catch (error) {
                    api.sendMessage("❌ Erreur lors de la récupération des statistiques.", threadID);
                }
            } else if (cmd === 'add' || cmd === 'ajouter') {
                const usersToAdd = event.mentions ? Object.keys(event.mentions) : [];
                if (args.length > 1 && usersToAdd.length === 0) {
                    const userIds = args.slice(1);
                    try {
                        const result = await groupManagement.addUserToGroup(threadID, userIds, senderID);
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de l'ajout des membres.", threadID);
                    }
                } else if (usersToAdd.length > 0) {
                    try {
                        const result = await groupManagement.addUserToGroup(threadID, usersToAdd, senderID);
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de l'ajout des membres.", threadID);
                    }
                } else {
                    api.sendMessage(`❌ Usage: ${prefix}add [@utilisateur] ou ${prefix}add [userID]`, threadID);
                }
            } else if (cmd === 'deletionstats' || cmd === 'statssuppression') {
                if (!storage.isAdmin(senderID)) {
                    api.sendMessage("❌ Seuls les administrateurs peuvent voir les statistiques.", threadID);
                } else {
                    const deletionStats = groupManagement.getGroupDeletionStats(threadID);
                    api.sendMessage(deletionStats, threadID);
                }
            } else if (cmd === 'status' || cmd === 'statut') {
                try {
                    const result = await enhancedCommands.getDetailedStatus();
                    if (result.length > 2000) {
                        const chunks = splitMessage(result, 2000);
                        chunks.forEach((chunk, index) => {
                            setTimeout(() => {
                                api.sendMessage(chunk, threadID);
                            }, index * 1000);
                        });
                    } else {
                        api.sendMessage(result, threadID);
                    }
                } catch (error) {
                    api.sendMessage("❌ Erreur lors de la récupération du statut.", threadID);
                }
            } else if (cmd === 'ping') {
                try {
                    const result = await enhancedCommands.getPingStatus();
                    api.sendMessage(result, threadID);
                } catch (error) {
                    api.sendMessage("❌ Erreur lors du test de ping.", threadID);
                }
            } else if (cmd === 'groupinfo' || cmd === 'infogroupe') {
                try {
                    const result = await enhancedCommands.getGroupInfo(threadID);
                    api.sendMessage(result, threadID);
                } catch (error) {
                    api.sendMessage("❌ Erreur lors de la récupération des informations du groupe.", threadID);
                }
            } else if (cmd === 'botinfo' || cmd === 'infobot') {
                const botInfo = enhancedCommands.getBotInfo();
                api.sendMessage(botInfo, threadID);
            } else if (cmd === 'version') {
                const versionInfo = enhancedCommands.getVersionInfo();
                api.sendMessage(versionInfo, threadID);
            } else if (cmd === 'uptime') {
                const uptimeInfo = enhancedCommands.getUptimeInfo();
                api.sendMessage(uptimeInfo, threadID);
            } else if (cmd === 'health' || cmd === 'sante') {
                try {
                    const result = await enhancedCommands.getHealthCheck();
                    api.sendMessage(result, threadID);
                } catch (error) {
                    api.sendMessage("❌ Erreur lors de la vérification de santé.", threadID);
                }
            } else {
                // Commandes existantes avec switch
                switch (cmd) {
                    case 'menu':
                    case 'aide':
                    case 'help':
                        api.sendMessage(commands.help(), threadID);
                        break;
                        
                    case 'classement':
                    case 'leaderboard':
                        const leaderboardResult = commands.showLeaderboard();
                        // Diviser le message si trop long pour Facebook
                        if (leaderboardResult.length > 2000) {
                            const leaderboardChunks = splitMessage(leaderboardResult, 2000);
                            leaderboardChunks.forEach((chunk, index) => {
                                setTimeout(() => {
                                    api.sendMessage(chunk, threadID);
                                }, index * 1000);
                            });
                        } else {
                            api.sendMessage(leaderboardResult, threadID);
                        }
                        break;
                        
                    case 'top':
                        const topLimit = args[1] ? parseInt(args[1]) : 10;
                        if (isNaN(topLimit) || topLimit < 1 || topLimit > 100) {
                            api.sendMessage("❌ Veuillez spécifier un nombre entre 1 et 100", threadID);
                            break;
                        }
                        const topPlayersResult = commands.showLeaderboard(topLimit);
                        api.sendMessage(topPlayersResult, threadID);
                        break;

                        
                    case 'merge':
                    case 'fusionner':
                        if (args.length >= 2) {
                            const input = args.slice(1).join(' ');
                            const result = commands.advancedMerge(input, senderID);
                            api.sendMessage(result, threadID);
                        } else {
                            api.sendMessage(`❌ Usage: ${prefix}merge [nom1] [nom2] [nom3] ...`, threadID);
                        }
                        break;

                case 'random':
                    const randomType = args[1] && args[1].toLowerCase() === 'manga' ? 'manga' : 'anime';
                    api.sendMessage("🎲 Génération aléatoire...", threadID);
                    try {
                        const result = await anilistCommands.handleRandomCommand(randomType);
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la génération aléatoire.", threadID);
                    }
                    break;

                case 'character':
                case 'personnage':
                    if (args.length > 1) {
                        const query = args.slice(1).join(' ');
                        api.sendMessage("👤 Recherche du personnage...", threadID);
                        try {
                            const result = await anilistCommands.handleCharacterCommand(query);
                            api.sendMessage(result, threadID);
                        } catch (error) {
                            api.sendMessage("❌ Erreur lors de la recherche du personnage.", threadID);
                        }
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}character [nom du personnage]`, threadID);
                    }
                    break;

                case 'animetop':
                case 'mangatop':
                    const topType = cmd === 'mangatop' ? 'manga' : 'anime';
                    api.sendMessage("🏆 Récupération du classement...", threadID);
                    try {
                        const result = await anilistCommands.handleTopCommand(topType);
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la récupération du classement.", threadID);
                    }
                    break;

                case 'season':
                    if (args.length >= 3) {
                        const year = args[1];
                        const season = args[2];
                        api.sendMessage("🗓️ Récupération de la saison...", threadID);
                        try {
                            const result = await anilistCommands.handleSeasonCommand(year, season);
                            api.sendMessage(result, threadID);
                        } catch (error) {
                            api.sendMessage("❌ Erreur lors de la récupération de la saison.", threadID);
                        }
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}season [année] [saison]\nExemple: ${prefix}season 2024 winter`, threadID);
                    }
                    break;

                case 'genres':
                    api.sendMessage("🏷️ Récupération des genres...", threadID);
                    try {
                        const result = await anilistCommands.handleGenresCommand();
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la récupération des genres.", threadID);
                    }
                    break;

                case 'genre':
                    if (args.length > 1) {
                        const genre = args[1];
                        const type = args[2] && args[2].toLowerCase() === 'manga' ? 'manga' : 'anime';
                        api.sendMessage("🔍 Recherche par genre...", threadID);
                        try {
                            const result = await anilistCommands.handleGenreCommand(genre, type);
                            api.sendMessage(result, threadID);
                        } catch (error) {
                            api.sendMessage("❌ Erreur lors de la recherche par genre.", threadID);
                        }
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}genre [nom_genre] [anime/manga]`, threadID);
                    }
                    break;

                case 'search':
                case 'recherche':
                    if (args.length > 1) {
                        const query = args.slice(1).join(' ');
                        api.sendMessage("🔍 Recherche globale...", threadID);
                        try {
                            const result = await anilistCommands.handleSearchCommand(query);
                            api.sendMessage(result, threadID);
                        } catch (error) {
                            api.sendMessage("❌ Erreur lors de la recherche globale.", threadID);
                        }
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}search [terme de recherche]`, threadID);
                    }
                    break;

                case 'recommendations':
                case 'recommandations':
                    if (args.length > 1) {
                        const query = args.slice(1).join(' ');
                        api.sendMessage("💡 Recherche de recommandations...", threadID);
                        try {
                            const result = await anilistCommands.handleRecommendationsCommand(query);
                            api.sendMessage(result, threadID);
                        } catch (error) {
                            api.sendMessage("❌ Erreur lors de la recherche de recommandations.", threadID);
                        }
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}recommendations [nom de l'anime]`, threadID);
                    }
                    break;

                case 'anistats':
                case 'anilistats':
                    api.sendMessage("📊 Récupération des statistiques...", threadID);
                    try {
                        const result = await anilistCommands.handleStatsCommand();
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la récupération des statistiques.", threadID);
                    }
                    break;

                // ========== COMMANDES DE GESTION DE GROUPE ==========
                case 'add':
                case 'ajouter':
                    const usersToAdd = event.mentions ? Object.keys(event.mentions) : [];
                    if (args.length > 1 && usersToAdd.length === 0) {
                        // Si pas de mentions mais des IDs en texte
                        const userIds = args.slice(1);
                        try {
                            const result = await groupManagement.addUserToGroup(threadID, userIds, senderID);
                            api.sendMessage(result, threadID);
                        } catch (error) {
                            api.sendMessage("❌ Erreur lors de l'ajout des membres.", threadID);
                        }
                    } else if (usersToAdd.length > 0) {
                        try {
                            const result = await groupManagement.addUserToGroup(threadID, usersToAdd, senderID);
                            api.sendMessage(result, threadID);
                        } catch (error) {
                            api.sendMessage("❌ Erreur lors de l'ajout des membres.", threadID);
                        }
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}add [@utilisateur] ou ${prefix}add [userID]`, threadID);
                    }
                    break;



                // ========== COMMANDES AMÉLIORÉES ==========

                case 'ping':
                    try {
                        const result = await enhancedCommands.getPingStatus();
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors du test de ping.", threadID);
                    }
                    break;

                case 'groupinfo':
                case 'infogroupe':
                    try {
                        const result = await enhancedCommands.getGroupInfo(threadID);
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la récupération des informations du groupe.", threadID);
                    }
                    break;

                case 'botinfo':
                case 'infobot':
                    const botInfo = enhancedCommands.getBotInfo();
                    api.sendMessage(botInfo, threadID);
                    break;

                case 'version':
                    const versionInfo = enhancedCommands.getVersionInfo();
                    api.sendMessage(versionInfo, threadID);
                    break;

                case 'uptime':
                    const uptimeInfo = enhancedCommands.getUptimeInfo();
                    api.sendMessage(uptimeInfo, threadID);
                    break;

                case 'health':
                case 'sante':
                    try {
                        const result = await enhancedCommands.getHealthCheck();
                        api.sendMessage(result, threadID);
                    } catch (error) {
                        api.sendMessage("❌ Erreur lors de la vérification de santé.", threadID);
                    }
                    break;

                // ========== COMMANDES EXISTANTES ==========
                case 'menu':
                case 'aide':
                case 'help':
                    api.sendMessage(commands.help(), threadID);
                    break;
                    
                case 'classement':
                case 'leaderboard':
                    const leaderboardText2 = commands.showLeaderboard();
                    // Diviser le message si trop long pour Facebook
                    if (leaderboardText2.length > 2000) {
                        const chunks2 = splitMessage(leaderboardText2, 2000);
                        chunks2.forEach((chunk, index) => {
                            setTimeout(() => {
                                api.sendMessage(chunk, threadID);
                            }, index * 1000);
                        });
                    } else {
                        api.sendMessage(leaderboardText2, threadID);
                    }
                    break;
                    
                case 'top':
                    const limit = args[1] ? parseInt(args[1]) : 10;
                    if (isNaN(limit) || limit < 1 || limit > 100) {
                        api.sendMessage("❌ Veuillez spécifier un nombre entre 1 et 100", threadID);
                        break;
                    }
                    const topPlayers = commands.showLeaderboard(limit);
                    api.sendMessage(topPlayers, threadID);
                    break;
                    

                    
                case 'merge':
                case 'fusionner':
                    if (args.length >= 2) {
                        const input = args.slice(1).join(' ');
                        const result = commands.advancedMerge(input, senderID);
                        api.sendMessage(result, threadID);
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}merge [nom1] [nom2] [nom3] ...`, threadID);
                    }
                    break;
                    
                case 'setprefix':
                case 'prefix':
                    if (args[1]) {
                        const result = commands.setPrefix(args[1], senderID);
                        api.sendMessage(result, threadID);
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}setprefix [nouveau_préfixe]`, threadID);
                    }
                    break;
                    
                case 'mergehistory':
                case 'historique':
                    const history = commands.showMergeHistory(senderID);
                    api.sendMessage(history, threadID);
                    break;
                    
                case 'clearmerge':
                case 'clearmemory':
                    const clearResult = commands.clearMergeHistory(senderID);
                    api.sendMessage(clearResult, threadID);
                    break;
                    
                case 'duplicates':
                case 'doublons':
                case 'detecterdoublons':
                    if (!storage.isAdmin(senderID)) {
                        api.sendMessage("❌ Seuls les administrateurs peuvent détecter les doublons.", threadID);
                        break;
                    }
                    api.sendMessage("🔍 Analyse en cours des doublons...", threadID);
                    const duplicates = duplicateDetector.detectDuplicates();
                    const report = duplicateDetector.formatDuplicateReport(duplicates);
                    
                    if (report.length > 2000) {
                        const chunks = splitMessage(report, 2000);
                        chunks.forEach((chunk, index) => {
                            setTimeout(() => {
                                api.sendMessage(chunk, threadID);
                            }, (index + 1) * 1000);
                        });
                    } else {
                        setTimeout(() => {
                            api.sendMessage(report, threadID);
                        }, 1000);
                    }
                    break;
                    
                case 'position':
                case 'pos':
                    if (args.length > 1) {
                        const playerName = args.slice(1).join(' ');
                        const playerInfo = formatter.formatPlayerInfo(playerName);
                        api.sendMessage(playerInfo, threadID);
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}position [nom du joueur]`, threadID);
                    }
                    break;
                    
                case 'statut':
                case 'status_perso':
                    const userStatus = commands.getUserStatus(senderID);
                    api.sendMessage(userStatus, threadID);
                    break;
                    
                case 'historiquemodo':
                case 'historiquemoderation':
                    const modoHistory = commands.getModerationHistory(senderID);
                    api.sendMessage(modoHistory, threadID);
                    break;
                    
                case 'sauvegardes':
                case 'backups':
                    const backupsList = commands.getBackupsList(senderID);
                    api.sendMessage(backupsList, threadID);
                    break;

                case 'kick':
                case 'expulser':
                    const mentionedUsers = event.mentions ? Object.keys(event.mentions) : [];
                    const kickResult = commands.kickUser(threadID, mentionedUsers, senderID);
                    if (kickResult) {
                        api.sendMessage(kickResult, threadID);
                    }
                    break;

                case 'ping':
                    const pingResult = commands.ping();
                    api.sendMessage(pingResult, threadID);
                    break;

                case 'status':
                    const statusResult = commands.getBotStatus();
                    api.sendMessage(statusResult, threadID);
                    break;

                case 'groupinfo':
                case 'infogroupe':
                    commands.getGroupInfo(threadID, senderID).then(result => {
                        api.sendMessage(result, threadID);
                    });
                    break;

                case 'listadmins':
                case 'listeadmins':
                case 'admins':
                    const adminList = commands.listAdmins(senderID);
                    api.sendMessage(adminList, threadID);
                    break;
                    
                case 'restaurer':
                case 'restore':
                    if (args[1]) {
                        const restoreResult = commands.restoreFromBackup(args[1], senderID);
                        api.sendMessage(restoreResult, threadID);
                        
                        // Afficher le classement après restauration si succès
                        if (restoreResult.includes('✅')) {
                            setTimeout(() => {
                                const leaderboardText = commands.showLeaderboard();
                                if (leaderboardText.length > 2000) {
                                    const chunks = splitMessage(leaderboardText, 2000);
                                    chunks.forEach((chunk, index) => {
                                        setTimeout(() => {
                                            api.sendMessage(chunk, threadID);
                                        }, index * 1000);
                                    });
                                } else {
                                    api.sendMessage(leaderboardText, threadID);
                                }
                            }, 1000);
                        }
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}restaurer [nom_fichier]`, threadID);
                    }
                    break;
                    
                case 'setclassement':
                case 'setleaderboard':
                    const setResult = commands.setLeaderboard(senderID, threadID);
                    if (setResult) {
                        api.sendMessage(setResult, threadID);
                    }
                    break;
                    
                case 'ajouteradmin':
                case 'addadmin':
                    const mentionedForAdmin = event.mentions ? Object.keys(event.mentions) : [];
                    const userIdFromText = args[1];
                    const addAdminResult = commands.addAdmin(mentionedForAdmin, senderID, userIdFromText);
                    api.sendMessage(addAdminResult, threadID);
                    break;
                    
                case 'supprimeradmin':
                case 'removeadmin':
                    if (senderID !== SUPER_ADMIN_ID) {
                        api.sendMessage("❌ Seul le super administrateur peut supprimer des administrateurs.", threadID);
                        break;
                    }
                    if (args[1]) {
                        const result = storage.removeAdmin(args[1]);
                        api.sendMessage(result, threadID);
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}supprimeradmin [userID]`, threadID);
                    }
                    break;
                    
                case 'admin':
                    if (senderID !== SUPER_ADMIN_ID) {
                        api.sendMessage("❌ Seul le super administrateur peut gérer les administrateurs.", threadID);
                        break;
                    }
                    if (args[1] && args[2]) {
                        const action = args[1].toLowerCase();
                        const userId = args[2];
                        if (action === 'add' || action === 'ajouter') {
                            const result = storage.addAdmin(userId);
                            api.sendMessage(result, threadID);
                        } else if (action === 'remove' || action === 'supprimer') {
                            const result = storage.removeAdmin(userId);
                            api.sendMessage(result, threadID);
                        } else {
                            api.sendMessage(`❌ Action invalide. Utilisez: ${prefix}admin [add/remove] [userID]`, threadID);
                        }
                    } else {
                        api.sendMessage(`❌ Usage: ${prefix}admin [add/remove] [userID]`, threadID);
                    }
                    break;
                    
                case 'backup':
                case 'sauvegarde':
                    if (!storage.isAdmin(senderID)) {
                        api.sendMessage("❌ Seuls les administrateurs peuvent créer des sauvegardes.", threadID);
                        break;
                    }
                    storage.createBackup();
                    api.sendMessage("✅ Sauvegarde créée avec succès!", threadID);
                    break;
                    

                    
                case 'ping':
                    api.sendMessage("🏓 Pong! Le bot fonctionne correctement.", threadID);
                    break;
                    
                default:
                    // Commande inconnue - optionnel: afficher une aide
                    if (cmd.length > 0) {
                        api.sendMessage(`❓ Commande inconnue: ${cmd}\nTapez ${prefix}menu pour voir toutes les commandes.`, threadID);
                    }
                    break;
                }
            }
        } catch (error) {
            console.error(`❌ Erreur lors du traitement de la commande ${cmd}:`, error);
            api.sendMessage("❌ Une erreur s'est produite lors du traitement de votre commande.", threadID);
        }
    } else {
        // Vérifier si on attend un classement initial
        const leaderboardResult = commands.processLeaderboardInput(message, senderID, threadID);
        if (leaderboardResult) {
            api.sendMessage(leaderboardResult, threadID);
            return;
        }

        // Vérifier si c'est un quiz (pour les admins) - avec système de confirmation
        if (storage.isAdmin(senderID)) {
            const quizData = parser.parseQuizText(message);
            
            if (quizData.modo && quizData.participants.length > 0) {
                console.log(`📊 Quiz détecté de ${senderID} - Modo: ${quizData.modo}, Participants: ${quizData.participants.length}`);
                
                // Créer une session de confirmation pour la mise à jour du quiz
                const quizId = 'QUIZ-' + moment().format('DDHHmmss');
                const date = moment().format('DD/MM/YYYY');
                
                // Générer le rapport de prévisualisation
                let previewReport = `📊 PRÉVISUALISATION DE LA MISE À JOUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Modérateur détecté: ${quizData.modo}
🎯 Participants: ${quizData.participants.length}

📝 MODIFICATIONS À APPLIQUER:`;

                quizData.participants.forEach(participant => {
                    const pointsDisplay = participant.points >= 0 ? `+${participant.points}` : `${participant.points}`;
                    previewReport += `\n   • ${participant.name}: ${pointsDisplay} points`;
                });
                
                previewReport += `\n\n⚠️ CONFIRMEZ-VOUS CETTE MISE À JOUR ?
                
✅ Répondez "OUI" pour confirmer
❌ Répondez "NON" pour annuler
⏰ Vous avez 5 minutes pour répondre`;

                // Créer la session de confirmation
                createConfirmationSession(senderID, threadID, {
                    type: 'quiz_update',
                    data: { quizData, quizId, date, modoName: quizData.modo }
                });
                
                api.sendMessage(previewReport, threadID);
            }
        }
    }
}

// Fonction utilitaire pour diviser les messages longs
function splitMessage(text, maxLength = 2000) {
    const chunks = [];
    let currentChunk = "";
    const lines = text.split('\n');
    
    for (const line of lines) {
        if ((currentChunk + line + '\n').length > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = line + '\n';
            } else {
                // Ligne trop longue, la couper
                chunks.push(line.substring(0, maxLength));
                currentChunk = line.substring(maxLength) + '\n';
            }
        } else {
            currentChunk += line + '\n';
        }
    }
    
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

// Fonction pour obtenir le statut du bot
function getStatusMessage() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const playerCount = storage.leaderboard.players.length;
    const adminCount = storage.admins.size;
    const mergeCount = Object.keys(storage.mergeMemory).length;
    
    const toBoldUnicode = (text) => {
        const boldMap = {
            'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
            'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
            'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
            'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
            'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
            'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
            '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
        };
        return text.replace(/[A-Za-z0-9]/g, char => boldMap[char] || char);
    };

    return `🤖 ${toBoldUnicode('Statut du V.V.VAdminBot')}
    
⏱️ ${toBoldUnicode('Temps d\'activité:')} ${hours}h ${minutes}m ${seconds}s
👥 ${toBoldUnicode('Joueurs enregistrés:')} ${playerCount}
👑 ${toBoldUnicode('Administrateurs:')} ${adminCount}
🔄 ${toBoldUnicode('Merges en mémoire:')} ${mergeCount}
⚙️ ${toBoldUnicode('Préfixe des commandes:')} ${botConfig.commandPrefix}
📊 ${toBoldUnicode('Version:')} V.V.VAdminBot v2.0

✅ ${toBoldUnicode('Bot opérationnel et prêt à traiter vos commandes!')}`;
}

// ===================== GESTION DES ÉVÉNEMENTS FACEBOOK =====================
function handleEvent(event) {
    // Ignorer les erreurs de parsing des événements non critiques
    if (event.type === 'parse_error') {
        if (botConfig.enableLogging) {
            console.log(`⚠️ Événement ignoré: ${event.error}`);
        }
        return;
    }
    
    switch (event.type) {
        case 'message':
            handleMessage(event);
            break;
            
        case 'event':
            // Gestion des invitations dans les groupes
            if (event.logMessageType === 'log:subscribe') {
                const toBoldUnicode = (text) => {
                    const boldMap = {
                        'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
                        'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
                        'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
                        'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
                        'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
                        'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
                        '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
                    };
                    return text.replace(/[A-Za-z0-9]/g, char => boldMap[char] || char);
                };

                const welcomeMessage = `🤖 ${toBoldUnicode('Salut ! Je suis V.V.VAdminBot')}

Tapez ${botConfig.commandPrefix}menu pour voir toutes les commandes disponibles.

🚀 ${toBoldUnicode('Fonctionnalités principales:')}
• Traitement automatique des quiz
• Gestion du classement avec catégories  
• Support des scores négatifs
• Mémoire des noms fusionnés
• Détection de doublons
• Commandes anime/manga avec images
• Détection automatique des messages supprimés

🏆 ${toBoldUnicode('Développé pour le groupe V.V.V')}`;
                
                setTimeout(() => {
                    api.sendMessage(welcomeMessage, event.threadID);
                }, 1000);
            }
            
            // Gestion des suppressions de membres du groupe et messages supprimés
            if (event.logMessageType === 'log:unsubscribe') {
                // Utiliser le module de gestion de groupe pour traiter l'événement
                if (groupManagement) {
                    groupManagement.handleMessageDelete(event);
                }
            }
            
            break;
            
        case 'message_unsend':
            // Détection automatique des messages supprimés avec cache
            console.log('🗑️ Message supprimé détecté:', event.messageID);
            console.log('🔍 Événement complet:', JSON.stringify(event, null, 2));
            console.log('📊 Taille du cache:', messageCache.size);
            
            // Récupérer le message du cache
            const cachedMessage = messageCache.get(event.messageID);
            if (cachedMessage) {
                console.log('📋 Message trouvé dans le cache:', cachedMessage.body);
                
                // Envoyer automatiquement la notification de suppression
                api.getUserInfo(cachedMessage.senderID).then(senderInfo => {
                    const senderName = senderInfo[cachedMessage.senderID]?.name || 'Utilisateur inconnu';
                    
                    const timeStr = cachedMessage.timestamp.toLocaleTimeString('fr-FR');
                    const dateStr = cachedMessage.timestamp.toLocaleDateString('fr-FR');
                    
                    let attachmentInfo = '';
                    if (cachedMessage.attachments && cachedMessage.attachments.length > 0) {
                        const attachmentTypes = cachedMessage.attachments.map(att => {
                            if (att.type === 'photo') return '📷 Photo';
                            if (att.type === 'video') return '🎥 Vidéo';
                            if (att.type === 'audio') return '🎵 Audio';
                            if (att.type === 'file') return '📎 Fichier';
                            if (att.type === 'sticker') return '😀 Sticker';
                            return '📎 Pièce jointe';
                        });
                        attachmentInfo = `\n📎 Contenait: ${attachmentTypes.join(', ')}`;
                    }

                    const toBoldUnicode = (text) => {
                        const boldMap = {
                            'A': '𝖠', 'B': '𝖡', 'C': '𝖢', 'D': '𝖣', 'E': '𝖤', 'F': '𝖥', 'G': '𝖦', 'H': '𝖧', 'I': '𝖨', 'J': '𝖩',
                            'K': '𝖪', 'L': '𝖫', 'M': '𝖬', 'N': '𝖭', 'O': '𝖮', 'P': '𝖯', 'Q': '𝖰', 'R': '𝖱', 'S': '𝖲', 'T': '𝖳',
                            'U': '𝖴', 'V': '𝖵', 'W': '𝖶', 'X': '𝖷', 'Y': '𝖸', 'Z': '𝖹',
                            'a': '𝖺', 'b': '𝖻', 'c': '𝖼', 'd': '𝖽', 'e': '𝖾', 'f': '𝖿', 'g': '𝗀', 'h': '𝗁', 'i': '𝗂', 'j': '𝗃',
                            'k': '𝗄', 'l': '𝗅', 'm': '𝗆', 'n': '𝗇', 'o': '𝗈', 'p': '𝗉', 'q': '𝗊', 'r': '𝗋', 's': '𝗌', 't': '𝗍',
                            'u': '𝗎', 'v': '𝗏', 'w': '𝗐', 'x': '𝗑', 'y': '𝗒', 'z': '𝗓',
                            '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗',
                            ' ': ' ', '.': '.', ',': ',', '!': '!', '?': '?', ':': ':', ';': ';', '"': '"', "'": "'", 
                            '(': '(', ')': ')', '[': '[', ']': ']', '{': '{', '}': '}', '-': '-', '_': '_', '+': '+',
                            '=': '=', '*': '*', '&': '&', '%': '%', '$': '$', '#': '#', '@': '@', '/': '/', '\\': '\\'
                        };
                        return text.replace(/./g, char => boldMap[char] || char);
                    };

                    const boldMessage = toBoldUnicode(cachedMessage.body);

                    const titleBoldUnicode = (text) => {
                        const boldMap = {
                            'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
                            'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
                            'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
                            'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
                            'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
                            'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
                            '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵',
                            ' ': ' ', ':': ':', "'": "'", 'é': 'é', 'è': 'è', 'à': 'à', 'ê': 'ê'
                        };
                        return text.replace(/./g, char => boldMap[char] || char);
                    };

                    const notificationMessage = `━━━━━━━◇◆◇━━━━━━━
𝐐𝐔'𝐄𝐒𝐓 𝐂𝐄 𝐐𝐔𝐄 𝐓𝐔 𝐄𝐒𝐒𝐀𝐈𝐄𝐒 𝐃𝐄 𝐂𝐀𝐂𝐇𝐄𝐑 ?

👤 ${titleBoldUnicode('Auteur du message:')} ${senderName}
🗑️ ${titleBoldUnicode('Supprimé à:')} ${timeStr} - ${dateStr}
📝 ${titleBoldUnicode('Message ID:')} ${event.messageID}

💬 ${titleBoldUnicode('Contenu supprimé:')}
❝ ${boldMessage} ❞${attachmentInfo}

🔍 ${titleBoldUnicode('Action détectée et enregistrée par le bot V.V.V')}
━━━━━━━◇◆◇━━━━━━━`;

                    api.sendMessage(notificationMessage, cachedMessage.threadID);
                    
                    // Supprimer du cache après traitement
                    messageCache.delete(event.messageID);
                    
                }).catch(error => {
                    console.error('Erreur lors de l\'envoi de la notification:', error);
                });
            } else {
                console.log('⚠️ Message non trouvé dans le cache');
                
                // Envoyer une notification générique pour les messages non cachés
                if (event.senderID && event.threadID) {
                    api.getUserInfo(event.senderID).then(senderInfo => {
                        const senderName = senderInfo[event.senderID]?.name || 'Utilisateur inconnu';
                        const timeStr = new Date().toLocaleTimeString('fr-FR');
                        const dateStr = new Date().toLocaleDateString('fr-FR');

                        const toBoldUnicode = (text) => {
                            const boldMap = {
                                'A': '𝖠', 'B': '𝖡', 'C': '𝖢', 'D': '𝖣', 'E': '𝖤', 'F': '𝖥', 'G': '𝖦', 'H': '𝖧', 'I': '𝖨', 'J': '𝖩',
                                'K': '𝖪', 'L': '𝖫', 'M': '𝖬', 'N': '𝖭', 'O': '𝖮', 'P': '𝖯', 'Q': '𝖰', 'R': '𝖱', 'S': '𝖲', 'T': '𝖳',
                                'U': '𝖴', 'V': '𝖵', 'W': '𝖶', 'X': '𝖷', 'Y': '𝖸', 'Z': '𝖹',
                                'a': '𝖺', 'b': '𝖻', 'c': '𝖼', 'd': '𝖽', 'e': '𝖾', 'f': '𝖿', 'g': '𝗀', 'h': '𝗁', 'i': '𝗂', 'j': '𝗃',
                                'k': '𝗄', 'l': '𝗅', 'm': '𝗆', 'n': '𝗇', 'o': '𝗈', 'p': '𝗉', 'q': '𝗊', 'r': '𝗋', 's': '𝗌', 't': '𝗍',
                                'u': '𝗎', 'v': '𝗏', 'w': '𝗐', 'x': '𝗑', 'y': '𝗒', 'z': '𝗓',
                                '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗',
                                ' ': ' ', '.': '.', ',': ',', '!': '!', '?': '?', ':': ':', ';': ';', '"': '"', "'": "'", 
                                '(': '(', ')': ')', '[': '[', ']': ']', '{': '{', '}': '}', '-': '-', '_': '_', '+': '+',
                                '=': '=', '*': '*', '&': '&', '%': '%', '$': '$', '#': '#', '@': '@', '/': '/', '\\': '\\'
                            };
                            return text.replace(/./g, char => boldMap[char] || char);
                        };

                        const titleBoldUnicode = (text) => {
                            const boldMap = {
                                'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
                                'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
                                'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
                                'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
                                'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
                                'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
                                '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵',
                                ' ': ' ', ':': ':', "'": "'", 'é': 'é', 'è': 'è', 'à': 'à', 'ê': 'ê'
                            };
                            return text.replace(/./g, char => boldMap[char] || char);
                        };

                        const notificationMessage = `━━━━━━━◇◆◇━━━━━━━
𝐐𝐔'𝐄𝐒𝐓 𝐂𝐄 𝐐𝐔𝐄 𝐓𝐔 𝐄𝐒𝐒𝐀𝐈𝐄𝐒 𝐃𝐄 𝐂𝐀𝐂𝐇𝐄𝐑 ?

👤 ${titleBoldUnicode('Auteur du message:')} ${senderName}
🗑️ ${titleBoldUnicode('Supprimé à:')} ${timeStr} - ${dateStr}
📝 ${titleBoldUnicode('Message ID:')} ${event.messageID}

💬 ${titleBoldUnicode('Contenu:')} ❝ ${toBoldUnicode('Message supprimé (non trouvé dans le cache)')} ❞
⚠️ ${titleBoldUnicode('Le message a été supprimé trop rapidement pour être sauvegardé')}

🔍 ${titleBoldUnicode('Action détectée et enregistrée par le bot V.V.V')}
━━━━━━━◇◆◇━━━━━━━`;

                        api.sendMessage(notificationMessage, event.threadID);
                    }).catch(error => {
                        console.error('Erreur lors de l\'envoi de la notification générique:', error);
                    });
                }
            }
            return; // Important: return ici pour éviter d'arriver au default
            
        case 'message_reaction':
            // Ignorer les réactions pour le moment
            console.log(`📨 Événement non géré: ${event.type}`);
            break;
            
        case 'message_reply':
            // Ignorer les réponses pour le moment
            console.log(`📨 Événement non géré: ${event.type}`);
            break;
            
        default:
            // Autres événements non gérés (sauf message_unsend qui est géré ci-dessus)
            if (event.type !== 'message_unsend') {
                console.log(`📨 Événement non géré: ${event.type}`);
            }
            break;
    }
}

// ===================== INITIALISATION DU BOT FACEBOOK =====================
function initializeBot() {
    console.log('🚀 Démarrage du bot Facebook de gestion de classement...');
    
    // Charger les données
    storage.loadData();
    storage.cleanOldBackups();
    
    // Vérifier la présence du fichier appstate
    if (!fs.existsSync(APPSTATE_FILE)) {
        console.error('❌ Erreur: Le fichier appstate.json est manquant ou invalide.');
        console.log('📝 Veuillez créer le fichier appstate.json avec vos cookies Facebook.');
        console.log('🔗 Utilisez une extension comme "c3c-fbstate" pour extraire votre appstate.');
        return;
    }
    
    let appstate;
    try {
        const appstateContent = fs.readFileSync(APPSTATE_FILE, 'utf8');
        appstate = JSON.parse(appstateContent);
        
        // Vérifier si c'est un exemple ou un vrai appstate
        if (appstate._comment || appstate._instructions || !Array.isArray(appstate)) {
            console.error('❌ Le fichier appstate.json contient des données d\'exemple.');
            console.log('📝 Veuillez remplacer le contenu par votre vrai appstate Facebook.');
            return;
        }
    } catch (error) {
        console.error('❌ Erreur lors de la lecture du fichier appstate.json:', error.message);
        return;
    }
    
    // Connexion à Facebook
    login({ appState: appstate }, (err, fbApi) => {
        if (err) {
            console.error('❌ Erreur de connexion à Facebook:', err);
            console.log('🔄 Vérifiez que votre appstate est valide et à jour.');
            return;
        }
        
        api = fbApi;
        
        // Initialiser les modules après la connexion
        anilistCommands = new AniListCommands();
        groupManagement = new GroupManagement(api, storage);
        enhancedCommands = new EnhancedCommands(api, storage);
        
        console.log('✅ Connexion à Facebook réussie !');
        console.log('🤖 Bot de classement V.V.V en ligne');
        
        // Écouter les événements
        api.listen((err, event) => {
            if (err) {
                // Ignorer les erreurs de parsing non critiques
                if (err.type === 'parse_error' || err.error?.includes('Problem parsing')) {
                    return; // Ignorer silencieusement
                }
                console.error('❌ Erreur critique lors de l\'écoute:', err);
                return;
            }
            
            if (botConfig.enableLogging && event.type === 'message') {
                console.log(`📨 Message reçu de ${event.senderID} dans ${event.threadID}`);
            }
            
            handleEvent(event);
        });
        
        console.log('┌─────────────────────────────────────────────────┐');
        console.log('│                                                 │');
        console.log('│  🤖 BOT DE CLASSEMENT V.V.V FACEBOOK v2.0      │');
        console.log('│                                                 │');
        console.log('├─────────────────────────────────────────────────┤');
        console.log('│  ✅ Connexion Facebook établie                  │');
        console.log('│  👂 En écoute des messages et commandes         │');
        console.log('│  📊 Préfixe des commandes: ' + botConfig.commandPrefix.padEnd(18) + ' │');
        console.log('│  👑 Super Admin ID: ' + SUPER_ADMIN_ID.padEnd(22) + ' │');
        console.log('│  🏆 Développé pour le groupe V.V.V             │');
        console.log('│                                                 │');
        console.log('└─────────────────────────────────────────────────┘');
        console.log('');
        console.log('🚀 Fonctionnalités disponibles:');
        console.log('   • Traitement automatique des quiz');
        console.log('   • Gestion complète du classement');
        console.log('   • Support des scores négatifs');
        console.log('   • Mémoire des noms fusionnés');
        console.log('   • Détection intelligente de doublons');
        console.log('   • Commandes administrateur avancées');
        console.log('');
        console.log('💬 Tapez ' + botConfig.commandPrefix + 'menu pour voir toutes les commandes');
    });
}

// ===================== DÉMARRAGE =====================
// Démarrer le serveur keep-alive
keepAlive();
startPinging();

// Initialiser le bot
initializeBot();

// Gestion des erreurs
process.on('uncaughtException', (err) => {
    console.error('💥 Erreur non gérée:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚫 Promesse rejetée non gérée:', reason);
});
