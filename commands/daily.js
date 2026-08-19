const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const DailyMissionManager = require('../utils/DailyMissionManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('일일미션')
        .setDescription('오늘의 일일 미션을 확인합니다.'),

    async execute(interaction) {
        const userId = interaction.user.id;

        const data = DailyMissionManager.getMissionProgress(userId);

        const missionEmojis = {
            chat: '💬',
            voice: '🎙️',
            blackjack: '🎰',
            sentence: '📝'
        };

        const lines = [];

        for (let i = 0; i < data.missions.length; i++) {
            const mission = data.missions[i];

            const progress = Math.min(
                data.user.progress[mission.id] || 0,
                mission.target
            );

            const completed = data.user.completed.includes(
                mission.id
            );

            const emoji = missionEmojis[mission.id] || '🐱';

            lines.push(
                `**${i + 1}. ${emoji} ${mission.name}**`
            );

            if (mission.id === 'sentence') {
                lines.push(
                    `문장: **${mission.sentence || '설정된 문장이 없습니다.'}**`
                );
            } else {
                lines.push(mission.description);
            }

            lines.push(
                `진행도: **${progress} / ${mission.target}**`
            );

            lines.push(
                completed
                    ? '✅ 완료'
                    : '❌ 미완료'
            );

            lines.push('');
        }

        const completedCount = data.user.completed.filter(
            id => data.missions.some(mission => mission.id === id)
        ).length;

        const embed = new EmbedBuilder()
            .setTitle('🐱 오늘의 일일 미션')
            .setDescription(lines.join('\n'))
            .addFields({
                name: '미션 진행',
                value: `**${completedCount} / ${data.missions.length}** 완료`
            })

        await interaction.reply({
            embeds: [embed]
        });
    }
};