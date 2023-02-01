function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function getEntities() {
    return {
        sheep: {type: "Entity", speedY: 100, height: 28.44, width: 17, lineMove: .8},
        necromancerSheepSoul: {type: "Entity", speedY: 130, height: 28.44, width: 17, lineMove: .596},
        necromancerSheep: {type: "Entity", speedY: 95, height: 28.44, width: 17, lineMove: .397},
        bigSheep: {type: "Entity", speedY: 75, height: 38.1, width: 26, lineMove: 1.33},
        line: {type: "Entity", y: 550 / 2, x: 300 / 2, width: 300, height: 26, slowingDown: .05},
        fastSheep: {type: "Entity", speedY: 175, height: 25.33, width: 15, lineMove: .31},
        bee: {type: "Entity", speedY: 135, height: 20, width: 20, lineMove: .19}
    }
}

function getBuildings() {
    return {
        farm: {type: "Building", width: 50, height: 50, speedEarn: 2, earnDelay: 2880},
        doubleFarm: {type: "Building", width: 100, height: 50, speedEarn: 3, earnDelay: 3120},
        deadFarm: {type: "Building", width: 100, height: 100, speedEarn: 5, earnDelay: 5088},
        pasture: {type: "Building", width: 50, height: 50, spawnUnits: [{unitType: "sheep"}], unitSpawnerDelay: 8e3},
        crashedPlane: {type: "Building", width: 50, height: 50, windSpeedY: 90, windRangeYTop: 425},
        beehiveFarm: {type: "Building", width: 50, height: 50, spawnUnits: [{unitType: "bee"}], unitSpawnerDelay: 5e3, speedEarn: 1, earnDelay: 2400},
        teslaTower: {type: "Building", width: 50, height: 50}
    }
}

function unitToEmoji(unit) {
    switch (unit) {
        case "line":
            return "🪵"
        case "sheep":
            return "🥚"
        case "bigSheep":
            return "🏐"
        case "farm":
            return "🌾"
        case "pasture":
            return "🐑"
        case "doubleFarm":
            return "🚚"
        case "crashedPlane":
            return "🛩"
        case "deadFarm":
            return "🚜"
        case "fastSheep":
            return "⚪️"
        case "bee":
            return "🐝"
        case "beehiveFarm":
            return "🛖"
        case "necromancerSheep":
            return "👻"
        case "teslaTower":
            return "🪫"
        case "empty1":
        case "empty2":
        case "empty3":
        case "empty4":
            return "🃏"
    }
}


function chestToEmoji(chest) {
    switch (chest) {
        case "common":
            return "⬜"
        case "magic":
            return "🟦"
        case "legendary":
            return "🟪"
        default:
            return "🟫"
    }
}

function getUnitSize(unit) {
    switch (unit) {
        case "line":
        case "sheep":
        case "bigSheep":
        case "farm":
        case "pasture":
        case "crashedPlane":
        case "fastSheep":
        case "teslaTower":
        case "bee":
        case "beehiveFarm":
        case "necromancerSheep":
            return [1, 1];
        case "doubleFarm":
            return [1, 2];
        case "deadFarm":
            return [2, 2]
    }
}


function getUnitPrice(unit) {
    switch (unit) {
        case "line":
            return 0;
        case "sheep":
            return 9;
        case "bigSheep":
            return 13;
        case "farm":
            return 8;
        case "pasture":
            return 10;
        case "crashedPlane":
            return 9;
        case "fastSheep":
            return 8;
        case "doubleFarm":
            return 15;
        case "deadFarm":
            return 17
        case "bee":
            return 5
        case "beehiveFarm":
            return 0 // idk
        case "necromancerSheep":
            return 0 // idk
        case "teslaTower":
            return 10
    }
}


function sumUnitsPrice(units) {
    return units.reduce((c, obj) => (c + getUnitPrice(obj.unitType)), 0);
}

function createLobbyUrl(data) {
    let url = "";
    let id = "";

    if (typeof data === "string") {
        url = data;
    }

    if (typeof data.url !== "undefined") {
        url = data.url;
    }

    if (typeof data._id !== "undefined") {
        id = `:${data._id}`;
    }

    return `https://vk.com/app51491054#lobby${url}${id}`
}

module.exports = {sleep, chestToEmoji, unitToEmoji, getUnitSize, createLobbyUrl, getUnitPrice, sumUnitsPrice}