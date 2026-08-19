const { Events } = require('discord.js');
const VoiceMissionUtil = require('../utils/VoiceMissionUtil');
const VoiceRewardUtil = require('../utils/VoiceRewardUtil');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const userId = newState.member.id;
        
        if (newState.member.user.bot) return;

        const oldChannel = oldState.channelId;
        const newChannel = newState.channelId;

        if (!oldChannel && newChannel) {
            VoiceMissionUtil.handleJoin(userId);
            VoiceRewardUtil.handleJoin(userId);
        }
        else if (oldChannel && !newChannel) {
            VoiceMissionUtil.handleLeave(userId);
            VoiceRewardUtil.handleLeave(userId);
        }
    }
};