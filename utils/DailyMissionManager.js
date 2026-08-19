const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');
const missionPath = path.join(__dirname, '../data/DailyMission.json');
const configPath = path.join(__dirname, '../data/DailyMissionConfig.json');

const CHAT_TARGETS = [50, 75, 100];

const SENTENCES = [
'난 세상에서 제일 귀여운 냥이다',
'고양이는 항상 옳다냥',
'인간! 어서 날 쓰다듬으라냥'
];

function readJson(filePath, defaultData) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4));
            return defaultData;
        }

        const data = fs.readFileSync(filePath, 'utf8');

        if (!data.trim()) {
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4));
            return defaultData;
        }

        return JSON.parse(data);
    } catch (error) {
        console.error(`[DailyMission] JSON 읽기 오류: ${filePath}`, error);
        return defaultData;
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

function createMissions() {
    const config = readJson(configPath, {
        blackjackTarget: 5
    });

    const missionPool = [
        {
            id: 'chat',
            name: '수다쟁이',
            description: '채팅을 목표 횟수만큼 입력하세요.',
            target: randomItem(CHAT_TARGETS)
        },
        {
            id: 'voice',
            name: '냥냥 통화',
            description: '음성 채널에서 30분 활동하세요.',
            target: 30
        },
        {
            id: 'blackjack',
            name: '도박묘',
            description: '블랙잭을 목표 횟수만큼 플레이하세요.',
            target: config.blackjackTarget || 5
        },
        {
            id: 'sentence',
            name: '오늘의 한마디',
            description: '지정된 문장을 메인채팅에 전송하세요.',
            target: 1,
            sentence: SENTENCES.length > 0
                ? randomItem(SENTENCES)
                : null
        }
    ];

    const selected = shuffle(missionPool).slice(0, 3);

    return selected;
}

function ensureUser(missions, userId) {
    if (!missions.users[userId]) {
        missions.users[userId] = {
            progress: {},
            completed: []
        };
    }

    for (const mission of missions.missions) {
        if (missions.users[userId].progress[mission.id] === undefined) {
            missions.users[userId].progress[mission.id] = 0;
        }
    }

    return missions.users[userId];
}

function getMissions() {
    const today = getToday();

    let data = readJson(missionPath, {
        date: '',
        missions: [],
        users: {}
    });

    if (data.date !== today || !Array.isArray(data.missions) || data.missions.length !== 3) {
        data = {
            date: today,
            missions: createMissions(),
            users: {}
        };

        writeJson(missionPath, data);
    }

    return data;
}

function getUserMissions(userId) {
    const data = getMissions();
    const user = ensureUser(data, userId);

    writeJson(missionPath, data);

    return {
        missions: data.missions,
        user
    };
}

function addProgress(userId, missionId, amount = 1) {
    const data = getMissions();
    const user = ensureUser(data, userId);

    const mission = data.missions.find(m => m.id === missionId);

    if (!mission) {
        writeJson(missionPath, data);
        return {
            success: false,
            completed: false
        };
    }

    if (user.completed.includes(missionId)) {
        writeJson(missionPath, data);
        return {
            success: true,
            completed: true,
            alreadyCompleted: true
        };
    }

    user.progress[missionId] = Math.min(
        (user.progress[missionId] || 0) + amount,
        mission.target
    );

    let completed = false;

    if (user.progress[missionId] >= mission.target) {
        completed = true;

        user.completed.push(missionId);
    }

    writeJson(missionPath, data);

    return {
        success: true,
        completed,
        alreadyCompleted: false,
        mission
    };
}

function addVoiceTime(userId, minutes) {
    return addProgress(userId, 'voice', minutes);
}

function getSentence() {
    const data = getMissions();

    const mission = data.missions.find(m => m.id === 'sentence');

    if (!mission) {
        return null;
    }

    return mission.sentence;
}

function getConfig() {
    return readJson(configPath, {
        mainChannelId: '',
        successChannelId: '',
        blackjackTarget: 5,
        rewards: {
            chat: 1,
            voice: 1,
            blackjack: 1,
            sentence: 1
        }
    });
}

function getUserData(userId) {
    const users = readJson(usersPath, {});

    if (!users[userId]) {
        users[userId] = {
            Point: 0,
            NyangCoin: 0,
            TrashInventory: {}
        };
    }

    if (typeof users[userId].Point !== 'number') {
        users[userId].Point = 0;
    }

    if (typeof users[userId].NyangCoin !== 'number') {
        users[userId].NyangCoin = 0;
    }

    if (!users[userId].TrashInventory) {
        users[userId].TrashInventory = {};
    }

    writeJson(usersPath, users);

    return {
        users,
        user: users[userId]
    };
}

function giveReward(userId, missionId) {
    const config = getConfig();
    const reward = config.rewards?.[missionId] ?? 1;

    const data = readJson(missionPath, {
        date: '',
        missions: [],
        users: {}
    });

    const missionUser = ensureUser(data, userId);

    if (!missionUser.rewarded) {
        missionUser.rewarded = [];
    }

    if (missionUser.rewarded.includes(missionId)) {
        return {
            success: false,
            amount: 0
        };
    }

    const userData = getUserData(userId);

    userData.user.NyangCoin += reward;

    writeJson(usersPath, userData.users);

    missionUser.rewarded.push(missionId);

    writeJson(missionPath, data);

    return {
        success: true,
        amount: reward
    };
}

function getMissionProgress(userId) {
    const data = getMissions();
    const user = ensureUser(data, userId);

    writeJson(missionPath, data);

    return {
        date: data.date,
        missions: data.missions,
        user
    };
}

async function completeMission(userId, missionId, client) {
    const config = getConfig();

    const reward = giveReward(userId, missionId);

    if (!reward.success) {
        return;
    }

    if (!config.successChannelId || !client) {
        return;
    }

    try {
        const channel = await client.channels.fetch(config.successChannelId);

        if (!channel) {
            return;
        }

        const missionData = getMissionProgress(userId);
        const mission = missionData.missions.find(m => m.id === missionId);

        if (!mission) {
            return;
        }

        await channel.send(
            `🎉 <@${userId}>\n\n` +
            `**오늘의 일일 미션**\n` +
            `「${mission.name}」\n\n` +
            `✅ 미션을 완료했습니다!\n` +
            `🪙 냥냥코인 **+${reward.amount}**`
        );
    } catch (error) {
        console.error('[DailyMission] 성공 메시지 전송 오류:', error);
    }
}

module.exports = {
    SENTENCES,
    getMissions,
    getUserMissions,
    getMissionProgress,
    addProgress,
    addVoiceTime,
    getSentence,
    completeMission,
    getConfig
};