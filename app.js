

const { App } = require('@slack/bolt');
const { v4 } = require('uuid');
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONNAL_TOKEN
});

const milisecondsByDay = (24 * 3600 * 1000)

const SLACK_WORKPLACE_ID = "TCR9UEFKR"

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

const daysSince = date => Math.floor((new Date() - date) / milisecondsByDay)
const formatAssignee = assignee => `${assignee.login}`

const linkedIssueTitle = issue => `<${issue.html_url}|* ${ issue.title }*>`

const format_issue = issue => `${linkedIssueTitle(issue)}
${issue.assignees.map(formatAssignee).join(", ")}
Open ${daysSince(Date.parse(issue.created_at))} day(s) ago

    
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

const createdIssueDefaultBody = `Spamme create this issue`
const defaultAssignees = [""]

const create_issue = async (title, body = createdIssueDefaultBody, assignees = defaultAssignees) => await octokit.issues.create({
    owner: "Mailoop",
    repo: "app",
    labels: ["1: Definition Qualification"],
    title,
    body,
    assignees
});

const formatStep = step => (`•  \`${step.label}\`:  ${step.count}\n`)

// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.command('/features_progression', async ({ command, ack, say }) => {
    await ack();
    await say('Ok, look at feature progression.')

    const rawIssues = await getItems()
    const issues = rawIssues.filter(x => x.repository_url == 'https://api.github.com/repos/Mailoop/app')
    const issuesCount = issues.length
    const averageOpenningTime = Math.floor(
        (issues.reduce((acc, issue) => acc + (new Date() - Date.parse(issue.created_at)), 0)) / (issuesCount * milisecondsByDay)
    )
    const issuesResume = issues.map(y => (y.labels || [])
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
•  \`Open issues\`:  ${issues.length}
•  \`Average openning time\`:  ${averageOpenningTime} day(s)
By steps: 
${issuesResume.map(formatStep).join("")}
        `
            }
        }]
    })

    const unassignedIssues = issues.filter(issue => issue.assignees.length == 0)
    if (unassignedIssues.length > 0) {
        await say({
            blocks: [{
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `⚠️ Warning : ${unassignedIssues.length} issues are unassigned. <https://github.com/Mailoop/app/issues?q=is%3Aissue+is%3Aopen+no%3Aassignee| Github>
                    `
                }
            }]
        })

    }


    const delivering_issue = issues.filter(y => (y.labels || []).some(x => x.name.match(new RegExp('4:'))))

    await say({
        blocks: [{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `Note to feature owner: 
These features are on delivering, if they work on an user account, mark them as done ✅ `
            }
        }]
    })

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

const defaultIssueBody = `Created from Slack By Spamme@ 🎉
Keep in mind the flow 😉 
The handbook: https://bit.ly/3bgb195
<img width="841" alt="image" src="https://user-images.githubusercontent.com/18465628/85058484-7a20a700-b1a2-11ea-96be-bc2e6ad5f4e6.png">
`


app.command('/new_feature', async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();
    const regex = /\W/gi;
    const channelOption = /\ --channel /gi;
    const withChannel = channelOption.test(command.text)
    const featureName = command.text.replace(regex, '-').toLowerCase()
    const issueName = command.text.replace(regex, ' ').toLowerCase()
    const channelName = `ft-${featureName}-${uuid().slice(0,7)}`
    const usersToInvite = ['UCQ66FCTD',command.user_id]
    console.log(command)
    await say(`It's time to give words to this idea 💡`);



    try {
        let issueBody = ""
        if (withChannel) {
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

            issueBody = `Created from Slack By Spamme@ 🎉 \n Slack Channel: [Web](https://app.slack.com/client/${SLACK_WORKPLACE_ID}/${create_channel.channel.id})`
        } else {
            issueBody = defaultIssueBody
        }

        const issue = await create_issue(issueName, issueBody)
        let confirmationText = ""

        if (withChannel) {
            await app.client.chat.postMessage({
                token: process.env.SLACK_BOT_TOKEN,
                channel: create_channel.channel.id,
                text: `
            Here some informations to help you: 
            Github Issue: ${issue.data.html_url}
            The feature flow 😉: https://user-images.githubusercontent.com/18465628/81449005-a1d22780-917f-11ea-9685-bc8214e61484.png
            The flow handbook: https://bit.ly/3bgb195 
            `
        })
        confirmationText = "Channel: \`#${channelName}\` created 🎉"

        } else {
            confirmationText = `Issue: ${issueName} created 
${issue.data.html_url}  🎉`
        }

        await say({
            blocks: [{
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": confirmationText,
                }
            }]
        })

    } catch {
        console.log("Cant create channel")
        await say(`😓, It's seems we got something not expected was not able to create the channel.`);

    }
});


const ramdomElement = (array) => array[Math.floor(Math.random() * array.length)]

app.command('/yes_yes', async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();
    const typicalAnswer = [ 
        "Yes, Yes, of course",
        "Oui, oui c'est bon",
        "Will gonna do it .",
        "D'accord d'accord",
        "Yes got it",
    ]

        await say({
            blocks: [{
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": ramdomElement(typicalAnswer),
                }
            }]
        })
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

