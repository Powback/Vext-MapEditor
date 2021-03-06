class 'MapEditorShared'

require "__shared/Config"
Coroutiner = require "__shared/Util/Coroutiner"
require "__shared/Util/Logger"
require "__shared/Util/Util"
DataContainerExt = require "__shared/Util/DataContainerExt"
--require "__shared/Modules/ObjectManager"
require "__shared/Modules/GameObjectManager"
require "__shared/Modules/CommandActions"
--require "__shared/Modules/VanillaBlueprintsParser"
require "__shared/Modules/InstanceParser"
require "__shared/Enums/Enums"
require "__shared/GameData/GameModes"
require "__shared/GameData/Maps"
require "__shared/GameData/SuperBundles"
require "__shared/GameData/Bundles"
require "__shared/GameData/Blueprints"
require "__shared/EditorCommon"
require "__shared/Types/AABB"
require "__shared/Types/CtrRef"
require "__shared/Types/CommandActionResult"
require "__shared/Types/GameEntity"
require "__shared/Types/GameEntityTransferData"
require "__shared/Types/GameObject"
require "__shared/Types/GameObjectTransferData"
require "__shared/Types/GameObjectParentData"
require "__shared/Types/GameObjectSaveData"
Patches = require "__shared/Patches/Patches"
Timer = require "__shared/Util/Timer"

local m_Logger = Logger("MapEditorShared", true)

function MapEditorShared:__init()
	m_Logger:Write("Initializing MapEditorShared")
	Events:Subscribe('Level:Destroy', self, self.OnLevelDestroy)
	Events:Subscribe('Engine:Update', self, self.OnEngineUpdate)
end

function MapEditorShared:OnEngineUpdate(p_Delta, p_SimulationDelta)
	Timer:OnEngineUpdate(p_Delta, p_SimulationDelta)
end

function MapEditorShared:OnLevelDestroy()
	Patches:OnLevelDestroy()
	Timer:OnResetData()
	InstanceParser:OnLevelDestroy()
end

return MapEditorShared()
