

module.exports = {
	config: {
		name: "commandName",
		version: "1.0",
		author: "NTKhang",
		category: "events"
	},

	langs: {
		vi: {
			hello: "xin chào thành viên mới",
			helloWithName: "xin chào thành vien mới, id facebook của bạn là %1"
		},
		en: {
			hello: "hello new member",
			helloWithName: "hello new member, your facebook id is %1"
		}
	},


	onStart: async function ({ api, usersData, threadsData, message, event, userModel, threadModel, prefix, dashBoardModel, globalModel, dashBoardData, globalData, envCommands, envEvents, envGlobal, role, getLang , commandName }) {





		if (event.logMessageType == "log:subscribe") {



			message.send(getLang("hello"));



		}
	}
};
