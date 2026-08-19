const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data');
const missionsPath = path.join(dataDir, 'DailyMissions.json');

function getTodayDateString() {
    const now = new Date();
    const localNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return localNow.toISOString().split('T')[0];
}

class DailyMissionManager {
    constructor() {
        this.defaultMissions = [
            { id: 'chat', name: '채팅 보내기', description: '채팅 50회 작성하기', target: 50 },
//            { id: 'voice', name: '음성 채널 참여', description: '음성 채널 15분 이용하기', target: 15 },
            { id: 'blackjack', name: '블랙잭 플레이', description: '블랙잭 게임 3회 참여하기', target: 3 },
        ];

        this.data = this.loadData();
    }

    loadData() {
        const todayStr = getTodayDateString();

        if (fs.existsSync(missionsPath)) {
            try {
                const raw = JSON.parse(fs.readFileSync(missionsPath, 'utf-8'));
                if (raw.date === todayStr) {
                    return raw;
                }
            } catch (e) {
                console.error('DailyMissions.json 읽기 오류:', e);
            }
        }

        const newData = {
            date: todayStr,
            users: {}
        };
        this.saveData(newData);
        return newData;
    }

    saveData(dataToSave = this.data) {
        try {
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(missionsPath, JSON.stringify(dataToSave, null, 4), 'utf-8');
        } catch (e) {
            console.error('DailyMissions.json 저장 오류:', e);
        }
    }

    checkAndResetDate() {
        const todayStr = getTodayDateString();
        if (this.data.date !== todayStr) {
            this.data = {
                date: todayStr,
                users: {}
            };
            this.saveData();
        }
    }

    getUserData(userId) {
        this.checkAndResetDate();

        if (!this.data.users[userId]) {
            this.data.users[userId] = {
                progress: {},
                completed: [],
                allMissionsRewarded: false
            };
            this.saveData();
        }

        return this.data.users[userId];
    }

    getMissionProgress(userId) {
        const user = this.getUserData(userId);
        return {
            missions: this.defaultMissions,
            user: user
        };
    }

    addProgress(userId, missionId, amount = 1) {
        const user = this.getUserData(userId);
        const mission = this.defaultMissions.find(m => m.id === missionId);

        if (!mission) return { completed: false, alreadyCompleted: false };

        if (!user.progress[missionId]) {
            user.progress[missionId] = 0;
        }

        const isAlreadyCompleted = user.completed.includes(missionId);
        user.progress[missionId] += amount;

        let completedNow = false;
        if (user.progress[missionId] >= mission.target && !isAlreadyCompleted) {
            user.completed.push(missionId);
            completedNow = true;
        }

        this.saveData();

        return {
            completed: user.completed.includes(missionId),
            alreadyCompleted: isAlreadyCompleted,
            justCompleted: completedNow
        };
    }


    async completeMission(userId, missionId, client) {
    const mission = this.defaultMissions.find(m => m.id === missionId);
    if (!mission || !client) return;

    const NOTIFICATION_CHANNEL_ID = '1512486687803048076';

    try {
        const channel = await client.channels.fetch(NOTIFICATION_CHANNEL_ID);
        if (channel) {
            await channel.send(`<@${userId}> 🎉 **[일일 미션 완료]** **${mission.name}** 미션을 완료하셨습니다!`);
        }
    } catch (e) {
        console.error('미션 완료 알림 전송 실패:', e);
    }
}
}

module.exports = new DailyMissionManager();