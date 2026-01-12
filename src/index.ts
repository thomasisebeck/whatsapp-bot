import { pino } from "pino";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";

const logger = pino({
  level: "trace",
  transport: {
    targets: [
      {
        target: "pino-pretty", // pretty-print for console
        options: { colorize: true },
        level: "trace",
      },
      {
        target: "pino/file", // raw file output
        options: { destination: "./wa-logs.txt" },
        level: "trace",
      },
    ],
  },
});
logger.level = "trace";

const PHONE_NUMBER = "27612266700";

// start a connection
async function startService() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Keep this false for pairing codes
    logger: pino({ level: "info" }),
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  });

  sock.ev.on("creds.update", saveCreds);

  // Listen for incoming messages
  sock.ev.on("messages.upsert", async (m) => {
    // 'notify' means it's a new message notification
    if (m.type === "notify") {
      for (const msg of m.messages) {
        // Check if the message has text content
        const messageText = (
          msg.message?.conversation || msg.message?.extendedTextMessage?.text
        )?.toLowerCase();

        const from = msg.key.remoteJid;

        const isInstagramReel = messageText?.includes("instagram.com/reel/");
        const isYoutubeShort = messageText?.includes("youtube.com/shorts/");

        const quotes = [
          "Time isn’t the main thing. It’s the only thing.",
          "Take a deep breath.",
          "How we spend our days, is, of course, how we spend our lives.",
          "This minute is yours.",
          "You’re allowed to be bored.",
          "Your thumb is working harder than your brain.",
          "Choose presence.",
          "Choose intention.",
          "Choose depth.",
          "Choose focus.",
          "Choose stillness.",
          "Just checking in with reality.",
          "Still here? Take a breath.",
          "Plot twist: there’s another reel after this.",
          "Your future self says hi.",
          "Take a moment. Notice your breathing.",
          "Check in with your posture.",
          "Slow your breathing, just a little.",
          "Feel your feet on the ground.",
          "Notice the room around you.",
          "You’re here.",
          "Take one conscious breath.",
        ];

        const isAware = messageText?.toLowerCase().includes("i am aware");

        if ((isInstagramReel || isYoutubeShort) && !isAware) {
          const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

          console.log("FILTERING BANNED CONTENT");

          await sock.chatModify(
            {
              deleteForMe: {
                key: msg.key,
                deleteMedia: true,
                timestamp: Number(msg.messageTimestamp),
              },
            },
            from!,
          );

          await sock.sendMessage(from!, {
            text: `"${randomQuote}"

https://www.sciencedirect.com/science/article/pii/S2405844024063771
https://pmc.ncbi.nlm.nih.gov/articles/PMC11066677/
https://www.youtube.com/watch?v=d43tivfx0qw`,
          });
        }
      }
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      console.log("CONNECTION IS CLOSED, ATTEMPTING TO RECONNECT...");

      //not logged out
      const shouldReconnect =
        (lastDisconnect?.error as any)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      if (shouldReconnect) startService();
    } else if (connection === "open") {
      console.log("✅ Connection fully open!");
    }
  });

  // --- PAIRING CODE LOGIC ---
  // We check if we are registered. If not, we wait for the socket to stabilize.
  if (!sock.authState.creds.registered) {
    // IMPORTANT: The number MUST be digits only. No '+'.

    console.log(
      `Waiting for registration system to initialize for ${PHONE_NUMBER}...`,
    );

    // This delay prevents the "Connection Closed" error/hang
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log(`\n--------------------------`);
        console.log(`YOUR PAIRING CODE: ${code}`);
        console.log(`--------------------------\n`);
      } catch (error) {
        console.error("Critical error requesting pairing code:", error);
      }
    }, 5000); // 5 second delay
  }
}
startService();
