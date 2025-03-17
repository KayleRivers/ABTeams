// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

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

class EchoBot extends ActivityHandler {
    constructor() {
        super();
        // Handle messages
        this.onMessage(async (context, next) => {
            const activity = context.activity || {};
            const messageText = (activity.text || '').toLowerCase();

            if (messageText.includes('join')) {
                for (const user of users) {
                    user.isInCall = true; // Simulating user joining
                    await context.sendActivity(`${user.userId} has joined the call.`);
                    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate staggered joining
                }
            } else {
                // Echo the user's message
                const replyText = `Echo: ${context.activity.text}`;
                await context.sendActivity(MessageFactory.text(replyText, replyText));
            }

            await next();
        });

        // Handle new members
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            await next();
        });
    }
}

module.exports.EchoBot = EchoBot;