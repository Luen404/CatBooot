const DailyMissionManager = require('./DailyMissionManager');

// 유저별 음성채널 입장 시간 기록 (메모리 저장)
const voiceJoinTimes = new Map();

module.exports = {
    // 음성 채널 입장 시
    handleJoin(userId) {
        voiceJoinTimes.set(userId, Date.now());
    },

    // 음성 채널 퇴장 시 (분 단위 계산 후 미션 반영)
    handleLeave(userId) {
        const joinTime = voiceJoinTimes.get(userId);
        if (!joinTime) return;

        const durationMinutes = Math.floor((Date.now() - joinTime) / (1000 * 60));
        voiceJoinTimes.delete(userId);

        if (durationMinutes > 0) {
            DailyMissionManager.addProgress(userId, 'voice', durationMinutes);
        }
    }
};