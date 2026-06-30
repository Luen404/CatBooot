const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../data/PointConfig.json');

function readConfig() {
    if (!fs.existsSync(configPath)) {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify({ messagePoint: 1, voicePoint: 5 }, null, 4));
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function saveConfig(data) {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('포인트설정')
        .setDescription('채팅 및 음성 통화로 획득할 포인트를 설정합니다 (관리자 전용)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option =>
            option.setName('채팅포인트')
                .setDescription('채팅 1회당 지급할 포인트')
                .setRequired(true)
                .setMinValue(0))
        .addIntegerOption(option =>
            option.setName('음성포인트')
                .setDescription('음성 채널 통화 1분당 지급할 포인트')
                .setRequired(true)
                .setMinValue(0)),

    async execute(interaction) {
        const messagePoint = interaction.options.getInteger('채팅포인트');
        const voicePoint = interaction.options.getInteger('음성포인트');

        const config = {
            messagePoint: messagePoint,
            voicePoint: voicePoint
        };

        saveConfig(config);

        await interaction.reply({
            content: `포인트 지급 설정이 완료되었습니다. 채팅당: ${messagePoint}포인트, 음성 분당: ${voicePoint}포인트`
        });
    }
};