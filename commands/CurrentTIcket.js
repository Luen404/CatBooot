const { SlashCommandBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/users.json');
const inventoryPath = path.join(__dirname, '../data/Inventory.json');

module.exports = { 
    data: new SlashCommandBuilder()
        .setName('보관함')
        .setDescription('현재 보유중인 재화와 아이템을 보여줘요'),
    async execute(interaction) {
        const userID = interaction.user.id;
        const userTAG = interaction.user.tag;

        let userData = {};
        try { 
            if (fs.existsSync(dataPath)) {
                const fileContent = fs.readFileSync(dataPath, 'utf-8');
                userData = JSON.parse(fileContent);
            }
        } catch (error) {
            console.error('JSON 읽어오기 오류', error);
            return interaction.reply({content:'데이터 읽어오기 오류', ephemeral : true})
        }

        if (!userData[userID]) {
            userData[userID] = {
                tag: userTAG,
                Ticket: 0,
                Point: 0
            };

            try {
                fs.writeFileSync(dataPath, JSON.stringify(userData, null, 4), 'utf-8');
            } catch (error) {
                console.error('JSON 저장 오류', error);
                return interaction.reply({content:'데이터 저장 오류', ephemeral : true})
            }
        }

        const currentTicket = userData[userID].Ticket;
        const currentPoint = userData[userID].Point || 0;

        let inventoryData = {};
        if (fs.existsSync(inventoryPath)) {
            try {
                inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
            } catch (error) {
                console.error('인벤토리 읽기 오류', error);
            }
        }

        const userItems = inventoryData[userID] || [];

        let itemDisplay = "보관함이 비어 있습니다.";
        if (userItems.length > 0) {
            const itemCounts = {};
            userItems.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
            });

            itemDisplay = Object.entries(itemCounts)
                .map(([name, count]) => `${name} (x${count})`)
                .join('\n');
        }

        const embed = {
            title: `${interaction.member.displayName}님의 보관함`,
            color: 0x5865F2,
            fields: [
                { name: "보유 재화", value: `뽑기권: ${currentTicket}장\n보유 포인트: ${currentPoint}P`, inline: false },
                { name: "보유 아이템 목록", value: itemDisplay, inline: false }
            ],
        };

        await interaction.reply({ embeds: [embed] });
    }
}