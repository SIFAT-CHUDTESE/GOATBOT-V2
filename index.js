const { spawn } = require("child_process");
const log = require("./core/logger/log.js");

function startProject() {
	const child = spawn("node", ["Goat.js"], {
		cwd: __dirname,
		stdio: "inherit",
		shell: true
	});

	child.on("close", (code) => {
		log.info("Project stopped with code:", code);
		log.info("Project", "Restarting...");
		setTimeout(() => startProject(), 3000);
	});
}

startProject();
