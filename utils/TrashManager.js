const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');
const itemsPath = path.join(__dirname, '../data/TrashItems.json');

function readJson(filePath, defaultData) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(
            filePath,
            JSON.stringify(defaultData, null, 4)
        );

        return defaultData;
    }

    try {
        const data = fs.readFileSync(filePath, 'utf8');

        if (!data.trim()) {
            return defaultData;
        }

        return JSON.parse(data);
    } catch {
        return defaultData;
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(
        filePath,
        JSON.stringify(data, null, 4)
    );
}

function getUser(userId) {
    const users = readJson(usersPath, {});

    if (!users[userId]) {
        users[userId] = {
            Point: 0,
            coin: 0
        };
    }

    if (typeof users[userId].Point !== 'number') {
        users[userId].Point = 0;
    }

    if (typeof users[userId].coin !== 'number') {
        users[userId].coin = 0;
    }

    return {
        users,
        user: users[userId]
    };
}

function drawItem() {
    const items = readJson(itemsPath, []);

    if (!items.length) {
        return null;
    }

    const totalWeight = items.reduce(
        (sum, item) => sum + item.weight,
        0
    );

    let random = Math.random() * totalWeight;

    for (const item of items) {
        random -= item.weight;

        if (random <= 0) {
            return item;
        }
    }

    return items[items.length - 1];
}

function searchTrash(userId) {
    const data = getUser(userId);

    if (data.user.coin <= 0) {
        return {
            success: false,
            reason: 'NO_COIN'
        };
    }

    const item = drawItem();

    if (!item) {
        return {
            success: false,
            reason: 'NO_ITEM'
        };
    }

    data.user.coin -= 1;

    const gainedPoint = item.value || 0;
    data.user.Point += gainedPoint;

    writeJson(usersPath, data.users);

    return {
        success: true,
        item,
        gainedPoint,
        totalPoint: data.user.Point,
        remainingCoin: data.user.coin
    };
}

module.exports = {
    searchTrash
};