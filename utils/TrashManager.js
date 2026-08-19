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

    if (data.user.NyangCoin <= 0) {
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

    data.user.NyangCoin -= 1;

    if (!data.user.TrashInventory[item.id]) {
        data.user.TrashInventory[item.id] = 0;
    }

    data.user.TrashInventory[item.id] += 1;

    writeJson(usersPath, data.users);

    return {
        success: true,
        item,
        remainingCoin: data.user.NyangCoin
    };
}

function getInventory(userId) {
    const data = getUser(userId);
    const items = readJson(itemsPath, []);

    const inventory = [];

    for (const item of items) {
        const amount =
            data.user.TrashInventory[item.id] || 0;

        if (amount > 0) {
            inventory.push({
                ...item,
                amount
            });
        }
    }

    return {
        inventory,
        totalValue: inventory.reduce(
            (sum, item) => sum + item.value * item.amount,
            0
        ),
        nyangCoin: data.user.NyangCoin
    };
}

function sellAll(userId) {
    const data = getUser(userId);
    const items = readJson(itemsPath, []);

    let total = 0;
    const sold = [];

    for (const item of items) {
        const amount =
            data.user.TrashInventory[item.id] || 0;

        if (amount <= 0) {
            continue;
        }

        const value = amount * item.value;

        total += value;

        sold.push({
            ...item,
            amount,
            total: value
        });
    }

    if (total <= 0) {
        return {
            success: false,
            reason: 'EMPTY'
        };
    }

    data.user.Point += total;
    data.user.TrashInventory = {};

    writeJson(usersPath, data.users);

    return {
        success: true,
        sold,
        total
    };
}

module.exports = {
    searchTrash,
    getInventory,
    sellAll
};