module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error('커맨드 실행 오류:', error);

            if (interaction.replied || interaction.deferred) return;

            await interaction.reply({
                content: '명령어 실행  중 오류가 발생했습니다.',
                ephemeral: true,
            });
        }
    })
};