module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.log('커맨드 없음:', interaction.commandName);
            return;
        }

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
        console.log('1 command:', interaction.commandName);
console.log('2 found:', !!command);
console.log('3 executed');
    });
};