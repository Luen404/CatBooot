const DailyMissionManager = require('./DailyMissionManager');

const voiceJoinTimes = new Map();

module.exports = {
    handleJoin(userId) {
        if (!voiceJoinTimes.has(userId)) {
            voiceJoinTimes.set(userId, Date.now());
        }
    },

    handleLeave(userId) {
        const joinTime = voiceJoinTimes.get(userId);
        if (!joinTime) return;

        const durationMs = Date.now() - joinTime;
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        
        voiceJoinTimes.delete(userId);

        if (durationMinutes > 0) {
            DailyMissionManager.addProgress(userId, 'voice', durationMinutes);
        }
    }
};