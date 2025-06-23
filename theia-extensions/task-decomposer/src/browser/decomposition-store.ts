import { Emitter, Event } from '@theia/core/lib/common';
import { injectable } from '@theia/core/shared/inversify';
import { DecompositionNode } from './decomposition-model';

@injectable()
export class DecompositionStore {
    private root: DecompositionNode | undefined;
    private readonly changedEmitter = new Emitter<void>();

    get onDidChange(): Event<void> {
        return this.changedEmitter.event;
    }

    setDecomposition(root: DecompositionNode): void {
        this.root = root;
        this.changedEmitter.fire(undefined);
    }

    getRoot(): DecompositionNode | undefined {
        return this.root;
    }
} 