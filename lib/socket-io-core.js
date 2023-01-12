const io = require('socket.io-client');
const HttpsProxyAgent = require('https-proxy-agent');

const connect = (uri, proxy, options = {}) => {
    if (proxy){
        options.agent = new HttpsProxyAgent(proxy);
    }
    
    const socket = io.connect(uri, {
        // secure: false,
        reconnection: true,
        rejectUnauthorized: false,
        pingInterval: 25000,
        pingTimeout: 20000,
        maxPayload: 1000000,
        transports: ['websocket'],
        ...options
    });


    let onevent = socket.onevent;
    socket.onevent = function (packet) {
        const args = packet.data || [];
        onevent.call(this, packet);
        packet.data = ["*"].concat(args);
        onevent.call(this, packet);
    };

    return socket;
};

module.exports = connect;