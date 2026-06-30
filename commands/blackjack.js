const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { loadData, saveData, createDeck, calculateScore, handToString, activeGames, BET_AMOUNT, JOIN_TIME, TURN_TIME } = require('../utils/blackjacklogic');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('블랙잭')
        .setDescription('포인트를 걸고 멀티플레이어 블랙잭 게임을 시작합니다.'),
    
    async execute(interaction) {
        const channelId = interaction.channelId;
        if (activeGames.has(channelId)) {
            return interaction.reply({ content: '❌ 이 채널에서 이미 블랙잭 게임이 진행 중입니다.', ephemeral: true });
        }

        activeGames.add(channelId);

        const joinEmbed = new EmbedBuilder()
            .setTitle('🃏 멀티플레이어 블랙잭 모집 시작!')
            .setDescription(`아래 **참여** 버튼을 눌러 게임에 등록하세요!\n\n💰 **참가비:** \`${BET_AMOUNT}P\`\n⏱️ **모집 시간:** ${JOIN_TIME / 1000}초`)
            .addFields({ name: '참여자 목록 (0명)', value: '아직 참가자가 없습니다.', inline: false })
            .setColor(0x5865F2);

        const joinRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_join').setLabel('✋ 참여하기').setStyle(ButtonStyle.Primary)
        );

        const lobbyMessage = await interaction.reply({ embeds: [joinEmbed], components: [joinRow], fetchReply: true });
        
        const players = [];
        const joinCollector = lobbyMessage.createMessageComponentCollector({ time: JOIN_TIME });

        joinCollector.on('collect', async (btnInteraction) => {
            if (btnInteraction.customId !== 'bj_join') return;

            const userId = btnInteraction.user.id;
            if (players.some(p => p.id === userId)) {
                return btnInteraction.reply({ content: '❌ 이미 참여하셨습니다.', ephemeral: true });
            }

            const users = loadData();
            if (!users[userId]) {
                users[userId] = { tag: btnInteraction.user.username, Ticket: 0, Point: 0 };
            }

            if (users[userId].Point < BET_AMOUNT) {
                return btnInteraction.reply({ content: `❌ 포인트가 부족합니다. (보유: ${users[userId].Point}P)`, ephemeral: true });
            }

            users[userId].Point -= BET_AMOUNT;
            saveData(users);

            players.push({
                id: userId,
                tag: btnInteraction.user.username,
                hand: [],
                status: 'playing'
            });

            const playerListStr = players.map((p, idx) => `${idx + 1}. **${p.tag}** (-${BET_AMOUNT}P)`).join('\n');
            const updatedJoinEmbed = EmbedBuilder.from(joinEmbed).setFields({ name: `참여자 목록 (${players.length}명)`, value: playerListStr });
            
            await btnInteraction.update({ embeds: [updatedJoinEmbed] });
        });

        joinCollector.on('end', async () => {
            if (players.length === 0) {
                activeGames.delete(channelId);
                return interaction.editReply({ content: '😢 참가자가 없어 게임이 취소되었습니다.', embeds: [], components: [] });
            }

            const deck = createDeck();
            const dealerHand = [deck.pop(), deck.pop()];

            for (const p of players) {
                p.hand.push(deck.pop(), deck.pop());
            }

            let currentPlayerIndex = 0;

            async function updateGameScreen(isFinal = false) {
                const currentP = players[currentPlayerIndex];
                const gameEmbed = new EmbedBuilder()
                    .setTitle('🃏 블랙잭 테이블')
                    .setColor(isFinal ? 0x2B2D31 : 0x5865F2);

                if (isFinal) {
                    gameEmbed.addFields({ name: '🤖 딜러의 패', value: `${handToString(dealerHand)}\n점수: \`${calculateScore(dealerHand)}\`` });
                } else {
                    gameEmbed.addFields({ name: '🤖 딜러의 패', value: `\`${dealerHand[0].suit}${dealerHand[0].rank}\`, \`❔\`` });
                }

                let playerStatusStr = '';
                players.forEach((p, idx) => {
                    const score = calculateScore(p.hand);
                    let turnMarker = '';
                    let statusText = '';

                    if (!isFinal && idx === currentPlayerIndex) turnMarker = '▶️ ';
                    if (p.status === 'bust') statusText = ' 💥 [BUST]';
                    if (p.status === 'stand') statusText = ' 🛑 [STAND]';

                    playerStatusStr += `${turnMarker}**${p.tag}**: ${handToString(p.hand)} (점수: \`${score}\`)${statusText}\n`;
                });
                
                gameEmbed.addFields({ name: '👥 플레이어 현황', value: playerStatusStr });

                if (!isFinal && currentP) {
                    gameEmbed.setDescription(`💬 현재 턴: <@${currentP.id}>님 선택 대기 중... (${TURN_TIME / 1000}초)`);
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit (카드 받기)').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand (멈추기)').setStyle(ButtonStyle.Danger)
                    );
                    await interaction.editReply({ content: '🎲 게임이 진행 중입니다.', embeds: [gameEmbed], components: [row] });
                } else if (isFinal) {
                    await interaction.editReply({ content: '🏁 게임이 종료되었습니다.', embeds: [gameEmbed], components: [] });
                }
            }

            await updateGameScreen();

            async function runTurn() {
                if (currentPlayerIndex >= players.length) {
                    await handleSettlement(interaction, deck, dealerHand, players, channelId, updateGameScreen);
                    return;
                }

                const currentP = players[currentPlayerIndex];
                
                if (calculateScore(currentP.hand) === 21) {
                    currentP.status = 'stand';
                    currentPlayerIndex++;
                    await updateGameScreen();
                    await runTurn();
                    return;
                }

                const turnCollector = lobbyMessage.createMessageComponentCollector({
                    filter: i => i.user.id === currentP.id,
                    time: TURN_TIME,
                    max: 1
                });

                turnCollector.on('collect', async (btnInteraction) => {
                    if (btnInteraction.customId === 'bj_hit') {
                        currentP.hand.push(deck.pop());
                        const score = calculateScore(currentP.hand);

                        if (score > 21) {
                            currentP.status = 'bust';
                            currentPlayerIndex++;
                            await btnInteraction.reply({ content: `💥 **${currentP.tag}**님 버스트!` }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
                            await updateGameScreen();
                            await runTurn();
                        } else {
                            await btnInteraction.deferUpdate();
                            await updateGameScreen();
                            turnCollector.stop('hit_continue');
                        }
                    } else if (btnInteraction.customId === 'bj_stand') {
                        currentP.status = 'stand';
                        currentPlayerIndex++;
                        await btnInteraction.deferUpdate();
                        await updateGameScreen();
                        await runTurn();
                    }
                });

                turnCollector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        currentP.status = 'stand';
                        currentPlayerIndex++;
                        await interaction.channel.send(`⏱️ <@${currentP.id}>님의 턴이 시간 초과되어 자동 Stand 처리되었습니다.`);
                        await updateGameScreen();
                        await runTurn();
                    } else if (reason === 'hit_continue') {
                        await runTurn();
                    }
                });
            }

            await runTurn();
        });
    }
};

