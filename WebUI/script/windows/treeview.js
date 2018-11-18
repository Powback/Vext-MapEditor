class TreeView {
	constructor() {
		this.data = null;
		this.dom = $(document.createElement("div"));
		this.topControls = this.CreateControls();
		this.tree = null;
        signals.blueprintsRegistered.add(this.LoadData.bind(this))
    }

	LoadData(table) {
		let scope = this;

		let data = {
			"type": "folder",
			"text": "Venice",
			"state": {
				"opened": true,
				"selected": true,
			},
			"children": [],
			"content": []
		};
		//TODO: Make sure this works after the new blueprint shit.
		for (let key in table) {
            let instance = table[key];
            let path = instance.name;
            let paths = getPaths(path);
            let parentPath = data;
            let fileName = getFilename(path);
			paths.forEach(function(subPath) {
                let parentIndex = parentPath.children.find(x => x.text.toLowerCase() === subPath.toLowerCase());
				if (parentIndex === undefined) {
                    let a = parentPath.children.push({
						"type": "folder",
						"text": subPath,
						"children": [],
	                    "content": []
					});
					parentPath = parentPath.children[a - 1];
				} else {
					parentPath = parentIndex;
					// Sometimes the object is referenced lowercase. If we have a string that has uppercase letters, we can assume it's correct.
					// Replace lowercase paths with the actual case.
					if (hasUpperCase(subPath) && hasLowerCase(parentPath.text)) {
						parentPath.text = subPath;
					}
				}
			});
			parentPath.content.push({
				"type": "file",
				"text": fileName,
				"id": key
			})
		}
        scope.data = data;
        scope.InitializeTree();
        scope.RegisterEvents();
        signals.folderSelected.dispatch(data.content);
	}

	InitializeTree() {
		let scope = this;
        scope.tree = $(scope.dom).jstree({
	        types: {
		        folder: {
			        icon: 'jstree-folder'
		        },
		        file: {
			        icon: 'jstree-file'
		        }
	        },
	        plugins: ["types", "sort", "json_data", "search"],
	        search: {
		        case_insensitive: true,
		        show_only_matches: true
	        },
	        sort: function(a, b) {
		        let a1 = this.get_node(a);
		        let b1 = this.get_node(b);
		        if (a1.icon == b1.icon) {
			        return (a1.text.toLowerCase() > b1.text.toLowerCase()) ? 1 : -1;
		        } else {
			        return (a1.icon < b1.icon) ? 1 : -1;
		        }
	        },
	        core: {
		        data: [this.data],
		        themes: {
			        dots: false,
			        icons: true
		        },
			}
		});
	}
	RegisterEvents() {
		let scope = this;
        scope.topControls.find(".search-input").keyup(function() {
			let searchString = $(this).val();
			delay(function() {
				console.log(searchString);
				scope.tree.jstree('search', searchString);
			}, 500);

		});

		$(scope.dom).on('changed.jstree', function(e, data) {
			if (data.node == null) {
				return
			}
			console.log(data.node);
			let folderContent = data.node.original.content;
			console.log(folderContent);
			signals.folderSelected.dispatch(folderContent);
			/*let id = data.node.original.id;
			if (id != null) {
				let blueprint = editor.blueprintManager.getBlueprintByGuid(id);
				signals.spawnBlueprintRequested.dispatch(blueprint);
			}
			*/
		})
	}
	CreateControls() {
		let controls = $(document.createElement("div"));
		controls.addClass("contentControls");

		let search = $(document.createElement("input"));
		search.addClass("search-input form-control");
		search.attr("placeholder", "Search");
		controls.append(search);

		return controls;
	}
}

var TreeViewComponent = function( container, state ) {
	this._container = container;
	this._state = state;
	this.element = new TreeView();

	this._container.getElement().append(this.element.topControls);
	this._container.getElement().append(this.element.dom);

};