const fs = require('fs');
const path = require('path');

const usersPath = path.join(process.cwd(), 'data', 'users.json');
const configPath = path.join(process.cwd(), 'data', 'PointConfig.json');

const rewardJoinTimes = new Map();

function readConfig() {
    if (!fs.existsSync(configPath)) {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });

        fs.writeFileSync(
            configPath,
            JSON.stringify({
                messagePoint: 1,
                voicePoint: 5
            }, null, 4),
            'utf-8'
        );
    }

    try {
        return JSON.parse(
            fs.readFileSync(configPath, 'utf-8')
        );
    } catch (e) {
        console.error('PointConfig.json 읽기 오류:', e);

        return {
            messagePoint: 1,
            voicePoint: 5
        };
    }
}

module.exports = {
    handleJoin(userId) {
        rewardJoinTimes.set(userId, Date.now());
    },

    handleLeave(userId) {
        const joinTime = rewardJoinTimes.get(userId);

        if (!joinTime) return;

        const durationMinutes = Math.floor(
            (Date.now() - joinTime) / (1000 * 60)
        );

        rewardJoinTimes.delete(userId);

        if (durationMinutes <= 0) return;

        const config = readConfig();

        const voicePoint =
            typeof config.voicePoint === 'number'
                ? config.voicePoint
                : 5;

        const earnedPoints = durationMinutes * voicePoint;

        try {
            const users = JSON.parse(
                fs.readFileSync(usersPath, 'utf-8')
            );

            if (!users[userId]) {
                users[userId] = {
                    Point: 0,
                    Ticket: 0,
                    coin: 0
                };
            }

            users[userId].Point =
                (users[userId].Point || 0) + earnedPoints;

            fs.writeFileSync(
                usersPath,
                JSON.stringify(users, null, 4),
                'utf-8'
            );

        } catch (e) {
            console.error('보상 지급 중 오류:', e);
        }
    }
};