// 정산 내부 함수
async function handleSettlement(interaction, deck, dealerHand, players, channelId, updateGameScreen) {
    const anySurvivor = players.some(p => p.status === 'stand');
    if (anySurvivor) {
        while (calculateScore(dealerHand) < 17) dealerHand.push(deck.pop());
    }

    const dealerScore = calculateScore(dealerHand);
    const users = loadData();
    let summaryStr = '';

    players.forEach(p => {
        const playerScore = calculateScore(p.hand);
        if (p.status === 'bust') {
            summaryStr += `❌ **${p.tag}**: 버스트 패배 (-1,000P)\n`;
        } else if (dealerScore > 21) {
            users[p.id].Point += BET_AMOUNT * 2;
            summaryStr += `🎉 **${p.tag}**: 딜러 버스트로 승리! (+1,000P 상금)\n`;
        } else if (playerScore > dealerScore) {
            users[p.id].Point += BET_AMOUNT * 2;
            summaryStr += `🎉 **${p.tag}**: 승리! (+1,000P 상금)\n`;
        } else if (playerScore < dealerScore) {
            summaryStr += `😢 **${p.tag}**: 패배 (-1,000P)\n`;
        } else {
            users[p.id].Point += BET_AMOUNT;
            summaryStr += `🤝 **${p.tag}**: 무승부 (1,000P 전액 반환)\n`;
        }
    });

    saveData(users);
    await updateGameScreen(true);

    const resultEmbed = new EmbedBuilder()
        .setTitle('🏁 최종 포인트 정산 결과')
        .setDescription(summaryStr)
        .setColor(0x57F287);

    await interaction.channel.send({ embeds: [resultEmbed] });
    activeGames.delete(channelId);
}