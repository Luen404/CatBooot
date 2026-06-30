const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/users.json');
const inventoryPath = path.join(__dirname, '../data/Inventory.json');

module.exports = { 
    data: new SlashCommandBuilder()
        .setName('보관함확인')
        .setDescription('특정 유저의 재화와 보관함 아이템을 확인합니다 (관리자 전용)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('유저')
                .setDescription('보관함을 확인할 유저를 선택하세요')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('유저');
        const userID = targetUser.id;

        let userData = {};
        if (fs.existsSync(dataPath)) {
            try {
                userData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            } catch (error) {
                console.error('유저 데이터 읽기 오류', error);
                return interaction.reply({ content: '유저 데이터를 읽어오는 중 오류가 발생했습니다.', ephemeral: true });
            }
        }

        const currentTicket = userData[userID] ? (userData[userID].Ticket || 0) : 0;
        const currentPoint = userData[userID] ? (userData[userID].Point || 0) : 0;

        let inventoryData = {};
        if (fs.existsSync(inventoryPath)) {
            try {
                inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
            } catch (error) {
                console.error('인벤토리 데이터 읽기 오류', error);
            }
        }

        const userItems = inventoryData[userID] || [];

        let itemDisplay = "보관함이 비어 있습니다.";
        if (userItems.length > 0) {
            const itemCounts = {};
            userItems.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
            });

            itemDisplay = Object.entries(itemCounts)
                .map(([name, count]) => `${name} (x${count})`)
                .join('\n');
        }

        const embed = {
            title: `${targetUser.displayName}님의 보관함 조회 결과`,
            color: 0x5865F2,
            fields: [
                { name: "보유 재화", value: `뽑기권: ${currentTicket}장\n보유 포인트: ${currentPoint}P`, inline: false },
                { name: "보유 아이템 목록", value: itemDisplay, inline: false }
            ],
        };

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};