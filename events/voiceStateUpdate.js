const VoiceManager = require('../utils/VoiceManager');

module.exports = {
    name: 'voiceStateUpdate',

    async execute(oldState, newState) {
        if (newState.member?.user?.bot) return;

        const userId = newState.member.id;
        const userTag = newState.member.user.tag;

        const oldChannel = oldState.channelId;
        const newChannel = newState.channelId;

        if (oldChannel === newChannel) return;

        if (oldChannel && (!newChannel || oldChannel !== newChannel)) {
            await VoiceManager.endSession(userId, newState.client);
        }

        if (newChannel) {
            VoiceManager.startSession(userId, userTag);
        }
    }
};