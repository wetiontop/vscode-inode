
import path from 'path';
import { window, ExtensionContext, commands, workspace, FileType, Uri } from 'vscode';
import { getAbsolutePath, getRootPath } from './util';
import { NoteExplorerCommands } from './NoteExplorerCommands';
import { NoteExplorerProvider } from './NoteExplorerProvider';
import { NoteDragAndDropController } from './NoteDragAndDropController';

export function activate(context: ExtensionContext) {

	const provider = new NoteExplorerProvider();
	const cmd = new NoteExplorerCommands();

	window.registerTreeDataProvider(
		'noteExplorer', provider
	);

	// SNIPPETS API
	commands.registerCommand(
		'noteExplorer.refreshExplorer', function () {
			provider.refresh();
		});

	commands.registerCommand(
		'noteExplorer.openFile', function (resource) {
			cmd.openFile(resource);
		});

	commands.registerCommand(
		'noteExplorer.addFile', async function (node) {
			let path = "";
			if (node) {
				path = getAbsolutePath(node.relative);
			} else if (treeNodeSelectFirstPath && treeNodeExpandMap.get(treeNodeSelectFirstPath)) {
				path = getAbsolutePath(treeNodeSelectFirstPath);
			}
			if (await cmd.addFile(path)) {
				provider.refresh();
			}
		});

	commands.registerCommand(
		'noteExplorer.addFolder', async function (node) {
			let path = "";
			if (node) {
				path = getAbsolutePath(node.relative);
			} else if (treeNodeSelectFirstPath && treeNodeExpandMap.get(treeNodeSelectFirstPath)) {
				path = getAbsolutePath(treeNodeSelectFirstPath);;
			}
			if (await cmd.addFolder(path)) {
				provider.refresh();
			}
		});

	commands.registerCommand(
		'noteExplorer.renameFile', async function (node) {
			const path = (node) ? getAbsolutePath(node.relative) : "";
			if (await cmd.renameFile(path)) {
				provider.refresh();
			}
		});

	commands.registerCommand(
		'noteExplorer.renameFolder', async function (node) {
			const path = (node) ? getAbsolutePath(node.relative) : "";
			if (await cmd.renameFolder(path)) {
				provider.refresh();
			}
		});

	commands.registerCommand(
		'noteExplorer.deleteFile', async function (node) {
			const path = (node) ? getAbsolutePath(node.relative) : "";
			if (await cmd.deleteFile(path)) {
				provider.refresh();
			}
		});

	commands.registerCommand(
		'noteExplorer.deleteFolder', async function (node) {
			const path = (node) ? getAbsolutePath(node.relative) : "";
			if (await cmd.deleteFolder(path)) {
				provider.refresh();
			}
		});

	// CONFIGURATION
	commands.registerCommand(
		'noteExplorer.settings', function () {
			commands.executeCommand(
				'workbench.action.openSettings', 'inote'
			);
		});

	// 节点选择的第一个路径
	let treeNodeSelectFirstPath: string = '';
	// 节点展开的
	const treeNodeExpandMap: Map<string, boolean> = new Map();
	const dragAndDropController = new NoteDragAndDropController(provider);
	const treeView = window.createTreeView('noteExplorer', { treeDataProvider: provider, dragAndDropController, canSelectMany: true });
	// 监听 TreeView 节点选中状态
	treeView.onDidChangeSelection((event) => {
		const selected = event.selection[0];
		if (selected) {
			if (selected.type === FileType.File) {
				let dirname = path.dirname(selected.relative);
				treeNodeSelectFirstPath = dirname !== '\\' ? dirname : '';
			} else {
				treeNodeSelectFirstPath = selected.relative;
			}
		} else {
			treeNodeSelectFirstPath = '';
		}
	});

	// 监听 TreeView 节点展开状态
	treeView.onDidExpandElement((event) => {
		const expanded = event.element;
		treeNodeExpandMap.set(expanded.relative, true);
		if (treeNodeSelectFirstPath !== expanded.relative) {
			treeNodeSelectFirstPath = expanded.relative;
		}
	});

	// 监听 TreeView 节点折叠状态
	treeView.onDidCollapseElement((event) => {
		const collapsed = event.element;
		// 重置数据
		treeNodeExpandMap.delete(collapsed.relative);
		if (treeNodeSelectFirstPath === collapsed.relative) {
			treeNodeSelectFirstPath = '';
		}
	});

	context.subscriptions.push(
		workspace.onDidChangeConfiguration(function (e) {
			if (e.affectsConfiguration('inote')) {
				provider.refresh();
			}
			if (e.affectsConfiguration('files.exclude')) {
				provider.refresh();
			}
		}),
		treeView,
	);

	// STARTUP
	const workspaceRoot = getRootPath();
	if (!workspaceRoot) {
		window.showInformationMessage(
			'Note folder location has not been configured yet. Please configure the notes folder path.',
			"Open Settings"
		).then(function () {
			commands.executeCommand('noteExplorer.settings');
		});
	}

}

// This method is called when your extension is deactivated
export function deactivate() { }
