module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        console.log('1 command:', interaction.commandName);
        console.log('2 found:', !!command);

        if (!command) return;

        try {
            await command.execute(interaction, client);
            console.log('3 executed');
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