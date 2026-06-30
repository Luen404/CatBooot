const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '../data/Inventory.json');

function readInventory() {
    if (!fs.existsSync(inventoryPath)) return {};
    return JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
}

function saveInventory(data) {
    fs.writeFileSync(inventoryPath, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('아이템차감')
        .setDescription('특정 유저의 보관함에서 아이템을 제거합니다 (관리자 전용)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('유저')
                .setDescription('아이템을 제거할 유저를 선택하세요')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('아이템이름')
                .setDescription('제거할 아이템의 정확한 이름을 입력하세요')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('수량')
                .setDescription('제거할 아이템의 수량을 입력하세요')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('유저');
        const itemName = interaction.options.getString('아이템이름').trim();
        const amount = interaction.options.getInteger('수량');

        const inventory = readInventory();
        const userItems = inventory[targetUser.id] || [];

        if (userItems.length === 0) {
            return interaction.reply({ content: `${targetUser.displayName}님의 보관함이 비어 있습니다.`, ephemeral: true });
        }

        const matchingItemsCount = userItems.filter(item => item.name === itemName).length;

        if (matchingItemsCount === 0) {
            return interaction.reply({ content: `${targetUser.displayName}님의 보관함에 [${itemName}] 아이템이 존재하지 않습니다.`, ephemeral: true });
        }

        let removedCount = 0;
        const updatedItems = [];

        for (const item of userItems) {
            if (item.name === itemName && removedCount < amount) {
                removedCount++;
            } else {
                updatedItems.push(item);
            }
        }

        inventory[targetUser.id] = updatedItems;
        saveInventory(inventory);

        await interaction.reply({
            content: `${targetUser.displayName}님의 보관함에서 [${itemName}] 아이템을 ${removedCount}개 차감 완료했습니다. (요청 수량: ${amount}개)`
        });
    }
};