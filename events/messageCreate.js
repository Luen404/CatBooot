const fs = require('fs');
const path = require('path');
const { Events } = require('discord.js');

const usersPath = path.join(__dirname, '../data/users.json');
const configPath = path.join(__dirname, '../data/PointConfig.json');

const IF_BOT_ID = '693818502657867878';

function readJson(filePath, defaultData = {}) {
    if (!fs.existsSync(filePath)) {
        return defaultData;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(data, null, 4),
        'utf-8'
    );
}

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {

        if (!message.guild) return;

        /*
         * 일반 유저 메시지 포인트
         */

        if (!message.author.bot) {
            const config = readJson(configPath, {
                messagePoint: 1,
                voicePoint: 5
            });

            if (config.messagePoint > 0) {
                const users = readJson(usersPath, {});
                const userId = message.author.id;

                if (!users[userId]) {
                    users[userId] = {
                        tag: message.author.tag,
                        Ticket: 0,
                        Point: 0
                    };
                }

                if (users[userId].Point === undefined) {
                    users[userId].Point = 0;
                }

                users[userId].Point += config.messagePoint;

                saveJson(usersPath, users);
            }

            return;
        }

        /*
         * 이프 봇 낚시 감지
         */

        if (message.author.id !== IF_BOT_ID) return;
        if (!message.embeds.length) return;

        const embed = message.embeds[0];

        const text = [
            embed.title || '',
            embed.description || '',
            ...embed.fields.map(field => `${field.name} ${field.value}`)
        ].join('\n');

        if (!text.includes('전설') && !text.includes('초전설')) return;

        console.log('\n==============================');
        console.log('[이프 봇 낚시 감지]');
        console.log('==============================');

        console.log('\n[메시지 정보]');
        console.log('Message ID:', message.id);
        console.log('Channel ID:', message.channel.id);
        console.log('Author ID:', message.author.id);
        console.log('Author:', message.author.tag);

        console.log('\n[Embed 정보]');
        console.log('Title:', embed.title);
        console.log('Description:', embed.description);

        console.log('\n[전체 Embed]');
        console.log(JSON.stringify(embed.toJSON(), null, 4));

        console.log('\n[Interaction]');
        console.log(message.interaction);

        console.log('\n[Interaction Metadata]');
        console.log(message.interactionMetadata);

        console.log('\n==============================\n');
    }
};