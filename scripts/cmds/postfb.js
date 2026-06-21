const fs = require("fs-extra");
const axios = require("axios");

module.exports = {
  config: {
    name: "postfb",
    version: "1.2",
    author: "乛 Xꫀᥒos ゎ",
    countDown: 5,
    role: 2,
    shortDescription: {
      en: "Create a new post on Facebook."
    },
    longDescription: {
      en: "Create a new post on Facebook with text, images, and video."
    },
    category: "Social",
    guide: {
      en: "{pn}: post"
    }
  },

  onStart: async function ({ event, api, commandName }) {
    const { threadID, messageID, senderID } = event;
    const uuid = getGUID();
    const formData = {
      "input": {
        "composer_entry_point": "inline_composer",
        "composer_source_surface": "timeline",
        "idempotence_token": uuid + "_FEED",
        "source": "WWW",
        "attachments": [],
        "audience": {
          "privacy": {
            "allow": [],
            "base_state": "FRIENDS",
            "deny": [],
            "tag_expansion_state": "UNSPECIFIED"
          }
        },
        "message": {
          "ranges": [],
          "text": ""
        },
        "with_tags_ids": [],
        "inline_activities": [],
        "explicit_place_id": "0",
        "text_format_preset_id": "0",
        "logging": {
          "composer_session_id": uuid
        },
        "tracking": [null],
        "actor_id": api.getCurrentUserID(),
        "client_mutation_id": Math.floor(Math.random() * 17)
      },
      "displayCommentsFeedbackContext": null,
      "displayCommentsContextEnableComment": null,
      "displayCommentsContextIsAdPreview": null,
      "displayCommentsContextIsAggregatedShare": null,
      "displayCommentsContextIsStorySet": null,
      "feedLocation": "TIMELINE",
      "feedbackSource": 0,
      "focusCommentID": null,
      "gridMediaWidth": 230,
      "groupID": null,
      "scale": 3,
      "privacySelectorRenderLocation": "COMET_STREAM",
      "renderLocation": "timeline",
      "useDefaultActor": false,
      "inviteShortLinkKey": null,
      "isFeed": false,
      "isFundraiser": false,
      "isFunFactPost": false,
      "isGroup": false,
      "isTimeline": true,
      "isSocialLearning": false,
      "isPageNewsFeed": false,
      "isProfileReviews": false,
      "isWorkSharedDraft": false,
      "UFI2CommentsProvider_commentsKey": "ProfileCometTimelineRoute",
      "hashtag": null,
      "canUserManageOffers": false
    };


    const audienceMsg =
      `╭───[ 𝐏𝐑𝐈𝐕𝐀𝐂𝐘 ]───╮\n` +
      `│\n` +
      `│ 𝟏. 🌎 𝐄𝐯𝐞𝐫𝐲𝐨𝐧𝐞\n` +
      `│ 𝟐. 👥 𝐅𝐫𝐢𝐞𝐧𝐝𝐬\n` +
      `│ 𝟑. 🔒 𝐎𝐧𝐥𝐲 𝐌𝐞\n` +
      `│\n` +
      `╰────────────────╯\n` +
      `➤ Reply with 1, 2 or 3`;

    return api.sendMessage(audienceMsg, threadID, (e, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName,
        messageID: info.messageID,
        author: senderID,
        formData,
        type: "whoSee"
      });
    }, messageID);
  },

  onReply: async function ({ Reply, event, api, commandName }) {
    const handleReply = Reply;
    const { type, author, formData } = handleReply;
    if (event.senderID != author) return;

    const { threadID, messageID, attachments, body } = event;
    const botID = api.getCurrentUserID();

    async function uploadAttachments(attachments) {
      let uploads = [];
      for (const attachment of attachments) {
        const form = { file: attachment };
        uploads.push(api.httpPostFormData(`https://www.facebook.com/profile/picture/upload/?profile_id=${botID}&photo_source=57&av=${botID}`, form));
      }
      uploads = await Promise.all(uploads);
      return uploads;
    }

    if (type == "whoSee") {
      if (!["1", "2", "3"].includes(body)) return api.sendMessage('⚠️ Invalid selection.', threadID, messageID);
      formData.input.audience.privacy.base_state = body == 1 ? "EVERYONE" : body == 2 ? "FRIENDS" : "SELF";

      api.unsendMessage(handleReply.messageID, () => {

        const contentMsg =
          `╭───[ 𝐂𝐎𝐍𝐓𝐄𝐍𝐓 ]───╮\n` +
          `│\n` +
          `│ 📝 𝐄𝐧𝐭𝐞𝐫 𝐂𝐚𝐩𝐭𝐢𝐨𝐧\n` +
          `│\n` +
          `│ ➤ Type text\n` +
          `│ ➤ '0' to skip\n` +
          `╰────────────────╯`;

        api.sendMessage(contentMsg, threadID, (e, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author: author,
            formData,
            type: "content"
          });
        }, messageID);
      });

    } else if (type == "content") {
      if (event.body != "0") formData.input.message.text = event.body;

      api.unsendMessage(handleReply.messageID, () => {

        const mediaMsg =
          `╭────[ 𝐌𝐄𝐃𝐈𝐀 ]────╮\n` +
          `│\n` +
          `│ 📸 𝐀𝐭𝐭𝐚𝐜𝐡 𝐅𝐢𝐥𝐞\n` +
          `│\n` +
          `│ ➤ Send Photo/Video\n` +
          `│ ➤ '0' to skip\n` +
          `╰────────────────╯`;

        api.sendMessage(mediaMsg, threadID, (e, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author: author,
            formData,
            type: "media"
          });
        }, messageID);
      });

    } else if (type == "media") {
      if (event.body != "0") {
        const allStreamFile = [];
        for (const attach of attachments) {
          if (attach.type === "photo") {
            const getFile = (await axios.get(attach.url, { responseType: "arraybuffer" })).data;
            fs.writeFileSync(__dirname + `/cache/imagePost.png`, Buffer.from(getFile));
            allStreamFile.push(fs.createReadStream(__dirname + `/cache/imagePost.png`));
          } else if (attach.type === "video") {
            const videoFile = await axios.get(attach.url, { responseType: "stream" });
            const videoPath = __dirname + `/cache/videoPost.mp4`;
            videoFile.data.pipe(fs.createWriteStream(videoPath));
            allStreamFile.push(fs.createReadStream(videoPath));
          }
        }


        api.sendMessage("⏳ 𝐔𝐩𝐥𝐨𝐚𝐝𝐢𝐧𝐠...", threadID);

        const uploadFiles = await uploadAttachments(allStreamFile);
        for (let result of uploadFiles) {
          if (typeof result == "string") result = JSON.parse(result.replace("for (;;);", ""));
          if (result.payload && result.payload.fbid) {
            formData.input.attachments.push({
              "photo": { "id": result.payload.fbid.toString() }
            });
          }
        }
      }

      const form = {
        av: botID,
        fb_api_req_friendly_name: "ComposerStoryCreateMutation",
        fb_api_caller_class: "RelayModern",
        doc_id: "7711610262190099",
        variables: JSON.stringify(formData)
      };

      api.httpPost('https://www.facebook.com/api/graphql/', form, (e, info) => {
        api.unsendMessage(handleReply.messageID);
        try {
          if (e) throw e;
          if (typeof info == "string") info = JSON.parse(info.replace("for (;;);", ""));

          const postID = info.data?.story_create?.story?.legacy_story_hideable_id;
          const urlPost = info.data?.story_create?.story?.url;

          if (!postID) throw info.errors;

          try {
            fs.unlinkSync(__dirname + "/cache/imagePost.png");
            fs.unlinkSync(__dirname + "/cache/videoPost.mp4");
          } catch (e) {}


          const successMsg =
            `╭───[ 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 ]───╮\n` +
            `│\n` +
            `│ ✅ 𝐏𝐨𝐬𝐭 𝐂𝐫𝐞𝐚𝐭𝐞𝐝\n` +
            `│ 🆔 ${postID}\n` +
            `│\n` +
            `╰────────────────╯\n` +
            `🔗 𝐋𝐢𝐧𝐤: ${urlPost}`;

          return api.sendMessage(successMsg, threadID, messageID);
        } catch (e) {
          return api.sendMessage(`❌ Failed to create post.`, threadID, messageID);
        }
      });
    }
  }
};

function getGUID() {
  var sectionLength = Date.now();
  var id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.floor((sectionLength + Math.random() * 16) % 16);
    sectionLength = Math.floor(sectionLength / 16);
    var _guid = (c == "x" ? r : (r & 7) | 8).toString(16);
    return _guid;
  });
  return id;
}
