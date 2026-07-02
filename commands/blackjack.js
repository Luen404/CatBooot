const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { loadData, saveData, createDeck, calculateScore, handToString, activeGames, TURN_TIME, JOIN_TIME } = require('../utils/blackjacklogic');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('블랙잭')
        .setDescription('블랙잭')
        .addIntegerOption(option => 
            option.setName('참가비')
                .setDescription('게임에 참여할떄 내는 비용')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        const channelId = interaction.channelId;
        const hostId = interaction.user.id;

        if (activeGames.has(channelId)) {
            return interaction.reply({ content: '이미 게임이 진행 중입니다.', ephemeral: true });
        }

        let betAmount = interaction.options.getInteger('참가비') || 1000;
        if (betAmount < 100) betAmount = 100;

        activeGames.add(channelId);

        const joinEmbed = new EmbedBuilder()
            .setTitle('블랙잭 모집')
            .setDescription(`참가비: ${betAmount.toLocaleString()}P\n모집 시간: ${JOIN_TIME / 1000}초\n\n*방장은 아래 '게임 시작' 버튼을 눌러 즉시 시작할 수 있습니다.*`)
            .addFields({ name: '참여자 목록 (0명)', value: '참가자가 없습니다.', inline: false })
            .setColor(0xFEE75C);

        const joinRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_join').setLabel('참여하기').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bj_start_now').setLabel('게임 시작 (방장 전용)').setStyle(ButtonStyle.Success)
        );

        const lobbyMessage = await interaction.reply({ embeds: [joinEmbed], components: [joinRow], fetchReply: true });
        
        const players = [];
        const joinCollector = lobbyMessage.createMessageComponentCollector({ time: JOIN_TIME });

        joinCollector.on('collect', async (btnInteraction) => {
            if (btnInteraction.customId === 'bj_start_now') {
                if (btnInteraction.user.id !== hostId) {
                    return btnInteraction.reply({ content: '방장만 게임을 즉시 시작할 수 있습니다.', ephemeral: true });
                }
                await btnInteraction.deferUpdate();
                return joinCollector.stop('start_now');
            }

            if (btnInteraction.customId !== 'bj_join') return;

            const userId = btnInteraction.user.id;
            if (players.some(p => p.id === userId)) {
                return btnInteraction.reply({ content: '이미 참여하셨습니다.', ephemeral: true });
            }

            const users = loadData();
            if (!users[userId]) {
                users[userId] = { tag: btnInteraction.member.displayName, Ticket: 0, Point: 0 };
            } else {
                users[userId].tag = btnInteraction.member.displayName;
            }

            if (users[userId].Point < betAmount) {
                return btnInteraction.reply({ content: `포인트가 부족합니다. (보유: ${users[userId].Point.toLocaleString()}P)`, ephemeral: true });
            }

            users[userId].Point -= betAmount;
            saveData(users);

            players.push({
                id: userId,
                hand: [],
                status: 'playing'
            });

            const playerListStr = players.map((p, idx) => `${idx + 1}. <@${p.id}> (-${betAmount.toLocaleString()}P)`).join('\n');
            const updatedJoinEmbed = EmbedBuilder.from(joinEmbed).setFields({ name: `참여자 목록 (${players.length}명) | 총 풀: ${(players.length * betAmount).toLocaleString()}P`, value: playerListStr });
            
            await btnInteraction.update({ embeds: [updatedJoinEmbed] });
        });

        joinCollector.on('end', async (collected, reason) => {
            if (players.length === 0) {
                activeGames.delete(channelId);
                return interaction.editReply({ content: '참가자가 없어 게임이 취소되었습니다.', embeds: [], components: [] });
            }

            await interaction.editReply({ content: '모집이 마감되었습니다. 게임을 시작합니다.', components: [] });

            const deck = createDeck();
            const dealerHand = [deck.pop(), deck.pop()];
            const totalPot = (players.length * betAmount) + betAmount;

            for (const p of players) {
                p.hand.push(deck.pop(), deck.pop());
            }

            let currentPlayerIndex = 0;
            let gameMessage = null;

            async function updateGameScreen(isFinal = false) {
                const currentP = players[currentPlayerIndex];
                const gameEmbed = new EmbedBuilder()
                    .setTitle(`블랙잭 테이블 (총 상금: ${totalPot.toLocaleString()}P)`)
                    .setColor(isFinal ? 0x2B2D31 : 0x5865F2);

                if (isFinal) {
                    gameEmbed.addFields({ name: '딜러의 패', value: `${handToString(dealerHand)}\n점수: \`${calculateScore(dealerHand)}\`` });
                } else {
                    gameEmbed.addFields({ name: '딜러의 패', value: `\`${dealerHand[0].suit}${dealerHand[0].rank}\`, \`❔\`` });
                }

                let playerStatusStr = '';
                players.forEach((p, idx) => {
                    const score = calculateScore(p.hand);
                    let turnMarker = '';
                    let statusText = '';

                    if (!isFinal && idx === currentPlayerIndex) turnMarker = '▶️ ';
                    if (p.status === 'busted') statusText = ' [탈락 / BUST]';
                    if (p.status === 'stand') statusText = ' [STAND]';

                    playerStatusStr += `${turnMarker}<@${p.id}>: ${handToString(p.hand)} (점수: \`${score}\`)${statusText}\n`;
                });
                
                gameEmbed.addFields({ name: '플레이어 현황', value: playerStatusStr });

                let content = `판돈 ${betAmount.toLocaleString()}P 게임 진행 중`;
                let components = [];

                if (!isFinal && currentP) {
                    gameEmbed.setDescription(`현재 턴: <@${currentP.id}> 선택 대기 중... (${TURN_TIME / 1000}초)`);
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit (카드 받기)').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand (멈추기)').setStyle(ButtonStyle.Danger)
                    );
                    components = [row];
                } else if (isFinal) {
                    content = '게임이 종료되었습니다.';
                }

                if (!gameMessage) {
                    gameMessage = await interaction.channel.send({ content, embeds: [gameEmbed], components });
                } else {
                    await gameMessage.edit({ content, embeds: [gameEmbed], components });
                }
            }

            await updateGameScreen();

            async function runTurn() {
                if (currentPlayerIndex >= players.length) {
                    await handleWinnerId(interaction, gameMessage, deck, dealerHand, players, channelId, updateGameScreen, totalPot, betAmount);
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

                const turnCollector = gameMessage.createMessageComponentCollector({
                    filter: i => i.user.id === currentP.id,
                    time: TURN_TIME
                });

                turnCollector.on('collect', async (btnInteraction) => {
                    if (btnInteraction.customId === 'bj_hit') {
                        currentP.hand.push(deck.pop());
                        const score = calculateScore(currentP.hand);

                        await btnInteraction.deferUpdate();

                        if (score > 21) {
                            currentP.status = 'busted';
                            currentPlayerIndex++;
                            
                            turnCollector.stop('finished');

                            await interaction.channel.send(`<@${currentP.id}> 버스트 탈락!`)
                                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000));

                            await updateGameScreen();
                            await runTurn();
                        } else {
                            await updateGameScreen();
                        }
                    } else if (btnInteraction.customId === 'bj_stand') {
                        currentP.status = 'stand';
                        currentPlayerIndex++;
                        
                        await btnInteraction.deferUpdate();
                        turnCollector.stop('finished');
                        
                        await updateGameScreen();
                        await runTurn();
                    }
                });

                turnCollector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        currentP.status = 'stand';
                        currentPlayerIndex++;
                        await interaction.channel.send(`<@${currentP.id}> 시간 초과 자동 Stand`)
                            .then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000));
                        await updateGameScreen();
                        await runTurn();
                    }
                });
            }

            await runTurn();
        });
    }
};

