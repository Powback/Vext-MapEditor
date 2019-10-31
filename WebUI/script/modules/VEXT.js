class VEXTInterface {
	constructor() {
		this.emulator = new VEXTemulator();
		this.commandQueue = [];
		this.commands = {
			"SpawnedBlueprint":	 signals.spawnedBlueprint.dispatch,
			"BlueprintSpawnInvoked": signals.blueprintSpawnInvoked.dispatch,
			"DeletedBlueprint":   signals.deletedBlueprint.dispatch,
			'SetObjectName':		signals.setObjectName.dispatch,
			'SetTransform':		 signals.setTransform.dispatch,
			'SetVariation':		 signals.setVariation.dispatch,
			'EnabledBlueprint':		 signals.enabledBlueprint.dispatch,
			'DisabledBlueprint':		 signals.disabledBlueprint.dispatch,
		}

		this.messages = {
			'SetCameraTransformMessage':			signals.setCameraTransform.dispatch,
			'SetRaycastTransformMessage':			signals.setRaycastPosition.dispatch,
			'SetPlayerNameMessage':	   			signals.setPlayerName.dispatch,
			'SetScreenToWorldPositionMessage':		signals.setScreenToWorldPosition.dispatch,
			'SetUpdateRateMessage':					signals.setUpdateRateMessage.dispatch
			// 'SelectedGameObject':	   signals.selectedGameObject.dispatch,
			// 'DeselectedGameObject':	signals.deselectedGameObject.dispatch,
		}

		this.paused = false;
		this.executing = false;

		this.queued = {
			commands: [],
			messages: []
		};
	}
	/*

		Internal

	 */
	Pause() {
		this.paused = true;
	}
	Resume() {
		this.paused = false;
		if(this.queued.commands.length > 0) {
			this.SendCommands(this.queued.commands);
			this.queued.commands = [];
		}
		if(this.queued.messages.length > 0) {
			this.SendMessage(this.queued.messages);
			this.queued.messages = [];
		}
	}
	/*

		In

	 */
	HideGizmo() {
		editor.threeManager.HideGizmo();
	}
	ShowGizmo() {
		editor.threeManager.ShowGizmo();
	}
	/*

		out

	 */

	SendCommand(command) {
		command.sender = editor.playerName;

		if(this.paused) {
			this.queued.commands.push(command)
		} else {
			//Sending this individual command as an array of commands
			this.SendCommands([command]);
		}
	}

	SendCommands(commands) {
		if(commands.length === 0) {
			return;
		}

		let scope = this;
		if(editor.debug) {
			Log(LOGLEVEL.VERBOSE, "OUT: ");
			Log(LOGLEVEL.VERBOSE, commands);
			scope.emulator.Receive(commands);
		} else {
			console.log(commands);
			Log(LOGLEVEL.VERBOSE, "OUT: ");
			Log(LOGLEVEL.VERBOSE, commands);
			WebUI.Call('DispatchEventLocal', 'MapEditor:SendToServer', JSON.stringify(commands));
		}
	}

	HandleResponse(commandActionResultsString, emulator) {
		console.log(commandActionResultsString);
		let t0 = performance.now();

		let scope = this;
		scope.executing = true;
		let commandActionResultsJson = JSON.parse(commandActionResultsString);
		let index = 0;

		Log(LOGLEVEL.VERBOSE, "IN: ");
		Log(LOGLEVEL.VERBOSE, commandActionResultsJson);

		//convert commandActionResults to an array if it's an object
		if (typeof commandActionResultsJson === 'object'){
			commandActionResultsJson = Object.values(commandActionResultsJson)
		}

		commandActionResultsJson.forEach(function (commandActionResultJson) {
			if(scope.commands[commandActionResultJson.type] === undefined) {
				LogError("Failed to call a null signal: " + commandActionResultJson.type);
				return;
			}
			if(index === commandActionResultsJson.length - 1) {
				scope.executing = false;
			}

			let commandActionResult = new CommandActionResult().setFromTable(commandActionResultJson);

			scope.commands[commandActionResultJson.type](commandActionResult);
			index++;

		});
		console.log("Done executing");
		let t1 = performance.now();
		console.log("Execution took " + (t1 - t0) + " milliseconds.");
		editor.threeManager.Render();
	}

	SendEvent(eventName, param){
		if(editor.debug) {
			console.log(eventName);
			if (param != null){
				console.log(param);
			}
		} else {
			console.log('MapEditor:' + eventName);
			WebUI.Call('DispatchEventLocal', 'MapEditor:' + eventName, JSON.stringify(param));
		}
	}

	SendMessage(message) {
		if(message == null){
			console.log("NIL?!")
		}
		let scope = this;
		// If we're not sending an array of commands, make us send an array of commands.

		message.sender = editor.playerName;

		if(this.paused) {
			this.queued.messages.push(message)
		} else {
			//Sending this individual command as an array of commands
			this.SendMessages([message]);
		}
	}

	SendMessages(messages) {
		if(messages.length === 0) {
			return;
		}
		let scope = this;
		if(editor.debug) {
			Log(LOGLEVEL.VERBOSE, "OUT: ");
			Log(LOGLEVEL.VERBOSE, messages);
			// We don't handle messages in VEXTEmulator yet
			//scope.emulator.Receive(commands);
		} else {
			console.log(messages);
			Log(LOGLEVEL.VERBOSE, "OUT: ");
			Log(LOGLEVEL.VERBOSE, messages);
			WebUI.Call('DispatchEventLocal', 'MapEditor:ReceiveMessage', JSON.stringify(messages));
		}
	}


	HandleMessage(messageRaw) {
		let message;
		let emulator = false;
		if (typeof(messageRaw) === "object") {
			message = messageRaw;
			emulator = true;
		} else {
			Log(LOGLEVEL.VERBOSE, messageRaw);
			message = JSON.parse(messageRaw);
		}

		Log(LOGLEVEL.VERBOSE, "IN: ");
		Log(LOGLEVEL.VERBOSE, message);

		if(this.messages[message.type] === undefined) {
			LogError("Failed to call a null signal: " + message.type);
			return;
		}
		if(emulator) {
			let scope = this;
			// delay to simulate tick increase.
			setTimeout(async function() {
				scope.messages[message.type](message)
			}, 1);
		} else {
			this.commands[message.type](message);
		}
		editor.threeManager.Render();
	}
}

