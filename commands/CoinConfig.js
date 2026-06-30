const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');

function readUsers() {
    if (!fs.existsSync(usersPath)) {
        fs.mkdirSync(path.dirname(usersPath), { recursive: true });
        fs.writeFileSync(usersPath, JSON.stringify({}, null, 4));
    }
    return JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
}

function saveUsers(data) {
    fs.writeFileSync(usersPath, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('재화수정')
        .setDescription('특정 유저의 포인트 또는 뽑기권 수량을 변경합니다 (관리자 전용)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('유저')
                .setDescription('변경할 유저를 선택하세요')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('재화종류')
                .setDescription('변경할 재화를 선택하세요')
                .setRequired(true)
                .addChoices(
                    { name: '포인트', value: 'Point' },
                    { name: '뽑기권', value: 'Ticket' }
                ))
        .addStringOption(option =>
            option.setName('방식')
                .setDescription('지급할지 차감할지 선택하세요')
                .setRequired(true)
                .addChoices(
                    { name: '지급 (증가)', value: 'add' },
                    { name: '차감', value: 'remove' }
                ))
        .addIntegerOption(option =>
            option.setName('수량')
                .setDescription('변경할 수량을 입력하세요')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('유저');
        const currency = interaction.options.getString('재화종류');
        const action = interaction.options.getString('방식');
        const amount = interaction.options.getInteger('수량');

        if (targetUser.bot) {
            return interaction.reply({ content: "봇의 재화는 변경할 수 없습니다.", ephemeral: true });
        }

        const users = readUsers();

        if (!users[targetUser.id]) {
            users[targetUser.id] = {
                tag: interaction.guild.members.cache.get(targetUser.id)?.displayName || targetUser.displayName,
                Ticket: 0,
                Point: 0
            };
        }

        if (users[targetUser.id][currency] === undefined) {
            users[targetUser.id][currency] = 0;
        }

        const currencyName = currency === 'Point' ? '포인트' : '뽑기권';
        const unit = currency === 'Point' ? 'P' : '장';

        if (action === 'add') {
            users[targetUser.id][currency] += amount;
            saveUsers(users);
            
            return interaction.reply({ 
                content: `${targetUser.displayName}님에게 ${currencyName} ${amount}${unit}을 지급했습니다. 현재 보유: ${users[targetUser.id][currency]}${unit}`,
                ephemeral: true
            });
        } 
        
        if (action === 'remove') {
            if (users[targetUser.id][currency] < amount) {
                users[targetUser.id][currency] = 0;
            } else {
                users[targetUser.id][currency] -= amount;
            }
            saveUsers(users);

            return interaction.reply({ 
                content: `${targetUser.displayName}님의 ${currencyName}을 ${amount}${unit} 차감했습니다. 현재 보유: ${users[targetUser.id][currency]}${unit}`,
                ephemeral: true
            });
        }
    }
};