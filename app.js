const { App } = require("@slack/bolt");
const { Octokit } = require("@octokit/rest");
const setTechRequestFlow = require("./TechRequest");

const octokit = new Octokit({
  auth: process.env.GITHUB_PERSONNAL_TOKEN,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});
const create_issue = async (
  title,
  body = `Spamme create this issue`,
  labels = ["1: Definition Qualification"],
  assignees = [""]
  ) =>
  await octokit.issues.create({
    owner: "Mailoop",
    repo: "app",
    labels,
    title,
    body,
    assignees,
  });
  
  
  setTechRequestFlow(app, create_issue);

   (async () => {
     // Start your app

     await app.start(process.env.PORT || 3000);
     
     console.log("⚡️ Bolt app is running!");
    }
    )();
    
