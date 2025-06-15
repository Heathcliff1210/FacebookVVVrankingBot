class GroupManagement {
    constructor(api, storage) {
        this.api = api;
        this.storage = storage;
        this.deletedMessages = new Map(); // Stockage temporaire des messages supprimés
    }

    // Commande !add - Ajouter une personne au groupe
    async addUserToGroup(threadID, userIds, adminId) {
        try {
            if (!this.storage.isAdmin(adminId)) {
                return '❌ Seuls les administrateurs peuvent ajouter des membres.';
            }

            if (!userIds || userIds.length === 0) {
                return '❌ Veuillez mentionner les utilisateurs à ajouter ou fournir leurs IDs.';
            }

            const results = [];
            for (const userId of userIds) {
                try {
                    await this.api.addUserToGroup(userId, threadID);
                    
                    // Obtenir les informations de l'utilisateur ajouté
                    const userInfo = await this.api.getUserInfo(userId);
                    const userName = userInfo[userId]?.name || 'Utilisateur inconnu';
                    
                    results.push(`✅ ${userName} a été ajouté au groupe`);
                    
                    // Message de bienvenue personnalisé
                    setTimeout(() => {
                        const welcomeMessage = `🎉 Bienvenue ${userName} dans le groupe V.V.V !

🤖 Je suis le bot de gestion de classement. Voici quelques commandes utiles:
• !menu - Voir toutes les commandes
• !classement - Voir le classement actuel
• !anime [nom] - Rechercher un anime
• !help - Aide détaillée

Amusez-vous bien ! 🎌`;
                        
                        this.api.sendMessage(welcomeMessage, threadID);
                    }, 2000);
                    
                } catch (error) {
                    console.error(`Erreur ajout utilisateur ${userId}:`, error);
                    results.push(`❌ Impossible d'ajouter l'utilisateur ${userId}: ${error.message}`);
                }
            }

            return results.join('\n');

        } catch (error) {
            console.error('Erreur addUserToGroup:', error);
            return '❌ Erreur lors de l\'ajout des membres au groupe.';
        }
    }

    // Écouter les événements de suppression de messages
    handleMessageDelete(event) {
        try {
            console.log('Event de suppression détecté:', event.type, event);
            
            if (event.type === 'message_unsent' || event.type === 'message_reaction') {
                // Gestion des messages supprimés
                const messageData = {
                    messageID: event.messageID,
                    senderID: event.senderID,
                    deletedBy: event.deletedBy || event.senderID,
                    originalMessage: event.body || event.messageBody || 'Message supprimé',
                    timestamp: new Date(),
                    threadID: event.threadID,
                    attachments: event.attachments || []
                };

                // Stocker le message supprimé
                this.deletedMessages.set(event.messageID, {
                    type: 'message_deletion',
                    ...messageData
                });

                // Envoyer la notification de suppression
                this.sendDeleteNotification(event.threadID, 'message_deletion', messageData);
                
            } else if (event.logMessageType === 'log:unsubscribe') {
                // Gestion des membres supprimés du groupe
                const deletedUserIds = event.logMessageData.leftParticipantFbId;
                const deletedBy = event.author;
                const timestamp = new Date();

                // Enregistrer l'événement de suppression
                this.deletedMessages.set(`kick_${event.threadID}_${timestamp.getTime()}`, {
                    type: 'member_removal',
                    deletedUsers: deletedUserIds,
                    deletedBy: deletedBy,
                    timestamp: timestamp,
                    threadID: event.threadID
                });

                // Envoyer le message de notification
                this.sendDeleteNotification(event.threadID, 'member_removal', {
                    deletedUsers: deletedUserIds,
                    deletedBy: deletedBy,
                    timestamp: timestamp
                });
            }

        } catch (error) {
            console.error('Erreur handleMessageDelete:', error);
        }
    }

    // Envoyer une notification de suppression
    async sendDeleteNotification(threadID, type, data) {
        try {
            let notificationMessage = '';

            if (type === 'message_deletion') {
                // Obtenir les informations des utilisateurs
                const senderInfo = await this.api.getUserInfo(data.senderID);
                const deletedByInfo = await this.api.getUserInfo(data.deletedBy);
                
                const senderName = senderInfo[data.senderID]?.name || 'Utilisateur inconnu';
                const deletedByName = deletedByInfo[data.deletedBy]?.name || 'Utilisateur inconnu';
                
                const timeStr = data.timestamp.toLocaleTimeString('fr-FR');
                const dateStr = data.timestamp.toLocaleDateString('fr-FR');
                
                let attachmentInfo = '';
                if (data.attachments && data.attachments.length > 0) {
                    const attachmentTypes = data.attachments.map(att => {
                        if (att.type === 'photo') return '📷 Photo';
                        if (att.type === 'video') return '🎥 Vidéo';
                        if (att.type === 'audio') return '🎵 Audio';
                        if (att.type === 'file') return '📎 Fichier';
                        if (att.type === 'sticker') return '😀 Sticker';
                        return '📎 Pièce jointe';
                    });
                    attachmentInfo = `\n📎 Contenait: ${attachmentTypes.join(', ')}`;
                }

                notificationMessage = `━━━━━━━◇◆◇━━━━━━━
𝐐𝐔'𝐄𝐒𝐓 𝐂𝐄 𝐐𝐔𝐄 𝐓𝐔 𝐄𝐒𝐒𝐀𝐈𝐄𝐒 𝐃𝐄 𝐂𝐀𝐂𝐇𝐄𝐑 ?

👤 Auteur du message: ${senderName}
🗑️ Supprimé par: ${deletedByName}
🕐 Heure: ${timeStr} - ${dateStr}
📝 Message ID: ${data.messageID}

💬 Contenu supprimé:
"${data.originalMessage}"${attachmentInfo}

🔍 Action détectée et enregistrée par le bot V.V.V
━━━━━━━◇◆◇━━━━━━━`;

            } else if (type === 'member_removal') {
                // Obtenir les informations des utilisateurs supprimés
                const deletedByInfo = await this.api.getUserInfo(data.deletedBy);
                const deletedByName = deletedByInfo[data.deletedBy]?.name || 'Utilisateur inconnu';
                
                let deletedUsersNames = [];
                for (const userId of data.deletedUsers) {
                    try {
                        const userInfo = await this.api.getUserInfo(userId);
                        deletedUsersNames.push(userInfo[userId]?.name || `ID: ${userId}`);
                    } catch (error) {
                        deletedUsersNames.push(`ID: ${userId}`);
                    }
                }

                const timeStr = data.timestamp.toLocaleTimeString('fr-FR');
                const dateStr = data.timestamp.toLocaleDateString('fr-FR');

                notificationMessage = `━━━━━━━◇◆◇━━━━━━━
𝐐𝐔'𝐄𝐒𝐓 𝐂𝐄 𝐐𝐔𝐄 𝐓𝐔 𝐄𝐒𝐒𝐀𝐈𝐄𝐒 𝐃𝐄 𝐂𝐀𝐂𝐇𝐄𝐑 ?

👥 Membre(s) supprimé(s): ${deletedUsersNames.join(', ')}
🗑️ Supprimé par: ${deletedByName}
🕐 Heure: ${timeStr} - ${dateStr}

𝘓𝘦𝘴 𝘧𝘭𝘢𝘮𝘮𝘦𝘴 𝘥𝘦𝘴𝘤𝘦𝘯𝘥𝘢𝘯𝘵𝘦𝘴 𝘴𝘰𝘯𝘵 𝘭𝘦 𝘴𝘰𝘶𝘧𝘧𝘭𝘦 𝘥𝘦 𝘭'𝘢̂𝘮𝘦. 
𝘓𝘢 𝘧𝘶𝘮𝘦́𝘦 𝘯𝘰𝘪𝘳𝘦 𝘭𝘪𝘣𝘦̀𝘳𝘦 𝘭𝘦𝘴 𝘢̂𝘮𝘦𝘴. 
𝘗𝘰𝘶𝘴𝘴𝘪𝘦̀𝘳𝘦 𝘵𝘶 𝘳𝘦𝘥𝘦𝘷𝘪𝘦𝘯𝘴 𝘱𝘰𝘶𝘴𝘴𝘪𝘦̀𝘳𝘦, 
𝘦𝘵 𝘵𝘰𝘯 𝘢̂𝘮𝘦 𝘥𝘦́𝘭𝘪𝘷𝘳𝘦́𝘦 𝘳𝘦𝘵𝘰𝘶𝘳𝘯𝘦𝘳𝘢 𝘥𝘢𝘯𝘴 𝘭𝘦𝘴 𝘧𝘭𝘢𝘮𝘮𝘦𝘴 𝘢𝘳𝘥𝘦𝘯𝘵𝘦𝘴. 
𝙇𝙖𝙩𝙪𝙢.

🔍 Action détectée et enregistrée par le bot V.V.V
━━━━━━━◇◆◇━━━━━━━`;
            }

            if (notificationMessage) {
                setTimeout(() => {
                    this.api.sendMessage(notificationMessage, threadID);
                }, 1000);
            }

        } catch (error) {
            console.error('Erreur sendDeleteNotification:', error);
        }
    }

    // Commande pour voir les messages supprimés récents
    getRecentDeletedMessages(threadID, limit = 10) {
        try {
            const threadMessages = Array.from(this.deletedMessages.values())
                .filter(msg => msg.threadID === threadID)
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, limit);

            if (threadMessages.length === 0) {
                return '📭 Aucun message supprimé récemment dans ce groupe.';
            }

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

            let response = `🗑️ ${toBoldUnicode('MESSAGES SUPPRIMÉS RÉCENTS')}\n\n`;

            threadMessages.forEach((msg, index) => {
                const timeStr = msg.timestamp.toLocaleTimeString('fr-FR');
                const dateStr = msg.timestamp.toLocaleDateString('fr-FR');

                if (msg.type === 'message_deletion') {
                    response += `${index + 1}. 💬 ${toBoldUnicode('Message supprimé')}\n`;
                    response += `   📅 ${dateStr} à ${timeStr}\n`;
                    response += `   👤 Auteur: ${msg.senderID}\n`;
                    response += `   🗑️ Supprimé par: ${msg.deletedBy}\n`;
                    response += `   📝 Contenu: "${msg.originalMessage}"\n\n`;
                } else if (msg.type === 'member_removal') {
                    response += `${index + 1}. 👥 ${toBoldUnicode('Membre supprimé')}\n`;
                    response += `   📅 ${dateStr} à ${timeStr}\n`;
                    response += `   👤 Membre(s): ${msg.deletedUsers.join(', ')}\n`;
                    response += `   🗑️ Supprimé par: ${msg.deletedBy}\n\n`;
                }
            });

            return response;

        } catch (error) {
            console.error('Erreur getRecentDeletedMessages:', error);
            return '❌ Erreur lors de la récupération des messages supprimés.';
        }
    }

    // Nettoyer les anciens messages supprimés (appeler périodiquement)
    cleanOldDeletedMessages() {
        try {
            const now = new Date();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes

            for (const [messageId, messageData] of this.deletedMessages) {
                if (now - messageData.timestamp > maxAge) {
                    this.deletedMessages.delete(messageId);
                }
            }

        } catch (error) {
            console.error('Erreur cleanOldDeletedMessages:', error);
        }
    }

    // Obtenir les statistiques de suppression pour un groupe
    getGroupDeletionStats(threadID) {
        try {
            const threadMessages = Array.from(this.deletedMessages.values())
                .filter(msg => msg.threadID === threadID);

            const messageDeletions = threadMessages.filter(msg => msg.type === 'message_deletion');
            const memberRemovals = threadMessages.filter(msg => msg.type === 'member_removal');

            const deletionsByUser = {};
            messageDeletions.forEach(msg => {
                deletionsByUser[msg.deletedBy] = (deletionsByUser[msg.deletedBy] || 0) + 1;
            });

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

            let response = `📊 ${toBoldUnicode('STATISTIQUES DE SUPPRESSION')}\n\n`;
            response += `💬 Messages supprimés: ${messageDeletions.length}\n`;
            response += `👥 Membres supprimés: ${memberRemovals.length}\n\n`;

            if (Object.keys(deletionsByUser).length > 0) {
                response += `🗑️ ${toBoldUnicode('Top suppressions par utilisateur:')}\n`;
                const sortedDeletions = Object.entries(deletionsByUser)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5);

                sortedDeletions.forEach(([userId, count], index) => {
                    response += `${index + 1}. ID ${userId}: ${count} suppressions\n`;
                });
            }

            return response;

        } catch (error) {
            console.error('Erreur getGroupDeletionStats:', error);
            return '❌ Erreur lors du calcul des statistiques.';
        }
    }
}

module.exports = GroupManagement;