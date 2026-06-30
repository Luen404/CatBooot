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

const configPath = path.join(__dirname, '../data/Percent.json');

function readConfig() {
    if (!fs.existsSync(configPath)) {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify({ items: [] }, null, 4));
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function saveConfig(data) {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('뽑기설정')
        .setDescription('물품, 확률을 변경합니다 (관리자 전용)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        let config = readConfig();
        let selectedItemId = null;
        let selectedAction = null;

        function createMainUI(statusMessage = "메뉴에서 수정할 품목을 선택 혹은 새로운 품목을 추가할 수 있습니다.") {
            config = readConfig();

            const totalChance = config.items.reduce((sum, item) => sum + item.chance, 0);

            const embed = {
                title: "뽑기 설정 컨트롤 패널",
                description: `${statusMessage}\n\n현재 총 확률 합계: ${parseFloat(totalChance.toFixed(4))}% (정확히 100%여야 가챠가 정상 작동합니다.)`,
                color: 0x5865F2,
                fields: config.items.map(i => ({ 
                    name: i.name, 
                    value: `확률: ${i.chance}%`, 
                    inline: true 
                }))
            };

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_item')
                .setPlaceholder('수정할 품목을 선택하세요');
             
            if (config.items.length > 0) {
                config.items.forEach(item => {
                    selectMenu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(item.name)
                            .setDescription(`현재 확률: ${item.chance}%`)
                            .setValue(item.id)
                    );   
                });
            } else {
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('등록된 물품이 없습니다')
                        .setValue('none')
                );
                selectMenu.setDisabled(true);
            }

            const rowSelect = new ActionRowBuilder().addComponents(selectMenu);
            const btnAdd = new ButtonBuilder().setCustomId('btn_add').setLabel('새 품목 추가').setStyle(ButtonStyle.Success);
            const rowBtn = new ActionRowBuilder().addComponents(btnAdd);

            return { embeds: [embed], components: [rowSelect, rowBtn] };
        }

        function createManageUI(itemId) {
            const item = config.items.find(i => i.id === itemId);
            if (!item) return createMainUI("해당 품목을 찾을 수 없습니다.");

            const embed = {
                title: `품목 관리: ${item.name}`,
                description: `현재 확률: ${item.chance}%\n\n원하시는 작업을 선택해주세요.`,
                color: 0xFEE75C
            };

            const btnEditName = new ButtonBuilder().setCustomId('btn_edit_name').setLabel('품목 이름 변경').setStyle(ButtonStyle.Primary);
            const btnEditChance = new ButtonBuilder().setCustomId('btn_edit_chance').setLabel('품목 확률 변경').setStyle(ButtonStyle.Primary);
            const btnDelete = new ButtonBuilder().setCustomId('btn_delete').setLabel('품목 삭제').setStyle(ButtonStyle.Danger);
            const btnBack = new ButtonBuilder().setCustomId('btn_back').setLabel('뒤로가기').setStyle(ButtonStyle.Secondary);
            
            const row = new ActionRowBuilder().addComponents(btnEditName, btnEditChance, btnDelete, btnBack);

            return { embeds: [embed], components: [row] };
        }

        const response = await interaction.reply({ ...createMainUI(), fetchReply: true });

        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "이 버튼은 명령어 사용자만 사용할 수 있습니다.", ephemeral: true });
            }
            config = readConfig();

            if (i.customId === 'select_item') {
                selectedItemId = i.values[0];
                await i.update(createManageUI(selectedItemId));
            }
            else if (i.customId === 'btn_back') {
                selectedItemId = null;
                await i.update(createMainUI());
            }
            else if (i.customId === 'btn_delete') {
                config.items = config.items.filter(item => item.id !== selectedItemId);
                saveConfig(config);
                selectedItemId = null;

                await i.update({ content: '선택하신 품목이 성공적으로 삭제되었습니다.', embeds: [], components: [] });
                setTimeout(async () => {
                    await interaction.editReply({ content: '', ...createMainUI() }).catch(() => {});
                }, 3000);
            }
            else if (i.customId === 'btn_edit_name' || i.customId === 'btn_edit_chance') {
                selectedAction = i.customId === 'btn_edit_name' ? 'name' : 'chance';
                const targetItem = config.items.find(idx => idx.id === selectedItemId);

                await i.update({
                    embeds: [{
                        title: `대기중: ${selectedAction === 'name' ? '새 이름' : '새 확률'} 입력`,
                        description: `${targetItem.name}의 ${selectedAction === 'name' ? '새로운 이름을' : '새로운 확률 숫자를(예: 0.1, 1.5)'} 채팅창에 그대로 타이핑해 주세요.\n(30초 제한, 완료 후 본인 메시지는 자동 삭제됩니다.)`,
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
                        saveConfig(config);
                        selectedAction = null;

                        await i.editReply({
                            embeds: [{ title: "변경 완료", description: `품목 이름이 ${inputData}으로 성공적으로 변경되었습니다.`, color: 0x57F287 }],
                            components: []
                        });

                        setTimeout(async () => {
                            await i.editReply(createManageUI(selectedItemId)).catch(() => {});
                        }, 3000);
                    }
                    else if (selectedAction === 'chance') {
                        const parsedChance = parseFloat(inputData);
                        if (isNaN(parsedChance) || parsedChance <= 0) {
                            selectedAction = null;
                            
                            await i.editReply({
                                embeds: [{ title: "입력 오류", description: "확률은 0보다 큰 올바른 숫자(소수 가능)여야 합니다.", color: 0xED4245 }],
                                components: []
                            });

                            setTimeout(async () => {
                                await i.editReply(createManageUI(selectedItemId)).catch(() => {});
                            }, 3000);
                        } else {
                            const otherItemsChance = config.items
                                .filter(item => item.id !== selectedItemId)
                                .reduce((sum, item) => sum + item.chance, 0);

                            if (parseFloat((otherItemsChance + parsedChance).toFixed(4)) > 100) {
                                selectedAction = null;
                                await i.editReply({
                                    embeds: [{ 
                                        title: "변경 실패", 
                                        description: `확률 합산이 100%를 초과합니다. (현재 다른 품목들의 합: ${parseFloat(otherItemsChance.toFixed(4))}%, 입력한 값: ${parsedChance}%)`, 
                                        color: 0xED4245 
                                    }],
                                    components: []
                                });

                                setTimeout(async () => {
                                    await i.editReply(createManageUI(selectedItemId)).catch(() => {});
                                }, 3000);
                                return;
                            }

                            targetItem.chance = parsedChance;
                            saveConfig(config);
                            selectedAction = null;

                            await i.editReply({
                                embeds: [{ title: "변경 완료", description: `확률이 ${parsedChance}%로 성공적으로 수정되었습니다.`, color: 0x57F287 }],
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
            else if (i.customId === 'btn_add') {
                await i.update({
                    embeds: [{
                        title: '새 품목 추가',
                        description: "추가할 품목의 이름과 확률을 /로 구분해서 채팅창에 전송해주세요.\n(예시: 냥민의 초희귀 칭호/0.1)",
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
                    const chance = parseFloat(parts[1].trim());

                    if (isNaN(chance) || chance <= 0) {
                        await i.editReply({
                            embeds: [{ title: "추가 실패", description: "확률은 0보다 큰 숫자여야 합니다. 추가가 취소되었습니다.", color: 0xED4245 }],
                            components: []
                        });
                        setTimeout(async () => {
                            await i.editReply(createMainUI()).catch(() => {});
                        }, 3000);
                        return;
                    }

                    const currentTotalChance = config.items.reduce((sum, item) => sum + item.chance, 0);

                    if (parseFloat((currentTotalChance + chance).toFixed(4)) > 100) {
                        await i.editReply({
                            embeds: [{ 
                                title: "추가 실패", 
                                description: `확률 합산이 100%를 초과할 수 없습니다. (현재 합: ${parseFloat(currentTotalChance.toFixed(4))}%, 입력한 값: ${chance}%)`, 
                                color: 0xED4245 
                            }],
                            components: []
                        });
                        setTimeout(async () => {
                            await i.editReply(createMainUI()).catch(() => {});
                        }, 3000);
                        return;
                    }

                    config.items.push({ id: `item_${Date.now()}`, name: name, chance: chance });
                    saveConfig(config);

                    await i.editReply({
                        embeds: [{ title: "추가 완료", description: `새로운 품목 [${name}]이 성공적으로 추가되었습니다.`, color: 0x57F287 }],
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
    },
};
