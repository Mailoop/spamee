const viewid = "tech_request_view";

const inputValue = (input) => {
  switch (input.type) {
    case "plain_text_input":
      return input.value;
    case "radio_buttons":
      return input.selected_option.value;
  }
};

const config = {
  ackMessage: "Tech request received, working on it 🤙",
  thanksMessage: `Nb: 🗒️ Screenshot are helpfull 😉 (Here or on Github)
Thanks for calling ✋`,
  commonLabels: ["1: Definition Qualification"],
  categories: {
    feature: {
      ackPrefix: "💡Feature Request Created",
      labels: ["Cat: Feature"],
      selectText: "💡 Feature or new product to create",
      assignees: [],
    },
    bug: {
      ackPrefix: "🐛Bug Request Created",
      labels: ["Cat: Bug"],
      selectText: "🐛 Bug (something do not work anymore)",
      assignees: [],
    },
    data: {
      ackPrefix: "📊 Data Request",
      labels: ["Cat: Data Request"],
      selectText:
        "📊 Data Information for customer success (Feedback stats, ect...)",
      assignees: [],
    },
    typo: {
      ackPrefix: "🎨 Typo / UI improvement request created",
      labels: ["Cat: Typo/UI"],
      selectText: "🎨 Typo/UI improvement",
      assignees: [],
    },
    other: {
      ackPrefix: "❓ Request created",
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
      elements: [{
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
      }],
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

  let coreBlock = []

  if (state.selectedCategory == "bug") {
    coreBlock = [{
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
      }]
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

  const blocks = [...headBlock, ...coreBlock, ...footerBlock]

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
    })

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

  app.action('categoryRefName', async ({ ack, body, context }) => {
    // Acknowledge the button request
    await ack();
    console.log(body.view.private_metadata)
    const selectedCategory = body.actions[0].selected_option.value

    const incomingMetadata = JSON.parse(body.view.private_metadata)

    const outgoingMetadata = JSON.stringify({
      ...incomingMetadata,
      category: selectedCategory,
    })

    try {
      const result = await app.client.views.update({
        token: context.botToken,
        // Pass the view_id
        view_id: body.view.id,
        // View payload with updated blocks
        view: getView({ metadata: outgoingMetadata, selectedCategory: selectedCategory })})
    }
    catch (error) {
      console.error(error);
    }
  });

  app.view("tech_request_view", async ({ ack, body, view, context }) => {
    // Acknowledge the view_submission event
    await ack();

    const metadata = JSON.parse(view.private_metadata)

    const postOnChannel = async (args) =>
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: metadata.channel_id,
        ...args,
      });

    await postOnChannel({
      text: config.ackMessage,
    });

    const values = view.state.values;
    const responses = cleanInput(values);
    console.log(metadata)
    const categoryRefName = responses.categoryRefName;
    const category = findCategorie(metadata.category);

    const bodyCore = `
      Client: ${responses.client}
      User: ${responses.user_email}
${responses.description || ""}
    `;

    const labels = [...config.commonLabels, ...category.labels];

    const issue = await create_issue(responses.title, bodyCore, labels);

    // Message the user
    try {
      await await postOnChannel({
        text: `${category.ackPrefix} <${issue.data.html_url} | ${responses.title}>

${config.thanksMessage}
        `,
      });
    } catch (error) {
      console.error(error);
    }
  });
};
