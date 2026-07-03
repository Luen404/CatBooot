const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const shopPath = path.join(__dirname, '../data/Shop.json');
const percentPath = path.join(__dirname, '../data/Percent.json');
const inventoryPath = path.join(__dirname, '../data/Inventory.json');
const usersPath = path.join(__dirname, '../data/users.json');

function readJson(filePath, defaultData = {}) {
    if (!fs.existsSync(filePath)) return defaultData;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

function createSellShopMessage(userID, itemMasterMap) {
    const inventory = readJson(inventoryPath, {});
    const userInventoryArray = inventory[userID] || [];

    const itemCounts = {};
    userInventoryArray.forEach(item => {
        if (item && item.itemId) {
            itemCounts[item.itemId] = (itemCounts[item.itemId] || 0) + 1;
        }
    });

    const sellableItems = [];
    for (const [itemId, quantity] of Object.entries(itemCounts)) {
        if (itemMasterMap.has(itemId)) {
            const master = itemMasterMap.get(itemId);
            if (master.sellPrice > 0 && quantity > 0) {
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
        return {
            embeds: [{
                title: "상점 아이템 판매 창",
                description: "현재 인벤토리에 판매 가능한 아이템이 없습니다",
                color: 0xED4245
            }],
            components: [],
            content: ""
        };
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
    return {
        embeds: [{
            title: "상점 아이템 판매 창",
            description: "보유하고 계신 아이템 리스트입니다. 하단 메뉴에서 판매를 진행할 아이템을 하나 선택해 주세요.",
            color: 0x2ECC71
        }],
        components: [row],
        content: ""
    };
}

function createSellQuantityMessage(userID, item, maxQuantity, quantity) {
    const totalEarned = item.sellPrice * quantity;

    const embed = {
        title: "상점 아이템 판매 창",
        description: `**상품 :** ${item.name}\n\n**개당 판매가**\n${item.sellPrice}P\n\n**수량**\n${quantity}개\n\n**총 획득 포인트**\n${totalEarned}P\n\n현재 보유 수량: **${maxQuantity}개**`,
        color: 0x5865F2
    };

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sellqty_-100').setLabel('-100').setStyle(ButtonStyle.Secondary).setDisabled(quantity <= 100),
        new ButtonBuilder().setCustomId('sellqty_-10').setLabel('-10').setStyle(ButtonStyle.Secondary).setDisabled(quantity <= 10),
        new ButtonBuilder().setCustomId('sellqty_-1').setLabel('-1').setStyle(ButtonStyle.Secondary).setDisabled(quantity <= 1),
        new ButtonBuilder().setCustomId('sellqty_+1').setLabel('+1').setStyle(ButtonStyle.Secondary).setDisabled(quantity >= maxQuantity),
        new ButtonBuilder().setCustomId('sellqty_+10').setLabel('+10').setStyle(ButtonStyle.Secondary).setDisabled(quantity + 10 > maxQuantity)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sellqty_+100').setLabel('+100').setStyle(ButtonStyle.Secondary).setDisabled(quantity + 100 > maxQuantity),
        new ButtonBuilder().setCustomId('sellqty_max').setLabel('최대').setStyle(ButtonStyle.Primary).setDisabled(quantity === maxQuantity)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_sell').setLabel('판매').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel_sell').setLabel('취소').setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row1, row2, row3], content: "" };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('판매')
        .setDescription('보유 중인 아이템을 판매합니다'),

    async execute(interaction) {
        const userID = interaction.user.id;

        const shopData = readJson(shopPath, { items: [] });
        const percentData = readJson(percentPath, { items: [] });
        
        const itemMasterMap = new Map();
        
        shopData.items.forEach(item => {
            itemMasterMap.set(item.id, { name: item.name, sellPrice: item.sellPrice || 0 });
        });
        percentData.items.forEach(item => {
            itemMasterMap.set(item.id, { name: item.name, sellPrice: item.sellPrice || 0 });
        });

        const initialMsg = createSellShopMessage(userID, itemMasterMap);
        if (initialMsg.components.length === 0) {
            return interaction.reply({ embeds: initialMsg.embeds, ephemeral: true });
        }

        const response = await interaction.reply({ ...initialMsg, fetchReply: true });
        const collector = response.createMessageComponentCollector({ time: 300000 });

        let selectedItem = null;
        let currentQuantity = 1;

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "본인의 판매 메뉴만 이용할 수 있습니다.", ephemeral: true });
            }

            if (i.isStringSelectMenu()) {
                const selectedId = i.values[0];
                
                const inventory = readJson(inventoryPath, {});
                const userInventoryArray = inventory[userID] || [];
                const maxQuantity = userInventoryArray.filter(idx => idx.itemId === selectedId).length;

                const master = itemMasterMap.get(selectedId);

                if (maxQuantity <= 0 || !master) {
                    return i.update({ content: "존재하지 않거나 보유하고 있지 않은 상품입니다.", embeds: [], components: [] });
                }

                selectedItem = { id: selectedId, name: master.name, sellPrice: master.sellPrice, maxQuantity: maxQuantity };
                currentQuantity = 1;

                await i.update(createSellQuantityMessage(userID, selectedItem, maxQuantity, currentQuantity));
            } 
            
            else if (i.isButton()) {
                const customId = i.customId;

                if (customId.startsWith('sellqty_')) {
                    const action = customId.replace('sellqty_', '');
                    const inventory = readJson(inventoryPath, {});
                    const userInventoryArray = inventory[userID] || [];
                    const maxQuantity = userInventoryArray.filter(idx => idx.itemId === selectedItem.id).length;

                    if (maxQuantity <= 0) {
                        return i.update({ content: "보유 수량이 변동되어 아이템을 찾을 수 없습니다.", embeds: [], components: [] });
                    }

                    selectedItem.maxQuantity = maxQuantity;

                    if (action === 'max') {
                        currentQuantity = maxQuantity;
                    } else {
                        const amount = parseInt(action, 10);
                        currentQuantity = Math.max(1, Math.min(maxQuantity, currentQuantity + amount));
                    }

                    await i.update(createSellQuantityMessage(userID, selectedItem, maxQuantity, currentQuantity));
                } 
                
                else if (customId === 'cancel_sell') {
                    selectedItem = null;
                    await i.update(createSellShopMessage(userID, itemMasterMap));
                } 
                
                else if (customId === 'confirm_sell') {
                    const inventory = readJson(inventoryPath, {});
                    const userInventoryArray = inventory[userID] || [];
                    const freshMaxQuantity = userInventoryArray.filter(idx => idx.itemId === selectedItem.id).length;

                    if (freshMaxQuantity < currentQuantity) {
                        return i.reply({ content: "인벤토리의 아이템 수량이 부족해져 판매할 수 없습니다.", ephemeral: true });
                    }

                    const totalPrice = selectedItem.sellPrice * currentQuantity;

                    let count = 0;
                    inventory[userID] = userInventoryArray.filter(idx => {
                        if (idx.itemId === selectedItem.id && count < currentQuantity) {
                            count++;
                            return false;
                        }
                        return true;
                    });
                    saveJson(inventoryPath, inventory);

                    const freshUsers = readJson(usersPath, {});
                    if (!freshUsers[userID]) {
                        freshUsers[userID] = { tag: interaction.member.displayName, Ticket: 0, Point: 0 };
                    }
                    if (freshUsers[userID].Point === undefined) freshUsers[userID].Point = 0;

                    freshUsers[userID].Point += totalPrice;
                    saveJson(usersPath, freshUsers);

                    await i.reply({
                        content: `[${selectedItem.name}] ${currentQuantity}개 판매가 완료되었습니다!\n획득 포인트: +${totalPrice}P\n현재 포인트: ${freshUsers[userID].Point}P`,
                        ephemeral: true
                    });

                    selectedItem = null;
                    await interaction.editReply(createSellShopMessage(userID, itemMasterMap));
                }
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};