module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        
        if (!command) return;

        try {
            await command.execute(interaction, client);
        } catch (err) {
            console.error(err);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '에러 발생',
                    ephemeral: true,
                });
            }
        }
    }
};