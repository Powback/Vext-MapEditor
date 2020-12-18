import { GameObjectTransferData } from '@/script/types/GameObjectTransferData';
import { VextCommand } from '@/script/types/VextCommand';
import Command from '@/script/libs/three/Command';
import { CtrRef } from '@/script/types/CtrRef';
import Field from '@/script/types/ebx/Field';
import { Guid } from '@/script/types/Guid';

export interface IEBXFieldData {
	guid: Guid,
	reference: CtrRef,
	field: string,
	type: string,
	value: any,
	oldValue: any,
}

export default class SetEBXFieldCommand extends Command {
	constructor(public EBXFieldUpdateData: IEBXFieldData) {
		super('SetEBXFieldCommand');
		this.name = 'Change EBX Data';
	}

	public execute() {
		const gameObjectTransferData = new GameObjectTransferData({
			guid: this.EBXFieldUpdateData.guid,
			overrides: [{
				field: this.EBXFieldUpdateData.field,
				value: this.EBXFieldUpdateData.value,
				type: this.EBXFieldUpdateData.type,
				reference: this.EBXFieldUpdateData.reference
			}]
		});
		window.vext.SendCommand(new VextCommand(this.type, gameObjectTransferData));
	}

	public undo() {
		const gameObjectTransferData = new GameObjectTransferData({
			guid: this.EBXFieldUpdateData.guid,
			overrides: {
				field: this.EBXFieldUpdateData.field,
				value: this.EBXFieldUpdateData.oldValue,
				reference: this.EBXFieldUpdateData.reference
			}
		});
		window.vext.SendCommand(new VextCommand(this.type, gameObjectTransferData));
	}
}
