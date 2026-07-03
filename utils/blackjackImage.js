const { createCanvas } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const { calculateScore } = require('./blackjacklogic');
registerFont(path.join(__dirname, 'fonts', 'NanumGothic.ttf'), { family: 'NanumGothic' });

async function drawTableImage(dealerHand, players, hideDealerCard = false, betAmount = 1000) {
    const canvasWidth = 600;
    const canvasHeight = 180 + (players.length * 130);
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a472a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(canvasWidth - 180, 15, 150, 35, 6);
    ctx.fill();

    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 14px "Malgun Gothic", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`판돈: ${betAmount.toLocaleString()}P`, canvasWidth - 105, 37);

    ctx.textAlign = 'left';

    function drawCard(x, y, suit, rank, isHidden = false) {
        ctx.fillStyle = isHidden ? '#2c3e50' : '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(x, y, 70, 100, 8);
        ctx.fill();
        ctx.stroke();

        if (isHidden) {
            ctx.strokeStyle = '#ecf0f1';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 10, y + 10, 50, 80);
            ctx.font = '20px "Malgun Gothic", Arial, sans-serif';
            ctx.fillStyle = '#ecf0f1';
            ctx.fillText('?', x + 28, y + 58);
            return;
        }

        const isRed = (suit === '♥' || suit === '♦' || suit === 'H' || suit === 'D');
        ctx.fillStyle = isRed ? '#e74c3c' : '#2c3e50';
        
        ctx.font = 'bold 20px "Malgun Gothic", Arial, sans-serif';
        ctx.fillText(rank, x + 8, y + 25);

        ctx.font = '35px "Malgun Gothic", Arial, sans-serif';
        let displaySuit = suit;
        if (suit === 'S') displaySuit = '♠';
        if (suit === 'H') displaySuit = '♥';
        if (suit === 'D') displaySuit = '♦';
        if (suit === 'C') displaySuit = '♣';

        ctx.fillText(displaySuit, x + 18, y + 65);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Malgun Gothic", Arial, sans-serif';
    
    const dealerScore = hideDealerCard ? '?' : calculateScore(dealerHand);
    ctx.fillText(`--- DEALER HAND (총합: ${dealerScore}) ---`, 30, 35);
    
    dealerHand.forEach((card, idx) => {
        const isHidden = (hideDealerCard && idx === 1);
        drawCard(30 + (idx * 85), 50, card.suit, card.rank, isHidden);
    });

    players.forEach((p, pIdx) => {
        const startY = 180 + (pIdx * 130);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Malgun Gothic", Arial, sans-serif';
        
        const isBusted = p.status === 'busted';
        const pScore = isBusted ? 'BUST' : calculateScore(p.hand);
        ctx.fillText(`--- ${p.name} (${p.status.toUpperCase()}) | 총합: ${pScore} ---`, 30, startY - 10);

        p.hand.forEach((card, cIdx) => {
            drawCard(30 + (cIdx * 85), startY, card.suit, card.rank, isBusted);
        });
    });

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'blackjack-table.png' });
}

module.exports = { drawTableImage };