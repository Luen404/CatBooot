const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/users.json');

function loadData() {
    if (!fs.existsSync(DATA_PATH)) return {};
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function saveData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4));
}

function createDeck() {
    const suits = ['♠', '♦', '♥', '♣'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) deck.push({ suit, rank });
    }
    return deck.sort(() => Math.random() - 0.5);
}

function calculateScore(hand) {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
        if (['J', 'Q', 'K'].includes(card.rank)) score += 10;
        else if (card.rank === 'A') { score += 11; aces++; }
        else score += parseInt(card.rank);
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
}

function handToString(hand) {
    return hand.map(c => `\`${c.suit}${c.rank}\``).join(', ');
}

module.exports = {
    loadData,
    saveData,
    createDeck,
    calculateScore,
    handToString,
    activeGames: new Set(), // 채널별 중복 실행 방지 공유 Set
    BET_AMOUNT: 1000,
    JOIN_TIME: 30000,
    TURN_TIME: 30000
};