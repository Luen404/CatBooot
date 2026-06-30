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

const voiceConnections = new Map();

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        if (oldState.member.user.bot) return;

        const userId = newState.member.id;
        const userTag = newState.member.user.tag;

        if (!oldState.channelId && newState.channelId) {
            voiceConnections.set(userId, Date.now());
        } 
        
        else if (oldState.channelId && !newState.channelId) {
            const joinTime = voiceConnections.get(userId);
            if (!joinTime) return;

            const totalTimeMs = Date.now() - joinTime;
            const totalMinutes = Math.floor(totalTimeMs / 60000);

            voiceConnections.delete(userId);

            if (totalMinutes > 0) {
                const config = readJson(configPath, { messagePoint: 1, voicePoint: 5 });
                if (config.voicePoint <= 0) return;

                const users = readJson(usersPath, {});

                if (!users[userId]) {
                    users[userId] = {
                        tag: userTag,
                        Ticket: 0,
                        Point: 0
                    };
                }

                if (users[userId].Point === undefined) {
                    users[userId].Point = 0;
                }

                users[userId].Point += (totalMinutes * config.voicePoint);
                saveJson(usersPath, users);
            }
        }
    }
};