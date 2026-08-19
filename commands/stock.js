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

const stocksPath = path.join(__dirname, '../data/Stocks.json');
const usersPath = path.join(__dirname, '../data/users.json');
const userStocksPath = path.join(__dirname, '../data/UserStocks.json');

function readJson(filePath, defaultData = {}) {
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4));
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

function updateStockPrices() {
    const data = readJson(stocksPath, { stocks: [] });
    const now = new Date();
    let updated = false;

    for (const stock of data.stocks) {
        const lastUpdate = stock.lastUpdated ? new Date(stock.lastUpdated) : new Date(0);
        const diffHours = (now - lastUpdate) / (1000 * 60 * 60);

        if (diffHours >= 3) {
            updated = true;
            stock.lastUpdated = now.toISOString();

            if (stock.trend === undefined) stock.trend = 0;

            let upChance = 50 - (stock.trend * 10);
            upChance = Math.max(10, Math.min(90, upChance));

            const isUp = (Math.random() * 100) < upChance;

            if (isUp) {
                stock.trend = stock.trend > 0 ? stock.trend + 1 : 1;
            } else {
                stock.trend = stock.trend < 0 ? stock.trend - 1 : -1;
            }

            const changePercent = Math.random() * 0.50;
            const rate = isUp ? (1 + changePercent) : (1 - changePercent);

            stock.price = Math.max(1, Math.round(stock.price * rate));
        }
    }

    if (updated) saveJson(stocksPath, data);
    return data;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('주식')
        .setDescription('주식 시세를 확인하고 매수/매도합니다.'),

    async execute(interaction) {
        const userID = interaction.user.id;
        const userDisplayName = interaction.member.displayName;

        let stocksData = updateStockPrices();
        let users = readJson(usersPath, {});
        let userStocks = readJson(userStocksPath, {});

        if (!users[userID]) {
            users[userID] = { Point: 0 };
        }
        if (typeof users[userID].Point !== 'number') {
            users[userID].Point = 0;
        }
        if (!userStocks[userID]) {
            userStocks[userID] = {};
        }

        let selectedStockId = null;

        function createMainUI() {
            stocksData = updateStockPrices();
            users = readJson(usersPath, {});
            userStocks = readJson(userStocksPath, {});

            const myPoint = users[userID]?.Point || 0;
            const myPortfolio = userStocks[userID] || {};

            const fields = stocksData.stocks.map(s => {
                const myAmount = myPortfolio[s.id] || 0;
                const trendText = s.trend > 0 ? `+${s.trend}연속 상승` : s.trend < 0 ? `${s.trend}연속 하락` : "보합";
                return {
                    name: s.name,
                    value: `현재가: ${s.price.toLocaleString()}P\n추세: ${trendText}\n보유량: ${myAmount}주`,
                    inline: true
                };
            });

            const embed = {
                title: "📈 주식 시장",
                description: `${userDisplayName}님의 보유 포인트: **${myPoint.toLocaleString()}P**\n구매 또는 판매할 주식을 선택하세요.`,
                color: 0x5865F2,
                fields: fields
            };

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_user_stock')
                .setPlaceholder('주식 종목 선택');

            if (stocksData.stocks.length > 0) {
                stocksData.stocks.forEach(stock => {
                    const myAmount = myPortfolio[stock.id] || 0;
                    selectMenu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(stock.name)
                            .setDescription(`현재가: ${stock.price.toLocaleString()}P | 보유: ${myAmount}주`)
                            .setValue(stock.id)
                    );
                });
            } else {
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('상장된 주식이 없습니다')
                        .setValue('none')
                );
                selectMenu.setDisabled(true);
            }

            const row = new ActionRowBuilder().addComponents(selectMenu);
            return { embeds: [embed], components: [row] };
        }

        function createTradeUI(stockId) {
            const stock = stocksData.stocks.find(s => s.id === stockId);
            if (!stock) return createMainUI();

            const myPoint = users[userID]?.Point || 0;
            const myAmount = userStocks[userID]?.[stock.id] || 0;

            const embed = {
                title: `주식 거래: ${stock.name}`,
                description: `현재가: **${stock.price.toLocaleString()}P**\n보유 포인트: **${myPoint.toLocaleString()}P**\n보유 수량: **${myAmount}주**\n\n원하시는 거래를 선택해주세요.`,
                color: 0xFEE75C
            };

            const btnBuy = new ButtonBuilder().setCustomId('btn_stock_buy').setLabel('매수 (구매)').setStyle(ButtonStyle.Success);
            const btnSell = new ButtonBuilder().setCustomId('btn_stock_sell').setLabel('매도 (판매)').setStyle(ButtonStyle.Danger);
            const btnBack = new ButtonBuilder().setCustomId('btn_stock_user_back').setLabel('뒤로가기').setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(btnBuy, btnSell, btnBack);
            return { embeds: [embed], components: [row] };
        }

        const response = await interaction.reply({ ...createMainUI(), fetchReply: true });
        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "이 패널은 명령어 사용자만 조작할 수 있습니다.", ephemeral: true });
            }

            stocksData = updateStockPrices();
            users = readJson(usersPath, {});
            userStocks = readJson(userStocksPath, {});

            if (i.customId === 'select_user_stock') {
                selectedStockId = i.values[0];
                await i.update(createTradeUI(selectedStockId));
            }
            else if (i.customId === 'btn_stock_user_back') {
                selectedStockId = null;
                await i.update(createMainUI());
            }
            else if (i.customId === 'btn_stock_buy' || i.customId === 'btn_stock_sell') {
                const isBuy = i.customId === 'btn_stock_buy';
                const stock = stocksData.stocks.find(s => s.id === selectedStockId);

                if (!stock) return i.update(createMainUI());

                const myPoint = users[userID]?.Point || 0;
                const myOwned = userStocks[userID]?.[stock.id] || 0;
                const maxBuyable = Math.floor(myPoint / stock.price);

                const btnMin = new ButtonBuilder().setCustomId('btn_amount_min').setLabel('최소 (1주)').setStyle(ButtonStyle.Primary);
                const btnMax = new ButtonBuilder().setCustomId('btn_amount_max').setLabel(`최대 (${isBuy ? maxBuyable : myOwned}주)`).setStyle(ButtonStyle.Primary);
                const btnCancel = new ButtonBuilder().setCustomId('btn_amount_cancel').setLabel('취소').setStyle(ButtonStyle.Secondary);

                const actionRow = new ActionRowBuilder().addComponents(btnMin, btnMax, btnCancel);

                await i.update({
                    embeds: [{
                        title: `${stock.name} ${isBuy ? '매수' : '매도'} 수량 선택`,
                        description: `아래 **[최소/최대]** 버튼을 클릭하거나, 채팅창에 수량을 직접 숫자로 입력해주세요.\n\n` +
                                     `• 현재가: **${stock.price.toLocaleString()}P**\n` +
                                     `• 보유 포인트: **${myPoint.toLocaleString()}P** (최대 ${maxBuyable}주 매수 가능)\n` +
                                     `• 보유 주식: **${myOwned}주**`,
                        color: isBuy ? 0x57F287 : 0xED4245
                    }],
                    components: [actionRow]
                });

                const processTrade = async (amount, targetInteraction) => {
                    const totalPrice = stock.price * amount;

                    if (isBuy) {
                        if (amount <= 0 || myPoint < totalPrice) {
                            const errEmbed = { title: "매수 실패", description: `포인트가 부족하거나 수량이 유효하지 않습니다.\n필요 포인트: ${totalPrice.toLocaleString()}P / 보유: ${myPoint.toLocaleString()}P`, color: 0xED4245 };
                            if (targetInteraction.replied || targetInteraction.deferred) await targetInteraction.followUp({ embeds: [errEmbed], ephemeral: true });
                            else await targetInteraction.update({ embeds: [errEmbed], components: [] });

                            setTimeout(async () => { await interaction.editReply(createTradeUI(selectedStockId)).catch(() => {}); }, 2500);
                            return;
                        }

                        users[userID].Point -= totalPrice;
                        if (!userStocks[userID]) userStocks[userID] = {};
                        userStocks[userID][stock.id] = (userStocks[userID][stock.id] || 0) + amount;

                        saveJson(usersPath, users);
                        saveJson(userStocksPath, userStocks);

                        const successEmbed = { title: "매수 완료", description: `${stock.name} ${amount}주를 ${totalPrice.toLocaleString()}P에 매수하였습니다.`, color: 0x57F287 };
                        if (targetInteraction.isButton && targetInteraction.isButton()) await targetInteraction.update({ embeds: [successEmbed], components: [] });
                        else await interaction.editReply({ embeds: [successEmbed], components: [] });

                    } else {
                        if (amount <= 0 || myOwned < amount) {
                            const errEmbed = { title: "매도 실패", description: `보유 주식이 부족합니다.\n요청 수량: ${amount}주 / 보유: ${myOwned}주`, color: 0xED4245 };
                            if (targetInteraction.replied || targetInteraction.deferred) await targetInteraction.followUp({ embeds: [errEmbed], ephemeral: true });
                            else await targetInteraction.update({ embeds: [errEmbed], components: [] });

                            setTimeout(async () => { await interaction.editReply(createTradeUI(selectedStockId)).catch(() => {}); }, 2500);
                            return;
                        }

                        users[userID].Point = (users[userID].Point || 0) + totalPrice;
                        userStocks[userID][stock.id] -= amount;

                        saveJson(usersPath, users);
                        saveJson(userStocksPath, userStocks);

                        const successEmbed = { title: "매도 완료", description: `${stock.name} ${amount}주를 ${totalPrice.toLocaleString()}P에 매도하였습니다.`, color: 0x57F287 };
                        if (targetInteraction.isButton && targetInteraction.isButton()) await targetInteraction.update({ embeds: [successEmbed], components: [] });
                        else await interaction.editReply({ embeds: [successEmbed], components: [] });
                    }

                    setTimeout(async () => {
                        await interaction.editReply(createTradeUI(selectedStockId)).catch(() => {});
                    }, 2500);
                };

                const subCollector = response.createMessageComponentCollector({
                    filter: btnI => btnI.user.id === interaction.user.id,
                    time: 30000,
                    max: 1
                });

                const msgFilter = m => m.author.id === interaction.user.id;
                const msgCollector = interaction.channel.createMessageCollector({ filter: msgFilter, max: 1, time: 30000 });

                subCollector.on('collect', async btnI => {
                    msgCollector.stop('button_clicked');
                    if (btnI.customId === 'btn_amount_cancel') {
                        await btnI.update(createTradeUI(selectedStockId));
                    } else if (btnI.customId === 'btn_amount_min') {
                        await processTrade(1, btnI);
                    } else if (btnI.customId === 'btn_amount_max') {
                        const targetAmount = isBuy ? maxBuyable : myOwned;
                        await processTrade(targetAmount, btnI);
                    }
                });

                msgCollector.on('collect', async m => {
                    subCollector.stop('message_received');
                    try { await m.delete(); } catch(e) {}

                    const amount = parseInt(m.content.trim(), 10);
                    if (isNaN(amount) || amount <= 0) {
                        await interaction.editReply({
                            embeds: [{ title: "거래 실패", description: "수량은 1 이상의 정수만 입력할 수 있습니다.", color: 0xED4245 }],
                            components: []
                        });
                        setTimeout(async () => {
                            await interaction.editReply(createTradeUI(selectedStockId)).catch(() => {});
                        }, 2500);
                        return;
                    }

                    await processTrade(amount, interaction);
                });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};