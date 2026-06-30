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
const usersPath = path.join(__dirname, '../data/users.json');
const inventoryPath = path.join(__dirname, '../data/Inventory.json');

function readJson(filePath, defaultData = {}) {
    if (!fs.existsSync(filePath)) return defaultData;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

function createShopMessage(userID, allItems) {
    const users = readJson(usersPath, {});
    const currentPoint = (users[userID] && users[userID].Point) ? users[userID].Point : 0;

    const embed = {
        title: "포인트 상점",
        description: `구매할 상품을 아래 메뉴에서 선택하세요.\n현재 보유 포인트: **${currentPoint}P**`,
        color: 0x5865F2,
        fields: allItems.map(i => ({
            name: i.name,
            value: `가격: ${i.price}P`,
            inline: true
        }))
    };

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('buy_item')
        .setPlaceholder('구매할 상품을 선택하세요');

    allItems.forEach(item => {
        selectMenu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(item.name)
                .setDescription(`가격: ${item.price}P`)
                .setValue(item.id)
        );
    });

    const row = new ActionRowBuilder().addComponents(selectMenu);
    return { embeds: [embed], components: [row], content: "" };
}

function createQuantityMessage(userID, item, quantity) {
    const users = readJson(usersPath, {});
    const currentPoint = (users[userID] && users[userID].Point) ? users[userID].Point : 0;
    const totalPrice = item.price * quantity;

    const embed = {
        title: "포인트 상점",
        description: `**상품 :** ${item.name}\n\n**가격**\n${item.price}P\n\n**수량**\n${quantity}개\n\n**총 가격**\n${totalPrice}P\n\n현재 보유 포인트: **${currentPoint}P**`,
        color: 0x5865F2
    };

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('qty_-100').setLabel('-100').setStyle(ButtonStyle.Secondary).setDisabled(quantity <= 100),
        new ButtonBuilder().setCustomId('qty_-10').setLabel('-10').setStyle(ButtonStyle.Secondary).setDisabled(quantity <= 10),
        new ButtonBuilder().setCustomId('qty_-1').setLabel('-1').setStyle(ButtonStyle.Secondary).setDisabled(quantity <= 1),
        new ButtonBuilder().setCustomId('qty_+1').setLabel('+1').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('qty_+10').setLabel('+10').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('qty_+100').setLabel('+100').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('qty_max').setLabel('최대').setStyle(ButtonStyle.Primary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_buy').setLabel('구매').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel_buy').setLabel('취소').setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row1, row2, row3], content: "" };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('상점')
        .setDescription('포인트를 사용하여 상품을 구매합니다'),

    async execute(interaction) {
        const shopData = readJson(shopPath, { items: [] });
        const userID = interaction.user.id;

        const fixedTicketItem = { id: "fixed_gacha_ticket", name: "뽑기권", price: 1000 };
        const allItems = [fixedTicketItem, ...shopData.items];

        const shopMsg = createShopMessage(userID, allItems);
        const response = await interaction.reply({ ...shopMsg, fetchReply: true });
        const collector = response.createMessageComponentCollector({ time: 300000 });

        let selectedItem = null;
        let currentQuantity = 1;

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "본인의 상점 메뉴만 이용할 수 있습니다.", ephemeral: true });
            }

            if (i.isStringSelectMenu()) {
                const selectedId = i.values[0];
                const freshShop = readJson(shopPath, { items: [] });
                const currentAllItems = [fixedTicketItem, ...freshShop.items];
                selectedItem = currentAllItems.find(idx => idx.id === selectedId);

                if (!selectedItem) {
                    return i.update({ content: "존재하지 않거나 삭제된 상품입니다.", embeds: [], components: [] });
                }

                currentQuantity = 1;
                const quantityMsg = createQuantityMessage(userID, selectedItem, currentQuantity);
                await i.update(quantityMsg);
            } 
            
            else if (i.isButton()) {
                const customId = i.customId;

                if (customId.startsWith('qty_')) {
                    const action = customId.replace('qty_', '');
                    const users = readJson(usersPath, {});
                    const userPoint = (users[userID] && users[userID].Point) ? users[userID].Point : 0;

                    if (action === 'max') {
                        currentQuantity = Math.floor(userPoint / selectedItem.price);
                        if (currentQuantity < 1) currentQuantity = 1;
                    } else {
                        const amount = parseInt(action, 10);
                        currentQuantity = Math.max(1, currentQuantity + amount);
                    }

                    const updatedQuantityMsg = createQuantityMessage(userID, selectedItem, currentQuantity);
                    await i.update(updatedQuantityMsg);
                } 
                
                else if (customId === 'cancel_buy') {
                    selectedItem = null;
                    const freshShop = readJson(shopPath, { items: [] });
                    const currentAllItems = [fixedTicketItem, ...freshShop.items];
                    await i.update(createShopMessage(userID, currentAllItems));
                } 
                
                else if (customId === 'confirm_buy') {
                    const freshUsers = readJson(usersPath, {});
                    if (!freshUsers[userID]) {
                        freshUsers[userID] = { tag: interaction.member.displayName, Ticket: 0, Point: 0 };
                    }
                    if (freshUsers[userID].Point === undefined) freshUsers[userID].Point = 0;

                    const totalPrice = selectedItem.price * currentQuantity;

                    if (freshUsers[userID].Point < totalPrice) {
                        return i.reply({ 
                            content: `포인트가 부족합니다.\n필요 포인트: ${totalPrice}P (개당 ${selectedItem.price}P × ${currentQuantity}개)\n보유 포인트: ${freshUsers[userID].Point}P`, 
                            ephemeral: true 
                        });
                    }

                    freshUsers[userID].Point -= totalPrice;

                    if (selectedItem.id === "fixed_gacha_ticket") {
                        freshUsers[userID].Ticket = (freshUsers[userID].Ticket || 0) + currentQuantity;
                        saveJson(usersPath, freshUsers);
                    } else {
                        saveJson(usersPath, freshUsers);
                        
                        const inventory = readJson(inventoryPath, {});
                        if (!inventory[userID]) inventory[userID] = [];
                        
                        for (let k = 0; k < currentQuantity; k++) {
                            inventory[userID].push({
                                itemId: selectedItem.id,
                                name: selectedItem.name,
                                obtainedAt: new Date().toISOString()
                            });
                        }
                        saveJson(inventoryPath, inventory);
                    }

                    await i.reply({
                        content: `[${selectedItem.name}] ${currentQuantity}개 구매가 완료되었습니다!\n차감 포인트: -${totalPrice}P\n남은 포인트: ${freshUsers[userID].Point}P`,
                        ephemeral: true
                    });

                    selectedItem = null;
                    const freshShop = readJson(shopPath, { items: [] });
                    const currentAllItems = [fixedTicketItem, ...freshShop.items];
                    await interaction.editReply(createShopMessage(userID, currentAllItems));
                }
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};