client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(err);

        if (interaction.replied || interaction.deferred) return;

        await interaction.reply({
            content: '명령어 실행 중 오류 발생',
            ephemeral: true,
        });
    }
});