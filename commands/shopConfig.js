const { 
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const shopPath = path.join(__dirname, '../data/Shop.json');

function readShop() {
    if (!fs.existsSync(shopPath)) {
        fs.mkdirSync(path.dirname(shopPath), { recursive: true });
        fs.writeFileSync(shopPath, JSON.stringify({ items: [] }, null, 4));
    }
    return JSON.parse(fs.readFileSync(shopPath, 'utf-8'));
}

function saveShop(data) {
    fs.writeFileSync(shopPath, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('상점설정')
        .setDescription('상점 물품과 가격을 변경합니다 (관리자 전용)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        let shop = readShop();
        let selectedItemId = null;
        let selectedAction = null;

        function createMainUI(statusMessage = "메뉴에서 수정할 상품을 선택하거나 새로운 상품을 추가할 수 있습니다.") {
            shop = readShop();

            const embed = {
                title: "상점 설정 컨트롤 패널",
                description: statusMessage,
                color: 0x5865F2,
                fields: shop.items.map(i => ({ 
                    name: i.name, 
                    value: `가격: ${i.price}P`, 
                    inline: true 
                }))
            };

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_shop_item')
                .setPlaceholder('수정할 상품을 선택하세요');
             
            if (shop.items.length > 0) {
                shop.items.forEach(item => {
                    selectMenu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(item.name)
                            .setDescription(`현재 가격: ${item.price}P`)
                            .setValue(item.id)
                    );   
                });
            } else {
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('등록된 상품이 없습니다')
                        .setValue('none')
                );
                selectMenu.setDisabled(true);
            }

            const rowSelect = new ActionRowBuilder().addComponents(selectMenu);
            const btnAdd = new ButtonBuilder().setCustomId('btn_shop_add').setLabel('새 상품 추가').setStyle(ButtonStyle.Success);
            const rowBtn = new ActionRowBuilder().addComponents(btnAdd);

            return { embeds: [embed], components: [rowSelect, rowBtn] };
        }

        function createManageUI(itemId) {
            const item = shop.items.find(i => i.id === itemId);
            if (!item) return createMainUI("해당 상품을 찾을 수 없습니다.");

            const embed = {
                title: `상품 관리: ${item.name}`,
                description: `현재 가격: ${item.price}P\n\n원하시는 작업을 선택해주세요.`,
                color: 0xFEE75C
            };

            const btnEditName = new ButtonBuilder().setCustomId('btn_shop_edit_name').setLabel('상품 이름 변경').setStyle(ButtonStyle.Primary);
            const btnEditPrice = new ButtonBuilder().setCustomId('btn_shop_edit_price').setLabel('상품 가격 변경').setStyle(ButtonStyle.Primary);
            const btnDelete = new ButtonBuilder().setCustomId('btn_shop_delete').setLabel('상품 삭제').setStyle(ButtonStyle.Danger);
            const btnBack = new ButtonBuilder().setCustomId('btn_shop_back').setLabel('뒤로가기').setStyle(ButtonStyle.Secondary);
            
            const row = new ActionRowBuilder().addComponents(btnEditName, btnEditPrice, btnDelete, btnBack);

            return { embeds: [embed], components: [row] };
        }

        const response = await interaction.reply({ ...createMainUI(), fetchReply: true });
        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "이 버튼은 명령어 사용자만 사용할 수 있습니다.", ephemeral: true });
            }
            shop = readShop();

            if (i.customId === 'select_shop_item') {
                selectedItemId = i.values[0];
                await i.update(createManageUI(selectedItemId));
            }
            else if (i.customId === 'btn_shop_back') {
                selectedItemId = null;
                await i.update(createMainUI());
            }
            else if (i.customId === 'btn_shop_delete') {
                shop.items = shop.items.filter(item => item.id !== selectedItemId);
                saveShop(shop);
                selectedItemId = null;

                await i.update({ content: '선택하신 상품이 성공적으로 삭제되었습니다.', embeds: [], components: [] });
                setTimeout(async () => {
                    await interaction.editReply({ content: '', ...createMainUI() }).catch(() => {});
                }, 3000);
            }
            else if (i.customId === 'btn_shop_edit_name' || i.customId === 'btn_shop_edit_price') {
                selectedAction = i.customId === 'btn_shop_edit_name' ? 'name' : 'price';
                const targetItem = shop.items.find(idx => idx.id === selectedItemId);

                await i.update({
                    embeds: [{
                        title: `대기중: ${selectedAction === 'name' ? '새 이름' : '새 가격'} 입력`,
                        description: `${targetItem.name}의 ${selectedAction === 'name' ? '새로운 이름을' : '새로운 가격 숫자를'} 채팅창에 그대로 타이핑해 주세요.\n(30초 제한, 완료 후 본인 메시지는 자동 삭제됩니다.)`,
                        color: 0xFA8072
                    }],
                    components: []
                });

                const msgFilter = m => m.author.id === interaction.user.id;
                const msgCollector = interaction.channel.createMessageCollector({ filter: msgFilter, max: 1, time: 30000 });
                
                msgCollector.on('collect', async m => {
                    const inputData = m.content.trim();
                    try { await m.delete(); } catch(e) {}

                    if (selectedAction === 'name') {
                        targetItem.name = inputData;
                        saveShop(shop);
                        selectedAction = null;

                        await i.editReply({
                            embeds: [{ title: "변경 완료", description: `상품 이름이 ${inputData}(으)로 성공적으로 변경되었습니다.`, color: 0x57F287 }],
                            components: []
                        });

                        setTimeout(async () => {
                            await i.editReply(createManageUI(selectedItemId)).catch(() => {});
                        }, 3000);
                    }
                    else if (selectedAction === 'price') {
                        const parsedPrice = parseInt(inputData);
                        if (isNaN(parsedPrice) || parsedPrice < 0) {
                            selectedAction = null;
                            await i.editReply({
                                embeds: [{ title: "입력 오류", description: "가격은 0 이상의 숫자만 입력해야 합니다.", color: 0xED4245 }],
                                components: []
                            });
                            setTimeout(async () => {
                                await i.editReply(createManageUI(selectedItemId)).catch(() => {});
                            }, 3000);
                        } else {
                            targetItem.price = parsedPrice;
                            saveShop(shop);
                            selectedAction = null;

                            await i.editReply({
                                embeds: [{ title: "변경 완료", description: `가격이 ${parsedPrice}P로 성공적으로 수정되었습니다.`, color: 0x57F287 }],
                                components: []
                            });

                            setTimeout(async () => {
                                await interaction.editReply(createManageUI(selectedItemId)).catch(() => {});
                            }, 3000);
                        }
                    }
                });

                msgCollector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        selectedAction = null;
                        await i.editReply(createManageUI(selectedItemId)).catch(() => {});
                    }
                });
            }
            else if (i.customId === 'btn_shop_add') {
                await i.update({
                    embeds: [{
                        title: '새 상품 추가',
                        description: "추가할 상품의 이름과 가격을 /로 구분해서 채팅창에 전송해주세요.\n(예시: 가챠 티켓 1장/500)",
                        color: 0x57F287
                    }],
                    components: []
                });

                const msgFilter = m => m.author.id === interaction.user.id;
                const addCollector = interaction.channel.createMessageCollector({ filter: msgFilter, max: 1, time: 40000 });

                addCollector.on('collect', async m => {
                    const content = m.content.trim();
                    try { await m.delete(); } catch(e) {}

                    const parts = content.split('/');
                    if (parts.length !== 2) {
                        await i.editReply({
                            embeds: [{ title: "추가 실패", description: "형식이 올바르지 않아 추가가 취소되었습니다.", color: 0xED4245 }],
                            components: []
                        });
                        setTimeout(async () => {
                            await i.editReply(createMainUI()).catch(() => {});
                        }, 3000);
                        return;
                    }

                    const name = parts[0].trim();
                    const price = parseInt(parts[1].trim());

                    if (isNaN(price) || price < 0) {
                        await i.editReply({
                            embeds: [{ title: "추가 실패", description: "가격은 0 이상의 숫자여야 합니다. 추가가 취소되었습니다.", color: 0xED4245 }],
                            components: []
                        });
                        setTimeout(async () => {
                            await i.editReply(createMainUI()).catch(() => {});
                        }, 3000);
                        return;
                    }

                    shop.items.push({ id: `shop_${Date.now()}`, name: name, price: price });
                    saveShop(shop);

                    await i.editReply({
                        embeds: [{ title: "추가 완료", description: `새로운 상품 [${name}]이 성공적으로 추가되었습니다.`, color: 0x57F287 }],
                        components: []
                    });

                    setTimeout(async () => {
                        await interaction.editReply(createMainUI()).catch(() => {});
                    }, 3000);
                });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};