const fs = require('fs');
const path = require('path');
const DailyMissionManager = require('../utils/DailyMissionManager');

const usersPath = path.join(__dirname, '../data/users.json');
const configPath = path.join(__dirname, '../data/PointConfig.json');

function readJson(filePath, defaultData = {}) {
    if (!fs.existsSync(filePath)) {
        return defaultData;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(data, null, 4),
        'utf-8'
    );
}

const voiceTimers = new Map();
const voiceSessions = new Map();

module.exports = {
    name: 'voiceStateUpdate',

    async execute(oldState, newState) {
        if (newState.member?.user?.bot) {
            return;
        }

        const userId = newState.member.id;
        const userTag = newState.member.user.tag;

        const oldChannel = oldState.channelId;
        const newChannel = newState.channelId;

        if (!oldChannel && newChannel) {
            if (voiceTimers.has(userId)) {
                clearInterval(voiceTimers.get(userId));
            }

            voiceSessions.set(userId, Date.now());

            const intervalId = setInterval(() => {
                const config = readJson(configPath, {
                    messagePoint: 1,
                    voicePoint: 5
                });

                if (config.voicePoint <= 0) {
                    return;
                }

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

            return;
        }

        if (oldChannel && !newChannel) {
            const intervalId = voiceTimers.get(userId);

            if (intervalId) {
                clearInterval(intervalId);
                voiceTimers.delete(userId);
            }

            const startTime = voiceSessions.get(userId);

            if (!startTime) {
                return;
            }

            voiceSessions.delete(userId);

            const elapsed = Date.now() - startTime;
            const minutes = Math.floor(elapsed / 60000);

            if (minutes <= 0) {
                return;
            }

            const result = DailyMissionManager.addVoiceTime(
                userId,
                minutes
            );

            if (result.completed && !result.alreadyCompleted) {
                await DailyMissionManager.completeMission(
                    userId,
                    'voice',
                    newState.client
                );
            }

            return;
        }

        if (oldChannel !== newChannel) {
            const startTime = voiceSessions.get(userId);

            if (!startTime) {
                voiceSessions.set(userId, Date.now());
                return;
            }

            const elapsed = Date.now() - startTime;
            const minutes = Math.floor(elapsed / 60000);

            voiceSessions.set(userId, Date.now());

            if (minutes <= 0) {
                return;
            }

            const result = DailyMissionManager.addVoiceTime(
                userId,
                minutes
            );

            if (result.completed && !result.alreadyCompleted) {
                await DailyMissionManager.completeMission(
                    userId,
                    'voice',
                    newState.client
                );
            }
        }
    }
};