// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require('path');
const {
    CloudAdapter,
    ConfigurationBotFrameworkAuthentication,
    ActivityHandler
} = require('botbuilder');

// Load environment variables from .env file
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

// Bot Framework Authentication
const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication({
    MicrosoftAppId: process.env.MicrosoftAppId,
    MicrosoftAppPassword: process.env.MicrosoftAppPassword,
    MicrosoftAppTenantId: process.env.MicrosoftAppTenantId,
    MicrosoftAppType: process.env.MicrosoftAppType
});

// Create adapter
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Catch-all for errors
const onTurnErrorHandler = async (context, error) => {
    console.error(`\n [onTurnError] unhandled error: ${ error }`);
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

adapter.onTurnError = onTurnErrorHandler;

// Simulated user class
class SimulatedUser {
    constructor(userId) {
        this.userId = userId; // Unique identifier
        this.isInCall = false; // Track presence in the call
    }
}

// Create an array to hold simulated users
const users = [];
for (let i = 1; i <= 500; i++) {
    users.push(new SimulatedUser(`User${i}`));
}

// Bot's main dialog
class EchoBot extends ActivityHandler {
    constructor() {
        super();
        this.onMessage(async (context, next) => {
            // Ensure context.activity and its properties are defined
            const activity = context.activity || {};
            const messageText = (activity.text || '').toLowerCase();
            const fromId = (activity.from || {}).id || 'unknown';

            console.log('Incoming activity:', activity);

            if (messageText.includes('join')) {
                for (const user of users) {
                    user.isInCall = true; // Simulating user joining
                    await context.sendActivity(`${user.userId} has joined the call.`);
                    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate staggered joining
                }
            } else {
                // Echo the user's message
                await context.sendActivity(`You said: ${messageText}`);
            }

            await next();
        });
    }
}

const myBot = new EchoBot();

// Listen for incoming requests
server.post('/api/messages', async (req, res) => {
    await adapter.process(req, res, async (context) => {
        try {
            await myBot.run(context);
        } catch (error) {
            console.error('Error processing request:', error);
            await context.sendActivity('There was an error processing your request.');
        }
    });
});

// Listen for calling events
server.post('/api/calling', async (req, res) => {
    await adapter.process(req, res, async (context) => {
        try {
            // Handle calling events here
            console.log('Incoming calling event:', context.activity);
            await context.sendActivity('Received a calling event.');
        } catch (error) {
            console.error('Error processing calling event:', error);
            await context.sendActivity('There was an error processing your calling event.');
        }
    });
});

// Listen for Upgrade requests for Streaming
server.on('upgrade', async (req, socket, head) => {
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);
    streamingAdapter.onTurnError = onTurnErrorHandler;
    await streamingAdapter.process(req, socket, head, async (context) => {
        try {
            await myBot.run(context);
        } catch (error) {
            console.error('Error processing request:', error);
            await context.sendActivity('There was an error processing your request.');
        }
    });
});