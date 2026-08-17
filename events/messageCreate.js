const { Events } = require('discord.js');

const IF_BOT_ID = '693818502657867878';

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        console.log('메시지 감지:', message.author.tag, message.author.id);

        if (message.author.id !== IF_BOT_ID) return;

        console.log('==============================');
        console.log('이프 봇 메시지 감지!');
        console.log('Message ID:', message.id);
        console.log('Author:', message.author.tag);
        console.log('Author ID:', message.author.id);
        console.log('Embeds:', message.embeds.length);
        console.log('Content:', message.content);
        console.log('==============================');

        if (message.embeds.length > 0) {
            console.log(
                JSON.stringify(
                    message.embeds.map(embed => embed.toJSON()),
                    null,
                    4
                )
            );
        }
    }
};