'use strict';

import { readdirSync, statSync, existsSync, rename } from 'fs';
import path, { join } from 'path';
import { Event, EventEmitter, TreeItem, FileType, TreeItemCollapsibleState, Uri, TreeDataProvider, workspace } from 'vscode';
import { getRootPath, isInExclusionList } from './util';
import { log } from 'console';

export class NoteTreeItem extends TreeItem {
    relative: string = '';
    type: FileType = FileType.Unknown;
}

export class NoteExplorerProvider implements TreeDataProvider<NoteTreeItem> {

    private _onDidChangeTreeData: EventEmitter<NoteTreeItem | undefined | void> = new EventEmitter<NoteTreeItem | undefined | void>();
    readonly onDidChangeTreeData: Event<NoteTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    /**
     * Refresh tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
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

        return Promise.resolve(this.readDirectory(
            workspaceRoot,
            folder
        ));
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

    // 应用图标主题的函数
    applyIconTheme() {
        const iconTheme = workspace.getConfiguration('workbench').get('iconTheme');
        if (iconTheme === 'my-custom-icon-theme') {
            // 这里添加应用自定义图标主题的代码
            // 例如，可以是设置一个全局变量或者发送通知等
            console.log('Custom icon theme applied.');
        } else {
            // 取消应用自定义图标主题
            console.log('Custom icon theme not applied.');
        }
    }
}