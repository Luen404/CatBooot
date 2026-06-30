const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../data/Percent.json');

function readConfig() {
    if (!fs.existsSync(configPath)) {
        return { items: [] };
    }

    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('확률표')
        .setDescription('현재 등록된 뽑기 확률표를 확인합니다.'),

    async execute(interaction) {

        const config = readConfig();

        if (!config.items.length) {
            return interaction.reply({
                content: '등록된 품목이 없습니다.',
                ephemeral: true
            });
        }

        const sortedItems = [...config.items].sort((a, b) => b.chance - a.chance);

        const list = sortedItems
            .map((item, index) => {
                return `${item.name} 확률 : ${item.chance}%`;
            })
            .join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('뽑기 확률표')
            .setColor(0x5865F2)
            .setDescription(list)
            
        await interaction.reply({
            embeds: [embed]
        });
    }
};