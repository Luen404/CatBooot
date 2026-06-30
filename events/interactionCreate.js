module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch(error) {
            console.error(error)
            const replyOptions = { content: '명령어 실행중 오류발생', ephmeral: true};
            if (interaction.replied || interaction.deferred) {
                await interaction.followup(replyOptions);
            }   else {
                await interaction.reply(replyOptions);
            }
        }
    },
};