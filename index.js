const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const qrcode = require('qrcode-terminal');

const phoneNumber = '6282114853127@s.whatsapp.net';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,        
    });
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('QR code received, please scan:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ Connection opened!');

            if (!phoneNumber || !/^\d+@s\.whatsapp\.net$/.test(phoneNumber)) {
                console.error('❌ Invalid phone number format. Please use [number]@s.whatsapp.net');
                return;
            }

            try {                
                await sock.sendMessage(phoneNumber, { text: 'Hello from Baileys! This is the updated code.' });
                console.log('🚀 Message sent successfully!');
            } catch (error) {
                console.error('Error sending message: ', error);
            }
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();