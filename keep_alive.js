const http = require('http');

// Serveur HTTP simple pour maintenir le bot actif
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 Bot de Classement Facebook - En ligne\n');
});

function keepAlive() {
    server.listen(3000, () => {
        console.log('✅ Serveur keep-alive démarré sur le port 3000');
    });
}

function startPinging() {
    // Ping périodique pour maintenir la connexion
    setInterval(() => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            // Ping réussi, ne rien faire
        });

        req.on('error', (err) => {
            // Erreur de ping, mais on continue
        });

        req.end();
    }, 300000); // Toutes les 5 minutes
}

module.exports = { keepAlive, startPinging };
