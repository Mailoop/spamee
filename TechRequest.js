const Handlebars = require("handlebars");
const axios = require("axios");

const newTaskUrl = "https://prod-17.francecentral.logic.azure.com:443/workflows/042f34490dea4c9bbc1d17730000dd6e/triggers/manual/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=0YfCwhmF0hlOFMAhyNE2EA7_42wGoyVdOsKK0jLOP7U"
const postTask = (body) => {
  axios.post(newTaskUrl, body)
  .then(response => response.data)
  .catch(function (error) {
    console.log(error);
  });
}


const inputValue = (input) => {
  switch (input.type) {
    case "plain_text_input":
      return input.value;
    case "radio_buttons":
      return input.selected_option.value;
  }
};

const partials = [
  {
    name: "githubIssueHeader",
    template: `Created from Slack By Spamme@ 🎉
    Keep in mind the flow 😉 [Here the handbook](https://bit.ly/3bgb195)
    <img width="841" alt="image" src="https://usxer-images.githubusercontent.com/18465628/85058484-7a20a700-b1a2-11ea-96be-bc2e6ad5f4e6.png">
    #### Helpfull resources : 🤝
    Design toolkit: 🎨  [Here](https://bit.ly/3b1Txza)
`,
  },
  {
    name: "slackAckMessage",
    template: "Tech request received, working on it 🤙",
  },
  {
    name: "defaultIssueTemplate",
    template: `{{>githubIssueHeader}}
{{#if client}}**Client:** {{client}}{{/if}}
{{#if email_address}}**User:** {{email_address}}{{/if}}
**Description**
{{description}}`,
  },
  {
    name: "defaultSlackAnswer",
    template: `<{{issue.data.html_url}} | {{responses.title}}>

Nb: 🗒️ Screenshot are helpfull 😉 (Here or on Github)
Thanks for calling ✋
`,
  },
];

partials.forEach((x) => {
  Handlebars.registerPartial(x.name, x.template);
});

const config = {
  defaultChannelId: "CCQPRDCGH",
  slackRequestAck: "{{> slackAckMessage}}",
  defaultTemplate: "{{> defaultIssueTemplate}}",
  defaultSlackAnswer: "{{> defaultSlackAnswer}}",
  categories: {
    feature: {
      answerTemplate: "💡Feature Request Created {{> defaultSlackAnswer}}",
      labels: ["Cat: Feature"],
      selectText: "💡 Feature or new product to create",
      assignees: [],
    },
    bug: {
      answerTemplate: "🐛 Bug Request Created {{> defaultSlackAnswer}}",
      labels: ["Cat: Bug"],
      selectText: "🐛 Bug (something do not work anymore)",
      assignees: [],
    },
    data: {
      answerTemplate: "📊 Data Request {{> defaultSlackAnswer}}",
      labels: ["Cat: Data Request"],
      selectText:
        "📊 Data Information for customer success (Feedback stats, ect...)",
      assignees: [],
    },
    typo: {
      answerTemplate:
        "🎨 Typo / UI improvement request created {{> defaultSlackAnswer}}",
      labels: ["Cat: Typo/UI"],
      selectText: "🎨 Typo/UI improvement",
      assignees: [],
    },
    other: {
      answerTemplate: "❓ Request created {{> defaultSlackAnswer}}",
      labels: ["Cat: Miscellaneous"],
      selectText: "❓ Other request",
      assignees: [],
    },
  },
};

const findCategorie = (refName) => config.categories[refName];
const categoriesArr = Object.keys(config.categories).map((x) => ({
  refName: x,
  ...config.categories[x],
}));

const cleanInput = (rawInput) =>
  Object.keys(rawInput).reduce(
    (acc, val) => ({ ...acc, [val]: inputValue(rawInput[val][val]) }),
    {}
  );

