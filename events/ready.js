const fs = require('fs');
const path = require('path');

const loadCommands = require('../Handler/commandHandler');
const { REST, Routes, Events, EmbedBuilder } = require('discord.js');

const stocksPath = path.join(process.cwd(), 'data', 'Stocks.json');

const STOCK_CHANNEL_ID = '여기에_채널_ID';
const STOCK_UPDATE_HOURS = 3;
const STOCK_CHECK_INTERVAL = 1000 * 60 * 10;

function readStocks() {
    if (!fs.existsSync(stocksPath)) {
        return { stocks: [] };
    }

    try {
        return JSON.parse(fs.readFileSync(stocksPath, 'utf-8'));
    } catch (error) {
        console.error('Stocks.json 읽기 오류:', error);
        return { stocks: [] };
    }
}

function formatKoreanTime(date) {
    return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
}

async function updateStockPrices(client) {
    if (!fs.existsSync(stocksPath)) return;

    try {
        const data = readStocks();

        if (!Array.isArray(data.stocks)) {
            return;
        }

        const now = new Date();
        let updated = false;
        const changedStocks = [];
        const channel = client.channels.cache.get(STOCK_CHANNEL_ID);

        for (const stock of data.stocks) {
            const lastUpdate = stock.lastUpdated
                ? new Date(stock.lastUpdated)
                : new Date(0);

            const diffHours = (now - lastUpdate) / (1000 * 60 * 60);

            if (diffHours >= STOCK_UPDATE_HOURS) {
                const oldPrice = Number(stock.price) || 1;

                stock.lastUpdated = now.toISOString();

                if (stock.trend === undefined) {
                    stock.trend = 0;
                }

                let upChance = 50 - (stock.trend * 10);
                upChance = Math.max(10, Math.min(90, upChance));

                const isUp = (Math.random() * 100) < upChance;

                if (isUp) {
                    stock.trend = stock.trend > 0
                        ? stock.trend + 1
                        : 1;
                } else {
                    stock.trend = stock.trend < 0
                        ? stock.trend - 1
                        : -1;
                }

                const changePercent = Math.random() * 0.50;
                const rate = isUp
                    ? 1 + changePercent
                    : 1 - changePercent;

                stock.price = Math.max(
                    1,
                    Math.round(oldPrice * rate)
                );

                const difference = stock.price - oldPrice;
                const percent = oldPrice > 0
                    ? (difference / oldPrice) * 100
                    : 0;

                const nextUpdate = new Date(
                    lastUpdate.getTime() +
                    STOCK_UPDATE_HOURS * 60 * 60 * 1000
                );

                changedStocks.push({
                    stock,
                    oldPrice,
                    newPrice: stock.price,
                    difference,
                    percent,
                    isUp,
                    nextUpdate
                });

                updated = true;
            }
        }

        if (updated) {
            fs.writeFileSync(
                stocksPath,
                JSON.stringify(data, null, 4),
                'utf-8'
            );

            console.log(
                `[주식] ${changedStocks.length}개 종목 가격 변동`
            );
        }

        if (channel && changedStocks.length > 0) {
            const embed = new EmbedBuilder()
                .setTitle('📊 주식 시장 변동')
                .setDescription('주식 시장의 가격이 변동되었습니다.')
                .setTimestamp();

            for (const info of changedStocks) {
                const {
                    stock,
                    oldPrice,
                    newPrice,
                    difference,
                    percent,
                    isUp,
                    nextUpdate
                } = info;

                const arrow = isUp ? '📈' : '📉';
                const sign = difference >= 0 ? '+' : '';

                embed.addFields({
                    name: `${arrow} ${stock.name}`,
                    value:
                        `**${oldPrice.toLocaleString()}** → **${newPrice.toLocaleString()}**\n` +
                        `${sign}${difference.toLocaleString()} (${sign}${percent.toFixed(2)}%)\n` +
                        `다음 예상 변동 시간: **${formatKoreanTime(nextUpdate)}**`,
                    inline: true
                });
            }

            await channel.send({
                embeds: [embed]
            });
        }
    } catch (error) {
        console.error('주가 변동 업데이트 중 오류 발생:', error);
    }
}

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        console.log(`로그인 => ${client.user.tag}`);

        const dataDir = path.join(process.cwd(), 'data');

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('data 폴더 생성');
        }

        const defaultData = {
            'Inventory.json': {},
            'Percent.json': { items: [] },
            'PointConfig.json': {},
            'users.json': {},
            'Shop.json': { items: [] },
            'Stocks.json': {
                "stocks": [
                    {
                        "id": "stock_1710000000000",
                        "name": "(주) 진동기증",
                        "price": 5000,
                        "basePrice": 5000,
                        "lastUpdated": "2026-08-19T12:00:00.000Z"
                    },
                    {
                        "id": "stock_1720000000000",
                        "name": "뭬에에에에엥 사이렌",
                        "price": 5000,
                        "basePrice": 5000,
                        "lastUpdated": "2026-08-19T12:00:00.000Z"
                    },
                    {
                        "id": "stock_1730000000000",
                        "name": "30년 전통 레즈보빔밥 명가",
                        "price": 5000,
                        "basePrice": 5000,
                        "lastUpdated": "2026-08-19T12:00:00.000Z"
                    },
                    {
                        "id": "stock_1740000000000",
                        "name": "(주) 겜순이보추화연구소",
                        "price": 5000,
                        "basePrice": 5000,
                        "lastUpdated": "2026-08-19T12:00:00.000Z"
                    },
                    {
                        "id": "stock_1750000000000",
                        "name": "똥",
                        "price": 500,
                        "basePrice": 500,
                        "lastUpdated": "2026-08-19T12:00:00.000Z"
                    }
                ]
            },
        'UserStocks.json': {},
        'Attendance.json': {}
        };

        for (const [file, data] of Object.entries(defaultData)) {
            const filePath = path.join(dataDir, file);

            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(
                    filePath,
                    JSON.stringify(data, null, 4),
                    'utf8'
                );

                console.log(`${file} 생성`);
            }
        }

        await updateStockPrices(client);

        setInterval(async () => {
            await updateStockPrices(client);
        }, STOCK_CHECK_INTERVAL);

        await loadCommands(client);

        const commandData = [];
        const commandsPath = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsPath)
            .filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                commandData.push(command.data.toJSON());
            }
        }

        const rest = new REST({ version: '10' })
            .setToken(process.env.DSC_T);

        try {
            await rest.put(
                Routes.applicationGuildCommands(
                    process.env.CLIENT_ID,
                    process.env.GUILD_ID
                ),
                { body: commandData }
            );

            console.log('성공');
        } catch (error) {
            console.log('실패', error);
        }
    }
};