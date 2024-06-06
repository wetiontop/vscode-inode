'use strict';

import { readdirSync, statSync, existsSync, rename, mkdirSync } from 'fs';
import path, { join } from 'path';
import { Event, EventEmitter, TreeItem, FileType, TreeItemCollapsibleState, Uri, TreeDataProvider, workspace, commands } from 'vscode';
import { getRootPath, isInExclusionList } from './util';
import { log } from 'console';

export class NoteTreeItem extends TreeItem {
    relative: string = '';
    type: FileType = FileType.Unknown;
}

export class NoteExplorerProvider implements TreeDataProvider<NoteTreeItem> {

    private _onDidChangeTreeData: EventEmitter<NoteTreeItem | undefined | void> = new EventEmitter<NoteTreeItem | undefined | void>();
    readonly onDidChangeTreeData: Event<NoteTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor() {
        this.checkRootPath();
    }

    /**
     * Refresh tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
        this.checkRootPath();
    }

    /**
     * Retrieve tree item
     * @param {NoteTreeItem | undefined | void} element
     */
    getTreeItem(element: NoteTreeItem): NoteTreeItem {
        return element;
    }

    /**
     * Retrieve child entries
     * @param {NoteTreeItem | undefined | void} element
     */
    getChildren(element: NoteTreeItem): Promise<NoteTreeItem[]> {

        const workspaceRoot = getRootPath();
        if (!workspaceRoot) {
            return Promise.resolve([]);
        }

        let folder = join(workspaceRoot);
        if (element) {
            folder = join(workspaceRoot, element.relative);
        }

        let treeItems = this.readDirectory(workspaceRoot, folder);
        if (workspaceRoot === folder) {
            // 按需显示Create First Note
            this.checkTreeItems(treeItems.length);
        }
        return Promise.resolve(treeItems);
    }

    /**
     * Read directory and retrieve children elements
     * @param {string} root
     * @param {string} folder
     */
    readDirectory(root: string, folder: string): NoteTreeItem[] {
        if (!existsSync(folder)) {
            return [];
        }

        const children: NoteTreeItem[] = [];
        readdirSync(folder, 'utf-8').forEach(function (filename: string | Buffer) {
            const file = join(folder, filename.toString());
            const relative = file.replace(root, '');

            if (isInExclusionList(relative)) {
                return;
            }

            const stat = statSync(file);
            const isDir = stat.isDirectory();
            const type = isDir ? FileType.Directory : FileType.File;
            const collapsibleState = isDir ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None;
            const uri = Uri.file(file);
            const item = new NoteTreeItem(uri, collapsibleState);
            item.relative = relative;
            item.label = filename.toString();
            item.type = type;
            item.tooltip = String(item.label);
            if (isDir) {
                item.contextValue = 'folder';
            } else {
                item.contextValue = 'file';
                item.command = {
                    command: 'noteExplorer.openFile',
                    title: "Open File",
                    arguments: [uri]
                };
            }
            children.push(item);
        });

        children.sort(function (a, b) {
            if (a.type === b.type) {
                return a.relative.localeCompare(b.relative);
            }
            return a.type === FileType.Directory ? -1 : 1;
        });

        return children;
    }

    /**
     * 移动节点
     * @param item 
     * @param newParent 
     */
    moveElement(item: NoteTreeItem, newParent: NoteTreeItem | undefined) {
        if (item) {
            let fullPath = '';
            let newFullPath = '';
            const workspaceRoot = getRootPath();
            if (workspaceRoot) {
                fullPath = join(workspaceRoot, item.relative);
                newFullPath = workspaceRoot; // 默认新目录

                if (newParent) {
                    if (newParent.type === FileType.File) {
                        newFullPath = join(workspaceRoot, path.dirname(newParent.relative));
                    } else {
                        newFullPath = join(workspaceRoot, newParent.relative);
                    }
                }
                newFullPath = join(newFullPath, path.basename(item.relative));
            }

            rename(fullPath, newFullPath, (err) => log(err));
        }

        this.refresh();
    }

    /**
     * 检查日志根目录配置
     */
    private checkRootPath(): void {
        let rootPath = getRootPath();
        if (!rootPath) {
            // 不显示Create First Note
            this.checkTreeItems(1);
        }
        commands.executeCommand('setContext', 'rootPath', !rootPath);
    }

    /**
     * 检查是否有笔记
     * @param count 
     */
    private checkTreeItems(count: number): void {
        commands.executeCommand('setContext', 'treeItems', !count);
    }
}