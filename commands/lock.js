const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('타임아웃')
        .setDescription('유저를 일정 시간 동안 타임아웃 처리합니다.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('대상')
                .setDescription('타임아웃할 유저를 선택하세요.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('시간')
                .setDescription('타임아웃 시간(초 단위)을 입력하세요.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('사유')
                .setDescription('타임아웃 사유를 입력하세요.')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getMember('대상');
        const durationInSeconds = interaction.options.getInteger('시간');
        const reason = interaction.options.getString('사유') || '';

        if (!target) {
            return interaction.reply({ content: '서버에 있는 유저만 타임아웃할 수 있습니다.', ephemeral: true });
        }

        if (!target.manageable) {
            return interaction.reply({ content: '이 유저를 타임아웃할 권한이 없습니다.', ephemeral: true });
        }

        try {
            const durationInMs = durationInSeconds * 1000;

            await target.timeout(durationInMs, `${interaction.user.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setTitle('옥문강')
                .setDescription(`${target.user.tag}님이 옥문강에 갇혔습니다. ${durationInSeconds}초 뒤 해방`)
                .addFields({ value: reason })
                .setImage('https://klipy.com/gifs/prison-realm-jujutsu-kaisen-1');

            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '타임아웃 처리 중 오류가 발생했습니다.', ephemeral: true });
        }
    },
};