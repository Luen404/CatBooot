const fs = require('fs');
const path = require('path');
const usersPath = path.join(process.cwd(), 'data', 'users.json');

const rewardJoinTimes = new Map();

module.exports = {
    handleJoin(userId) {
        rewardJoinTimes.set(userId, Date.now());
    },

    handleLeave(userId) {
        const joinTime = rewardJoinTimes.get(userId);
        if (!joinTime) return;

        const durationMinutes = Math.floor((Date.now() - joinTime) / (1000 * 60));
        rewardJoinTimes.delete(userId);

        if (durationMinutes > 0) {
            const earnedPoints = durationMinutes * 10;
            
            try {
                const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
                if (!users[userId]) users[userId] = { Point: 0, Ticket: 0, Coin: 0 };
                
                users[userId].Point = (users[userId].Point || 0) + earnedPoints;
                fs.writeFileSync(usersPath, JSON.stringify(users, null, 4), 'utf-8');
            } catch (e) {
                console.error('보상 지급 중 오류:', e);
            }
        }
    }
};