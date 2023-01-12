function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
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
            return [1, 1];
        case "doubleFarm":
            return [1, 2];
        case "deadFarm":
            return [2, 2]
    }
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

module.exports = {sleep, chestToEmoji, unitToEmoji, getUnitSize, createLobbyUrl}