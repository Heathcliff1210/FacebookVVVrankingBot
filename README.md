# FacebookVVVrankingBot 🤖

Bot Facebook Messenger développé spécifiquement pour la gestion des classements et quiz dans les groupes V.V.V. Ce bot intelligent facilite l'organisation et le suivi des activités de la communauté.

## 🌟 Fonctionnalités principales

### Gestion des classements
- 📊 Système de classement complet avec support multi-catégories
- 🔄 Support des scores positifs et négatifs
- 🎯 Détection intelligente des doublons
- 🔄 Système de fusion de noms (`!merge`)
- 📈 Affichage du top X joueurs (`!top`)
- 📋 Classement complet (`!classement`)

### Quiz et Modération
- 📝 Traitement automatique des quiz
- 👥 Gestion avancée des administrateurs
- 🚫 Système de kick/expulsion
- 📜 Historique des modérations

### Administration et Maintenance
- 💾 Système de sauvegarde et restauration
- 📊 Statistiques détaillées du bot (`!botinfo`)
- ⚡ Vérification de santé du système (`!health`)
- ⏱️ Surveillance du temps de fonctionnement (`!uptime`)

## 🔧 Installation

1. Clonez le dépôt :
```bash
git clone https://github.com/Heathcliff1210/FacebookVVVrankingBot.git
cd FacebookVVVrankingBot
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez le fichier `appstate.json` :
   - Créez un fichier `appstate.json` à la racine du projet
   - Utilisez une extension comme "c3c-fbstate" pour extraire votre appstate Facebook
   - Collez le contenu dans le fichier

## ⚙️ Configuration

Le bot utilise plusieurs fichiers de configuration :
- `appstate.json` : Données d'authentification Facebook
- `config.js` : Configuration générale du bot (préfixe des commandes, options)

## 🚀 Démarrage

```bash
node index.js
```

## 📝 Commandes principales

- `!menu` ou `!help` : Affiche la liste des commandes
- `!classement` : Affiche le classement complet
- `!top X` : Affiche les X premiers du classement
- `!merge [nom1] [nom2]` : Fusionne deux noms dans le classement
- `!botinfo` : Affiche les informations techniques du bot
- `!health` : Vérifie l'état du système
- `!backup` : Crée une sauvegarde du classement
- `!restore [nom_fichier]` : Restaure une sauvegarde

## 🔒 Commandes administrateur

- `!addadmin @utilisateur` : Ajoute un administrateur
- `!removeadmin @utilisateur` : Supprime un administrateur
- `!kick @utilisateur` : Expulse un utilisateur
- `!setleaderboard` : Configure le classement
- `!listadmins` : Liste les administrateurs

## 🛠️ Dépendances

- Node.js ≥ 14.x
- rapido-fca : ^0.0.3
- axios : ^1.10.0
- moment : ^2.30.1
- node-fetch : ^3.3.2

## 👥 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/ma-fonctionnalite`)
3. Committez vos changements (`git commit -am 'Ajout d'une nouvelle fonctionnalité'`)
4. Poussez vers la branche (`git push origin feature/ma-fonctionnalite`)
5. Créez une Pull Request

## 📄 Licence

Ce projet est sous licence ISC - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🔗 Version

Version actuelle : 2.1.0

## ⚠️ Note importante

Ce bot est développé exclusivement pour une utilisation dans les groupes V.V.V. Certaines fonctionnalités sont spécifiques à cette communauté.

---

> Pour toute question ou problème, n'hésitez pas à ouvrir une issue dans ce dépôt.