const getView = (state) => {
  const headBlock = [
    {
      type: "actions",
      block_id: "categoryRefName",
      elements: [
        {
          type: "radio_buttons",
          action_id: "categoryRefName",
          options: categoriesArr.map((category) => ({
            text: {
              type: "plain_text",
              text: category.selectText,
              emoji: true,
            },
            value: category.refName,
          })),
        },
      ],
    },
    {
      type: "input",
      block_id: "title",
      element: {
        type: "plain_text_input",
        action_id: "title",
        placeholder: {
          type: "plain_text",
          text: "Ex: Typo on feedbacks evolution",
        },
      },
      label: {
        type: "plain_text",
        text: "Title",
      },
    },
  ];

  let coreBlock = [];

  if (state.selectedCategory == "bug") {
    coreBlock = [
      {
        type: "input",
        optional: true,
        block_id: "client",
        element: {
          type: "plain_text_input",
          action_id: "client",
          placeholder: {
            type: "plain_text",
            text: "Ex: Dalkia",
          },
        },
        label: {
          type: "plain_text",
          text: "Client",
        },
      },
      {
        type: "input",
        optional: true,
        block_id: "user_email",
        element: {
          type: "plain_text_input",
          action_id: "user_email",
          placeholder: {
            type: "plain_text",
            text: "Ex : andrea.lebon@dalkia.com",
          },
        },
        label: {
          type: "plain_text",
          text: "User Email",
        },
      },
    ];
  }

  const footerBlock = [
    {
      type: "input",
      optional: true,
      block_id: "description",
      element: {
        action_id: "description",
        type: "plain_text_input",
        multiline: true,
        placeholder: {
          type: "plain_text",
          text: "Provide any information you think may be usefull. ",
        },
      },
      label: {
        type: "plain_text",
        text: "Informations",
        emoji: true,
      },
    },
  ];

  const blocks = [...headBlock, ...coreBlock, ...footerBlock];

  return {
    private_metadata: state.metadata,
    type: "modal",
    // View identifier
    callback_id: "tech_request_view",
    title: {
      type: "plain_text",
      text: "Tech Team Request",
    },
    blocks: blocks,
    submit: {
      type: "plain_text",
      text: "Submit",
    },
  };
};

module.exports = setTechRequestFlow = (app, create_issue) => {
  app.command("/tech_request", async ({ ack, body, context }) => {
    // Acknowledge the command request
    await ack();

    const metadata = JSON.stringify({
      channel_id: body.channel_id,
    });

    try {
      const result = await app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: getView({ metadata: metadata }),
      });
    } catch (error) {
      console.error(error.data);
    }
  });

  app.command("/new_feature", async ({ ack, body, context }) => {
    // Acknowledge the command request
    await ack();

    const metadata = JSON.stringify({
      channel_id: body.channel_id,
    });

    try {
      const result = await app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: getView({ metadata: metadata }),
      });
    } catch (error) {
      console.error(error.data);
    }
  });

  app.shortcut("techRequest", async ({ shortcut, ack, context, client }) => {
    try {
      // Acknowledge shortcut request
      await ack();
      const metadata = JSON.stringify({
        channel_id: config.defaultChannelId,
      });

      // Call the views.open method using one of the built-in WebClients
      const result = await client.views.open({
        token: context.botToken,
        trigger_id: shortcut.trigger_id,
        view: getView({ metadata: metadata }),
        // The token you used to initialize your app is stored in the `context` object
      });
    } catch (error) {
      console.error(error);
    }
  });

  app.action("categoryRefName", async ({ ack, body, context }) => {
    // Acknowledge the button request
    await ack();
    const selectedCategory = body.actions[0].selected_option.value;
    const incomingMetadata = JSON.parse(body.view.private_metadata);
    const outgoingMetadata = JSON.stringify({
      ...incomingMetadata,
      category: selectedCategory,
    });

    try {
      const result = await app.client.views.update({
        token: context.botToken,
        // Pass the view_id
        view_id: body.view.id,
        // View payload with updated blocks
        view: getView({
          metadata: outgoingMetadata,
          selectedCategory: selectedCategory,
        }),
      });
    } catch (error) {
      console.error(error);
    }
  });

  app.view("tech_request_view", async ({ ack, body, view, context }) => {
    // Acknowledge the view_submission event
    await ack();

    const metadata = JSON.parse(view.private_metadata);

    const postOnChannel = async (args) =>
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: metadata.channel_id,
        ...args,
      });

    const values = view.state.values;
    const responses = cleanInput(values);
    const category = findCategorie(metadata.category);
    let state = {
      responses: responses,
      category: category,
    };

    await postOnChannel({
      text: Handlebars.compile(config.slackRequestAck)(state),
    });

    const githubIssueTemplate = category.template || config.defaultTemplate;

    const issue = await create_issue(
      responses.title,
      Handlebars.compile(githubIssueTemplate)(responses),
      [...category.labels]
    );

    console.log("@@@Issue", issue)

    postTask({
      issue_number: issue.issue_number,
      name: issue.title
    })

    state = {
      issue: issue,
      responses: responses,
      category: category,
    };

    const slackTemplateAnswer =
      category.answerTemplate || config.defaultSlackAnswer;

    // Message the user
    try {
      await await postOnChannel({
        text: Handlebars.compile(slackTemplateAnswer)(state),
      });
    } catch (error) {
      console.error(error);
    }
  });
};