const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const TrashManager = require('../utils/TrashManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('쓰레기통')
        .setDescription('냥냥코인을 사용해 쓰레기통을 뒤져 아이템을 획득합니다'),

    async execute(interaction) {
        const result = TrashManager.searchTrash(
            interaction.user.id
        );

        if (!result.success) {
            if (result.reason === 'NO_COIN') {
                return interaction.reply({
                    content: '🪙 냥냥코인이 없습니다.',
                    ephemeral: true
                });
            }

            return interaction.reply({
                content: '쓰레기통을 뒤질 수 없습니다.',
                ephemeral: true
            });
        }

        const item = result.item;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ 냥냥 쓰레기통')
            .setDescription(
                `쓰레기통을 뒤졌습니다!\n\n` +
                `${item.emoji} **${item.name}**을 발견했습니다!\n\n` +
                `판매 가격: **${item.value}P**\n\n` +
                `🪙 남은 냥냥코인: **${result.remainingCoin}**`
            )

        await interaction.reply({
            embeds: [embed]
        });
    }
};