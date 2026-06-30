const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');
const configPath = path.join(__dirname, '../data/PointConfig.json');

function readJson(filePath, defaultData = {}) {
    if (!fs.existsSync(filePath)) {
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const config = readJson(configPath, { messagePoint: 1, voicePoint: 5 });
        if (config.messagePoint <= 0) return;

        const users = readJson(usersPath, {});
        const userId = message.author.id;

        if (!users[userId]) {
            users[userId] = {
                tag: message.author.tag,
                Ticket: 0,
                Point: 0
            };
        }

        if (users[userId].Point === undefined) {
            users[userId].Point = 0;
        }

        users[userId].Point += config.messagePoint;
        saveJson(usersPath, users);
    }
};