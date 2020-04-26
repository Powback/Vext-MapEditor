<template>
	<gl-col>
		<gl-component id="explorer-component" :title="title">
			<div class="header">
				<Search v-model="search"/>
			</div>
			<infinite-tree-component class="scrollable datafont" ref="infiniteTreeComponent" :search="search" :autoOpen="true" :data="data" :selectable="true" :should-select-node="shouldSelectNode" :on-select-node="onSelectNode">
				<expandable-tree-slot slot-scope="{ node, index, tree, active }" :node="node" :tree="tree" :search="search" :nodeText="node.name + ' (' + node.children.length + ')'"
									:selected="node.state.selected"/>
			</infinite-tree-component>
		</gl-component>
		<ListComponent class="datafont" title="Explorer data" :list="list" :keyField="'instanceGuid'" :headers="['Name', 'Type']" :click="SpawnBlueprint">
			<template slot-scope="{ item, data }">
				<div class="slot-scope">
					<Highlighter class="td" :text="cleanPath(item.name)" :search="search"/><div class="td">{{item.typeName}}</div>
				</div>
			</template>
		</ListComponent>
	</gl-col>
</template>

<script lang="ts">
import { Component, Prop, Ref } from 'vue-property-decorator';
import EditorComponent from '@/script/components/EditorComponents/EditorComponent.vue';
import InfiniteTreeComponent from '@/script/components/InfiniteTreeComponent.vue';
import { signals } from '@/script/modules/Signals';
import { Blueprint } from '@/script/types/Blueprint';
import { getFilename, getPaths, hasLowerCase, hasUpperCase } from '@/script/modules/Utils';
import Highlighter from '../widgets/Highlighter.vue';
import ListComponent from '@/script/components/EditorComponents/ListComponent.vue';
import InfiniteTree, { Node, INode } from 'infinite-tree';
import { CommandActionResult } from '@/script/types/CommandActionResult';
import { GameObject } from '@/script/types/GameObject';
import { Guid } from '@/script/types/Guid';
import Search from '@/script/components/widgets/Search.vue';
import ExpandableTreeSlot from '@/script/components/EditorComponents/ExpandableTreeSlot.vue';

@Component({ components: { InfiniteTreeComponent, ListComponent, Highlighter, Search, ExpandableTreeSlot } })

export default class HierarchyComponent extends EditorComponent {
	private data: INode = {
		'type': 'folder',
		'name': 'root',
		'id': 'root',
		'children': []
	};

	private tree: InfiniteTree;
	private list: Blueprint[] = [];
	private selected: Node | null;

	private search: string = '';

	private entries = new Map<Guid, INode>();
	private queue = new Map<string, INode>();
	private existingParents = new Map<string, INode[]>();

	@Ref('infiniteTreeComponent')
	infiniteTreeComponent!: any;

	constructor() {
		super();
	}

	public mounted() {
		console.log('Mounted');
		signals.spawnedBlueprint.connect(this.onSpawnedBlueprint.bind(this));
		signals.deletedBlueprint.connect(this.onDeletedBlueprint.bind(this));
		signals.selectedGameObject.connect(this.onSelectedGameObject.bind(this));
		this.tree = (this.infiniteTreeComponent as any).tree as InfiniteTree;
	}

	private createNode(gameObject: GameObject): INode {
		return {
			id: gameObject.guid.toString(),
			name: gameObject.getCleanName(),
			type: gameObject.typeName,
			children: [],
			data: {
				parentGuid: gameObject.parentData.guid
			}
		};
	}

	onDeletedBlueprint(commandActionResult: CommandActionResult) {
		const node = this.tree.getNodeById(commandActionResult.gameObjectTransferData.guid.toString());
		this.tree.removeNode(node, {});
	}

	onSpawnedBlueprint(commandActionResult: CommandActionResult) {
		console.log('Spawning:' + commandActionResult.gameObjectTransferData.guid.value);
		const gameObjectGuid = commandActionResult.gameObjectTransferData.guid;
		const gameObject = (window as any).editor.getGameObjectByGuid(gameObjectGuid);

		const currentEntry = this.createNode(gameObject);
		this.entries.set(gameObjectGuid, currentEntry);
		this.queue.set(currentEntry.id, currentEntry);

		if (!(window as any).editor.vext.executing) {
			const updatedNodes = {};

			for (const entry of this.queue.values()) {
				// Check if the parent is in the queue
				const parentId = entry.data.parentGuid.toString();
				if (this.queue.has(parentId)) {
					this.queue.get(parentId)!.children!.push(entry);
					// Check if the parent node is already spawned
				} else if (this.tree.getNodeById(parentId) !== null) {
					if (!this.existingParents.has(parentId)) {
						this.existingParents.set(parentId, []);
					}
					console.log('Existing' + entry.name);
					this.existingParents.get(parentId)!.push(entry);
				} else {
					// Entry does not have a parent.
					if (!this.existingParents.has('root')) {
						this.existingParents.set('root', []);
					}
					console.log('Root');
					this.existingParents.get('root')!.push(entry);
				}
			}
			for (const parentNodeId of this.existingParents.keys()) {
				const parentNode = this.tree.getNodeById(parentNodeId);
				if (parentNode === null) {
					console.error('Missing parent node');
				} else {
					this.tree.addChildNodes(this.existingParents.get(parentNodeId) as INode[], undefined, parentNode);
				}
				this.existingParents.delete(parentNodeId);
			}
			this.queue.clear();
		}
	}

	onSelectedGameObject(guid: Guid, isMultipleSelection?: boolean, scrollTo?: boolean) {
		const currentNode = this.tree.getNodeById(guid.toString());

		currentNode.state.selected = true;
		if (guid.equals(Guid.createEmpty())) {
			this.list = [];
			this.selected = null;
			return;
		}
		if (this.selected) {
			this.selected.state.selected = false;
		}
		this.selected = currentNode;
		this.selected.state.selected = true;
		this.$set(currentNode.state, 'enabled', true);
		this.infiniteTreeComponent.scrollTo(currentNode);
	}

	private onSelectNode(node: Node) {
		console.log('onSelect');
	}

	private cleanPath(path: string) {
		if (!this.selected) {
			return path;
		}
		return path.replace(this.selected.path, '');
	}

	private shouldSelectNode(node: Node) {
		// TODO Fool: check if ctrl key is pressed for multi-selection
		return window.editor.Select(Guid.parse(node.id), false);
	}

	private SpawnBlueprint(blueprint: Blueprint) {
		if (!blueprint) {
			return;
		}
		window.editor.SpawnBlueprint(blueprint);
	}
}
</script>
<style lang="scss" scoped>
	.expand {
		display: inline;
	}
</style>