module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.log('커맨드 없음:', interaction.commandName);
            return;
        }

        try {
            console.log('실행:', interaction.commandName);
            await command.execute(interaction, client);
        } catch (err) {
            console.error(err);

            if (interaction.replied || interaction.deferred) return;

            await interaction.reply({
                content: '에러 발생',
                ephemeral: true,
            });
        }
    });
};