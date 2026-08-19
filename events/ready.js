const fs = require('fs');
const path = require('path');
const loadCommands = require('../Handler/commandHandler');
const { REST, Routes, Events } = require('discord.js');

const stocksPath = path.join(process.cwd(), 'data', 'Stocks.json');

function updateStockPrices() {
    if (!fs.existsSync(stocksPath)) return;

    try {
        const data = JSON.parse(fs.readFileSync(stocksPath, 'utf-8'));
        const now = new Date();
        let updated = false;

        for (const stock of data.stocks) {
            const lastUpdate = stock.lastUpdated ? new Date(stock.lastUpdated) : new Date(0);
            const diffHours = (now - lastUpdate) / (1000 * 60 * 60);

            if (diffHours >= 3) {
                updated = true;
                stock.lastUpdated = now.toISOString();

                if (stock.trend === undefined) stock.trend = 0;

                let upChance = 50 - (stock.trend * 10);
                upChance = Math.max(10, Math.min(90, upChance));

                const isUp = (Math.random() * 100) < upChance;

                if (isUp) {
                    stock.trend = stock.trend > 0 ? stock.trend + 1 : 1;
                } else {
                    stock.trend = stock.trend < 0 ? stock.trend - 1 : -1;
                }

                const changePercent = Math.random() * 0.50;
                const rate = isUp ? (1 + changePercent) : (1 - changePercent);

                stock.price = Math.max(1, Math.round(stock.price * rate));
            }
        }

        if (updated) {
            fs.writeFileSync(stocksPath, JSON.stringify(data, null, 4), 'utf-8');
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
            'Percent.json': { "items": [] },
            'PointConfig.json': {},
            'users.json': {},
            'Shop.json': { "items": [] },
            'Stocks.json': { "stocks": [] },
            'UserStocks.json': {}
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

        updateStockPrices();
        setInterval(() => {
            updateStockPrices();
        }, 1000 * 60 * 10);

        await loadCommands(client);

        const commandData = [];
        const commandsPath = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                commandData.push(command.data.toJSON());
            }
        }

        const rest = new REST({ version: '10' }).setToken(process.env.DSC_T);

        (async () => {
            try {
                await rest.put(
                    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                    { body: commandData }
                );
                console.log("성공");
            } catch (error) {
                console.log('실패', error);
            }
        })();
    },
};