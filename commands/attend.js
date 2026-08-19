const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const usersPath = path.join(process.cwd(), 'data', 'users.json');
const attendancePath = path.join(process.cwd(), 'data', 'Attendance.json');

const SERVER_TAG = '냐¿옹';

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

function getTodayDateString() {
    const now = new Date();
    const localNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return localNow.toISOString().split('T')[0];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('출석체크')
        .setDescription('일일 출석체크를 진행하여 포인트를 획득합니다.'),

    async execute(interaction) {
        const userID = interaction.user.id;
        const todayStr = getTodayDateString();

        let users = readJson(usersPath, {});
        let attendance = readJson(attendancePath, {});

        if (!users[userID]) {
            users[userID] = { Point: 0 };
        }
        if (typeof users[userID].Point !== 'number') {
            users[userID].Point = 0;
        }

        if (!attendance[todayStr]) {
            attendance[todayStr] = {};
        }

        if (attendance[todayStr][userID]) {
            return interaction.reply({
                embeds: [{
                    title: "출석체크 완료됨",
                    description: "이미 오늘 출석체크를 완료하셨습니다.\n매일 밤 12시(자정)에 다시 출석체크가 가능합니다.",
                    color: 0xED4245
                }],
                ephemeral: true
            });
        }

        const member = interaction.member;
        const nickname = member.nickname || '';
        const username = interaction.user.username;
        const globalName = interaction.user.globalName || '';

        const hasTag = nickname.includes(SERVER_TAG) || username.includes(SERVER_TAG) || globalName.includes(SERVER_TAG);

        const basePoint = 2000;
        const bonusPoint = hasTag ? 1000 : 0;
        const totalPoint = basePoint + bonusPoint;

        users[userID].Point += totalPoint;
        attendance[todayStr][userID] = {
            time: new Date().toISOString(),
            reward: totalPoint,
            hasTag: hasTag
        };

        saveJson(usersPath, users);
        saveJson(attendancePath, attendance);

        let desc = `오늘의 출석체크가 완료되었습니다!\n\n` +
                   `• 기본 지급: **${basePoint.toLocaleString()}P**\n`;

        if (hasTag) {
            desc += `• 서버 태그 혜택: **+${bonusPoint.toLocaleString()}P**\n서버 태그 달아줘서 고마워요 😘\n`;
        } else {
            desc += `• 서버 태그 혜택: **없음** (닉네임에 [${SERVER_TAG}] 포함 시 +1,000P 추가)\n`;
        }

        desc += `\n총 획득 포인트: **+${totalPoint.toLocaleString()}P**\n` +
                `현재 보유 포인트: **${users[userID].Point.toLocaleString()}P**`;

        return interaction.reply({
            embeds: [{
                title: "✅ 출석체크 성공",
                description: desc,
                color: 0x57F287
            }]
        });
    }
};