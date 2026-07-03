const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const shopPath = path.join(__dirname, '../data/Shop.json');
const percentPath = path.join(__dirname, '../data/Percent.json');
const invPath = path.join(__dirname, '../data/Inventory.json');
const moneyPath = path.join(__dirname, '../data/users.json');

function readJSON(filePath, defaultData = { items: [] }) {
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4), 'utf-8');
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('판매')
        .setDescription('보유 중인 아이템을 판매합니다'),

    async execute(interaction) {
        const userId = interaction.user.id;

        const shopData = readJSON(shopPath, { items: [] });
        const percentData = readJSON(percentPath, { items: [] });
        
        const itemMasterMap = new Map();
        
        shopData.items.forEach(item => {
            itemMasterMap.set(item.id, { name: item.name, sellPrice: item.sellPrice || 0 });
        });
        percentData.items.forEach(item => {
            itemMasterMap.set(item.id, { name: item.name, sellPrice: item.sellPrice || 0 });
        });

        const invData = readJSON(invPath, {});
        const userInventory = invData[userId] || {};

        const sellableItems = [];
        for (const [itemId, quantity] of Object.entries(userInventory)) {
            if (quantity > 0 && itemMasterMap.has(itemId)) {
                const master = itemMasterMap.get(itemId);
                if (master.sellPrice > 0) {
                    sellableItems.push({
                        id: itemId,
                        name: master.name,
                        sellPrice: master.sellPrice,
                        quantity: quantity
                    });
                }
            }
        }

        if (sellableItems.length === 0) {
            return interaction.reply({ 
                content: "현재 인벤토리에 판매 가능한 아이템이 없습니다.", 
                ephemeral: true 
            });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('sell_item_select')
            .setPlaceholder('판매할 아이템을 선택하세요');

        sellableItems.slice(0, 25).forEach(item => {
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(item.name)
                    .setDescription(`보유 수량: ${item.quantity}개 | 개당 판매가: ${item.sellPrice}P`)
                    .setValue(item.id)
            );
        });

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await interaction.reply({
            embeds: [{
                title: "상점 아이템 판매 창",
                description: "보유하고 계신 아이템 리스트입니다. 하단 메뉴에서 판매를 진행할 아이템을 하나 선택해 주세요.",
                color: 0x2ECC71
            }],
            components: [row],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "이 메뉴는 명령어 사용자만 이용할 수 있습니다.", ephemeral: true });
            }

            const targetItemId = i.values[0];
            
            const latestInv = readJSON(invPath, {});
            const latestUserInv = latestInv[userId] || {};
            const currentQuantity = latestUserInv[targetItemId] || 0;

            if (currentQuantity <= 0) {
                return i.update({ content: "그새 아이템 개수가 변동되었거나 보유하고 있지 않습니다.", embeds: [], components: [] });
            }

            const itemInfo = itemMasterMap.get(targetItemId);
            const totalEarned = itemInfo.sellPrice * currentQuantity;

            delete latestUserInv[targetItemId];
            latestInv[userId] = latestUserInv;
            saveJSON(invPath, latestInv);

            const moneyData = readJSON(moneyPath, {});
            const currentMoney = moneyData[userId] || 0;
            moneyData[userId] = currentMoney + totalEarned;
            saveJSON(moneyPath, moneyData);

            collector.stop();
            await i.update({
                embeds: [{
                    title: "판매 완료",
                    description: `${itemInfo.name} 아이템을 전부 판매했습니다.\n\n` +
                                 `• 판매 수량: ${currentQuantity} 개\n` +
                                 `• 개당 가격: ${itemInfo.sellPrice} P\n` +
                                 `• 획득 포인트: +${totalEarned.toLocaleString()} P\n\n` +
                                 `현재 잔액: ${(currentMoney + totalEarned).toLocaleString()} P`,
                    color: 0x57F287
                }],
                components: []
            });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ components: [] }).catch(() => {});
            }
        });
    }
};