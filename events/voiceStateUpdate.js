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

const voiceTimers = new Map();

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        if (oldState.member.user.bot) return;

        const userId = newState.member.id;
        const userTag = newState.member.user.tag;

        if (!oldState.channelId && newState.channelId) {
            if (voiceTimers.has(userId)) {
                clearInterval(voiceTimers.get(userId));
            }

            const intervalId = setInterval(() => {
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

                users[userId].Point += config.voicePoint;
                saveJson(usersPath, users);
            }, 60000);

            voiceTimers.set(userId, intervalId);
        } 
        
        else if (oldState.channelId && !newState.channelId) {
            const intervalId = voiceTimers.get(userId);
            if (intervalId) {
                clearInterval(intervalId);
                voiceTimers.delete(userId);
            }
        }
    }
};