async function handleWinnerId(interaction, gameMessage, deck, dealerHand, players, channelId, updateGameScreen, totalPot, betAmount) {
    const anySurvivor = players.some(p => p.status === 'stand');
    if (anySurvivor) {
        while (calculateScore(dealerHand) < 17) dealerHand.push(deck.pop());
    }

    const dealerScore = calculateScore(dealerHand);
    const users = loadData();
    
    const candidates = players.filter(p => {
        if (p.status === 'busted') return false;
        const pScore = calculateScore(p.hand);
        
        if (dealerScore > 21) return true;
        return pScore >= dealerScore;
    });

    let winners = [];
    let highestScore = -1;

    candidates.forEach(p => {
        const pScore = calculateScore(p.hand);
        if (pScore > highestScore) {
            highestScore = pScore;
            winners = [p];
        } else if (pScore === highestScore) {
            winners.push(p);
        }
    });

    let summaryStr = '';

    if (winners.length > 0) {
        const fee = Math.floor(totalPot * 0.1);
        const netPot = totalPot - fee;
        const prizePerWinner = Math.floor(netPot / winners.length);

        winners.forEach(w => {
            users[w.id].Point += prizePerWinner;
        });
        const winnerTags = winners.map(w => `<@${w.id}>`).join(', ');
        summaryStr = `최종 승자: ${winnerTags}\n획득 상금: \`${prizePerWinner.toLocaleString()}P\` 지급 완료 (총 판돈: ${totalPot.toLocaleString()}P / 수수료 10%: ${fee.toLocaleString()}P 제외)`;
    } else {
        const returnAmount = Math.floor(betAmount * 0.1);
        players.forEach(p => {
            users[p.id].Point += returnAmount;
        });
        summaryStr = `딜러 승리! 플레이어 전원에게 베팅금의 10%인 \`${returnAmount.toLocaleString()}P\`를 돌려드렸습니다.`;
    }

    saveData(users);
    await updateGameScreen(true);

    const resultEmbed = new EmbedBuilder()
        .setTitle('게임 결과 정산')
        .setDescription(summaryStr)
        .setColor(winners.length > 0 ? 0x57F287 : 0xED4245);

    await interaction.channel.send({ embeds: [resultEmbed] });
    activeGames.delete(channelId);
}