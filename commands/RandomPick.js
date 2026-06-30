const { SlashCommandBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');
const percentPath = path.join(__dirname, '../data/Percent.json');
const inventoryPath = path.join(__dirname, '../data/Inventory.json');

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

module.exports = {
    data: new SlashCommandBuilder() 
        .setName('뽑기') 
        .setDescription('뽑기권을 사용하여 가챠를 진행합니다') 
        .addIntegerOption(option => option .setName('횟수') 
        .setDescription('연속으로 진행할 횟수') 
        .setRequired(false) 
        .setMinValue(1) 
    ),

    async execute(interaction) {
        const count = interaction.options.getInteger('횟수') ?? 1;
        const userID = interaction.user.id;
        const userDisplayName = interaction.member.displayName;

        const users = readJson(usersPath, {});
        const percentData = readJson(percentPath, { items: [] });

        if (percentData.items.length === 0) {
            return interaction.reply({ content: "현재 등록된 뽑기 상품이 없습니다. 관리자 메뉴에서 먼저 등록해주세요.", ephemeral: true });
        }

        if (!users[userID] || (users[userID].Ticket || 0) < count) {
             const currentTicket = users[userID] ? (users[userID].Ticket || 0) : 0; 
             
             return interaction.reply({ content: `뽑기권이 부족합니다.\n필요: ${count}장\n보유: ${currentTicket}장`, ephemeral: true }); 
        }

        const inventory = readJson(inventoryPath, {}); 
        if (!inventory[userID]) inventory[userID] = []; 
        const resultList = []; 
        for (let i = 0; i < count; i++) { 
            const randomNumber = Math.random() * 100; 
            
            let accumulate = 0; 
            let pickedItem = null; 
            
            for (const item of percentData.items) { 
                accumulate += item.chance; 
                
                if (randomNumber < accumulate) { 
                    pickedItem = item; 
                    break; 
                } 
            } 
            if (!pickedItem) { 
                pickedItem = percentData.items[percentData.items.length - 1]; 
            } 
            
            users[userID].Ticket--; 
            
            const isKkwang = pickedItem.name.includes("꽝") || 
            (pickedItem.id && String(pickedItem.id).includes("꽝")) || 
            (pickedItem.id && String(pickedItem.id).toLowerCase().includes("kkwang")); 
            
            if (!isKkwang) { 
                inventory[userID].push({ 
                    itemId: pickedItem.id || `gacha_${Date.now()}_${i}`, 
                    name: pickedItem.name, 
                    obtainedAt: new Date().toISOString() 
                }); 
            } 
            
            resultList.push(`${pickedItem.name} (${pickedItem.chance}%)`); 
        } 
        
        saveJson(usersPath, users); 
        saveJson(inventoryPath, inventory);
        const embed = { 
            title: "가챠 결과", 
            description: `${userDisplayName}님의 뽑기 결과\n\n` + resultList.join("\n"), color: 0x5865F2, 
            footer: { text: `남은 뽑기권 : ${users[userID].Ticket}장` } 
        }; 
            
        await interaction.reply({ embeds: [embed] });
    }
};
