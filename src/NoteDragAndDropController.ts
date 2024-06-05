import { NoteExplorerProvider, NoteTreeItem } from './NoteExplorerProvider';
import { DataTransfer, DataTransferItem, TreeDragAndDropController } from 'vscode';

const NOTE_EXPLORER_MIME_TYPE = 'application/vnd.code.tree.noteExplorer';

export class NoteDragAndDropController implements TreeDragAndDropController<NoteTreeItem> {
    constructor(private readonly treeDataProvider: NoteExplorerProvider) {

    }

    public get dropMimeTypes(): string[] {
        return [NOTE_EXPLORER_MIME_TYPE];
    }

    public get dragMimeTypes(): string[] {
        return [NOTE_EXPLORER_MIME_TYPE];
    }

    handleDrag(source: NoteTreeItem[], dataTransfer: DataTransfer): void | Thenable<void> {
        dataTransfer.set(NOTE_EXPLORER_MIME_TYPE, new DataTransferItem(source));
    }

    handleDrop(target: NoteTreeItem | undefined, dataTransfer: DataTransfer): void | Thenable<void> {
        const transferredData = dataTransfer.get(NOTE_EXPLORER_MIME_TYPE);
        if (!transferredData) {
            return;
        }

        const draggedItems = transferredData.value as NoteTreeItem[];
        if (draggedItems.length > 0) {
            draggedItems.forEach(item => this.treeDataProvider.moveElement(item, target));
        }
    }
}