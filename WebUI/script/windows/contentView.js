class ContentView {
	constructor() {
		this.dom = null;
		this.directory = null;

		signals.folderSelected.add(this.onFolderSelected.bind(this));
		this.Initialize();
	}


	Initialize() {
		this.dom = $(document.createElement("div"));

		this.directory = $(document.createElement("table"));

		this.dom.append(this.directory);
	}

	onFolderSelected(content) {
		this.directory.html("");
		this.directory.append(`
			<tr>
				<th></th>
				<th><b>Name</b></th>
				<th><b>Type</b></th>
			</tr>
		`);
		for(let i = 0; i < content.length; i++) {
			let blueprint = editor.blueprintManager.getBlueprintByGuid(content[i].id);
			console.log(blueprint);
			let entry = $(document.createElement("tr"));
			let icon = $(document.createElement("i"));
			let name = $(document.createElement("td"));
			let type = $(document.createElement("td"));
			entry.append(icon);
			entry.append(name);
			entry.append(type);
			icon.addClass("jstree-icon");
			icon.addClass(blueprint.typeName);
			name.html(content[i].text);
			type.html(blueprint.typeName);

			entry.on('click', function(e, data) {
				signals.spawnBlueprintRequested.dispatch(blueprint);
			});

			entry.on('contextmenu', function(e) {
				editor.favorites.push(blueprint);
				signals.favoritesChanged.dispatch();
			});
			this.directory.append(entry);
		}
	}
}
var ContentViewComponent = function( container, state ) {
	this._container = container;
	this._state = state;
	this.element = new ContentView();

	this._container.getElement().html(this.element.dom);
};