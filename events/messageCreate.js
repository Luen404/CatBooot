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
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    name: 'messageCreate',

    async execute(message, client) {
        if (!message.guild) return;
        if (message.author.bot) return;

        const config = readJson(configPath, {
            messagePoint: 1,
            voicePoint: 5
        });

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

        if (config.messagePoint > 0) {
            users[userId].Point += config.messagePoint;
        }

        saveJson(usersPath, users);

        const result = DailyMissionManager.addProgress(
            userId,
            'chat',
            1
        );

        if (result.completed && !result.alreadyCompleted) {
            await DailyMissionManager.completeMission(
                userId,
                'chat',
                client
            );
        }

        if (
            config.mainChannelId &&
            message.channel.id === config.mainChannelId
        ) {
            const sentence = DailyMissionManager.getSentence();

            if (
                sentence &&
                message.content.trim() === sentence.trim()
            ) {
                const sentenceResult = DailyMissionManager.addProgress(
                    userId,
                    'sentence',
                    1
                );

                if (
                    sentenceResult.completed &&
                    !sentenceResult.alreadyCompleted
                ) {
                    await DailyMissionManager.completeMission(
                        userId,
                        'sentence',
                        client
                    );
                }
            }
        }
    }
};