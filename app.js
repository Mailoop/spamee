

const { App } = require('@slack/bolt');
const { v4 } = require('uuid');
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONNAL_TOKEN
});

const uuid = v4

const sumBy = (toGroup, toCount) => (acc, val) => ({
    ...acc,
    [toGroup(val)]: (acc[toGroup(val)] || 0) + (toCount(val) || 0),
})

const fromObjectToArray = (keyKeyName, valueKeyName, object) => Object.keys(object)
    .map(key => ({
        [keyKeyName]: key,
        [valueKeyName]: object[key]
    }))

const asyncForEach = async (array, callback) =>  {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

const format_issue = issue => `${issue.title}
    ${issue.html_url}
    
`

const sumByToArray = (toGroup, toCount) => (acc, val, idx, array) => {
    const internal_acummulator = sumBy(toGroup, toCount)
    if (idx < array.length - 1) {
        return (internal_acummulator(acc, val, idx, array))
    }
    else {
        return (fromObjectToArray("label", "count", internal_acummulator(acc, val, idx, array)))
    }
}

const keepMaxBy = (maxFn) => (acc, val) => {
    if (maxFn(val) <= maxFn(acc))
        return (acc)
    else {
        return (val)
    }
}

const isProgressionLabel = x => x.name.match(new RegExp('0:|1:|2:|3:|4:'))

const getItems = async () => await octokit.request("/repos/Mailoop/app/issues?per_page=500").then(res => res.data)

const formatStep = step => (`•  \`${step.label}\`:  ${step.count}\n`)

// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.command('/features_progression', async ({ command, ack, say }) => {
    await ack();
    await say('Ok, look at feature progression.')

    const issues = await getItems()
    const issuesResume = issues.filter(x => x.repository_url == 'https://api.github.com/repos/Mailoop/app')
        .map(y => (y.labels || [])
            .filter(isProgressionLabel)
            .reduce(keepMaxBy(x => parseInt(x.name[0])), (y.labels[0]))
        )
        .filter(x => x)
        .filter(isProgressionLabel)
        .reduce(sumByToArray(x => x.name, x => 1), {})
        .sort((a, b) => parseInt(b.label[0]) - parseInt(a.label[0]))
    
    await say({
        blocks: [{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `
        Here what i found:
${issuesResume.map(formatStep).join("")}
        `
            }
        }]
    })


    const delivering_issue = issues.filter(y => (y.labels || []).some(x => x.name.match(new RegExp('4:'))))

    asyncForEach(delivering_issue, async issue => {
        await say({
            blocks: [{
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": format_issue(issue)
                }
            }]
        })
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

