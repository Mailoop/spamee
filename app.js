

const { App } = require('@slack/bolt');
const { v4 } = require('uuid');
const uuid = v4
const mondaySdk = require("monday-sdk-js")
const monday = mondaySdk();

const mapItem = item => ({
    id: item.id,
    status: item.column_values.find(value => value.id == "status").text,
})

const fromObjectToSerie = (object, defaultObj = {}) => Object.keys(object)
    .map(key => ({
        ...defaultObj,
        name: key,
        value: object[key]
    }))


const sumBy = (toGroup, toCount) => (acc, val) => ({
    ...acc,
    [toGroup(val)]: (acc[toGroup(val)] || 0) + (toCount(val) || 0),
})


monday.setToken(process.env.MONDAY_TOKEN)
const getItems = async () =>
    await monday.api(`query { 
        boards(ids: 451147539) { 
            items(limit: 200) {
                id 
                column_values {
                    id 
                    value 
                    text
                }
            }
        } 
    }`
    ).then(res => res)



const formatStep = step => (`•  \`${step.name}\`:  ${step.value}\n`)

// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.command('/feature_progression', async ({ command, ack, say }) => {
    await ack();
    await say('Ok, look at feature progression.')
    const response = await getItems()
    const items = response.data.boards[0].items
    const result = fromObjectToSerie(
        items.map(mapItem).reduce(sumBy(x => x.status, x => 1), {})
    ).sort((a, b) => parseInt(a.name[0]) - parseInt(b.name[0]))
    console.log(result)
    await say({
        blocks: [{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `
        Here what i found:
${result.map(formatStep).join("")}

To get more result: https://mailoopsavetheworld.monday.com/boards/451147539/views/7237995
        `
}
        }]
    })

})

app.command('/spamee_present_yourself', async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();
    await say({
        blocks: [{
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": `
Hey✋, thanks for calling me, i'm spamee.
I work as (CIO) Chief information Officer at Mailoop and may help in you're daily task. I know these things:

\`/spamee_present_yourself\`: to present myself.
\`/new_feature <name_of_the_feature>\` : to create a new feature in mailoop products.

To call me type these command directly in slack.

Take care of yourself.
Spamee
        ` 
        }
    }]})
})



app.command('/new_feature', async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();
    const regex = /\W/gi;
    const featureName = command.text.replace(regex, '-').toLowerCase()
    const channelName = `ft-${featureName}-${uuid().slice(0,7)}`
    const usersToInvite = ['UCQ66FCTD',command.user_id]
    console.log(command)
    await say(`It's time to give words to this idea 💡`);

    try {
        const create_channel = await app.client.conversations.create({
            token: process.env.SLACK_BOT_TOKEN,
            name: channelName,
            user_ids: command.user_id,
        });
        console.log(create_channel)
        const invite_members = await app.client.conversations.invite({
            token: process.env.SLACK_BOT_TOKEN,
            channel: create_channel.channel.id,
            users: usersToInvite.join(","),
        });
        await say({
            blocks: [{
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Channel: \`#${channelName}\` created 🎉`
                }
            }]
        })
    } catch {
        console.log("Cant create channel")
        await say(`😓, It's seems we got something not expected was not able to create the channel.`);

    }
});


app.message('hello', async ({ message, say }) => {
    // say() sends a message to the channel where the event was triggered
    await ack();
    await say("Hey i'm s");
});

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();

