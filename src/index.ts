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

        const jokes = [
          "I asked my dog what’s two minus two. He said nothing.",
          "I would tell you a joke about time travel, but you didn’t like it.",
          "I’m on a seafood diet. I see food and I eat it.",
          "Why don’t eggs tell jokes? They’d crack each other up.",
          "Why did the coffee file a police report? It got mugged.",
          "Why don’t oysters donate to charity? Because they’re shellfish.",
          "Why do cows wear bells? Because their horns don’t work.",
          "I asked the gym instructor if he could teach me to do the splits. He said, ‘How flexible are you?’ I said, ‘I can’t make Tuesdays.’",
          "Why did the developer go broke? Because he used up all his cache.",
          "I used to be addicted to soap. But I’m clean now.",
          "Why did the invisible man turn down the job offer? He couldn’t see himself doing it.",
          "I started a band called 999MB. We still haven’t gotten a gig.",
          "Why did the man put his money in the freezer? He wanted cold hard cash.",
          "The future, the present, and the past walked into a bar. It was tense.",
          "I stayed up all night to see where the sun went. Then it dawned on me.",
          "A Buddhist monk approaches a burger truck and says, ‘Make me one with everything.’",
          "I poured root beer into a square cup. Now I just have beer.",
          "Two antennas met on a roof, fell in love — the reception was excellent.",
          "Are people born with photographic memories, or does it take time to develop?",
          "A book fell on my head. I only have my shelf to blame.",
          "I can tell when people are judgmental just by looking at them.",
          "I told my wife she should embrace her mistakes — she gave me a hug.",
          "I told a chemistry joke… but there was no reaction.",
          "Why did the librarian get kicked out of the party? She kept checking everyone out!",
        ];

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

        const isJoke = messageText?.toLowerCase().includes("joke");

        if (isJoke) {
          const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
          await sock.sendMessage(from!, {
            text: `Did someone say joke?

${randomJoke}`,
          });
        }

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
