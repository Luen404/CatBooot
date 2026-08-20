const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const DailyMissionManager = require('../utils/DailyMissionManager');
const usersPath = path.join(process.cwd(), 'data', 'users.json');

function readJson(filePath, defaultData = {}) {
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4));
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

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

        const isAllCompleted = data.missions.length > 0 && completedCount === data.missions.length;
        let rewardGivenText = '';

        if (isAllCompleted) {
            let users = readJson(usersPath, {});

            if (!users[userId]) {
                users[userId] = { Point: 0, Ticket: 0, coin: 0 };
            }

            if (!data.user.allMissionsRewarded) {
                users[userId].coin = (users[userId].coin || 0) + 2;
                data.user.allMissionsRewarded = true;

                saveJson(usersPath, users);
                DailyMissionManager.saveData();

                rewardGivenText = '\n🎁 **모든 미션 완료! 코인 2개가 지급되었습니다!**';
            } else {
                rewardGivenText = '\n🎉 **모든 미션 완료 보상 수령 완료 (코인 +1)**';
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🐱 오늘의 일일 미션')
            .setDescription(lines.join('\n'))
            .addFields({
                name: '미션 진행',
                value: `**${completedCount} / ${data.missions.length}** 완료${rewardGivenText}`
            })
            .setColor(isAllCompleted ? 0x57F287 : 0x5865F2);

        await interaction.reply({
            embeds: [embed]
        });
    }
};