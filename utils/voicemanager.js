const fs = require('fs');
const path = require('path');
const DailyMissionManager = require('./DailyMissionManager');

const usersPath = path.join(__dirname, '../data/users.json');
const configPath = path.join(__dirname, '../data/PointConfig.json');

function readJson(filePath, defaultData = {}) {
    try {
        if (!fs.existsSync(filePath)) return defaultData;
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
        console.error(`JSON 읽기 오류 (${filePath}):`, err);
        return defaultData;
    }
}
function saveJson(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
    } catch (err) {
        console.error(`JSON 저장 오류 (${filePath}):`, err);
    }
}

class VoiceManager {
    constructor() {
        this.voiceTimers = new Map();
        this.voiceSessions = new Map();
    }

    startSession(userId, userTag) {
        this.clearTimer(userId);

        this.voiceSessions.set(userId, Date.now());

        const intervalId = setInterval(() => {
            this.addVoicePoint(userId, userTag);
        }, 60000);

        this.voiceTimers.set(userId, intervalId);
    }

    async endSession(userId, client) {
        this.clearTimer(userId);

        const startTime = this.voiceSessions.get(userId);
        if (!startTime) return;

        this.voiceSessions.delete(userId);

        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);

        if (minutes > 0) {
            await this.processDailyMission(userId, minutes, client);
        }
    }

    clearTimer(userId) {
        if (this.voiceTimers.has(userId)) {
            clearInterval(this.voiceTimers.get(userId));
            this.voiceTimers.delete(userId);
        }
    }

    addVoicePoint(userId, userTag) {
        const config = readJson(configPath, { messagePoint: 1, voicePoint: 5 });
        if (config.voicePoint <= 0) return;

        const users = readJson(usersPath, {});

        if (!users[userId]) {
            users[userId] = { tag: userTag, Ticket: 0, Point: 0 };
        }

        if (users[userId].Point === undefined) {
            users[userId].Point = 0;
        }

        users[userId].Point += config.voicePoint;
        saveJson(usersPath, users);
    }

    async processDailyMission(userId, minutes, client) {
        const result = DailyMissionManager.addVoiceTime(userId, minutes);
        if (result && result.completed && !result.alreadyCompleted) {
            await DailyMissionManager.completeMission(userId, 'voice', client);
        }
    }
}

module.exports = new VoiceManager();