class 'ObjectManager'

local m_Logger = Logger("ObjectManager", true)

function ObjectManager:__init(p_Realm)
	m_Logger:Write("Initializing ObjectManager")
	self.m_Realm = p_Realm
	self:RegisterVars()
	self:RegisterEvents()
end

function ObjectManager:RegisterVars()
	self.m_SpawnedEntities = {}
	self.m_SpawnedOffsets = {}
	self.m_EntityInstanceIds = {}

	self.m_ParentTransforms = {}
end

function ObjectManager:RegisterEvents()

end

function ObjectManager:GetEntityByGuid(p_Guid)
	if(self.m_SpawnedEntities[p_Guid] ~= nil) then
		return self.m_SpawnedEntities[p_Guid]
	else
		return false
	end
end

function ObjectManager:GetGuidFromInstanceID(p_InstanceID)
	return self.m_EntityInstanceIds[p_InstanceID]
end

function ObjectManager:OnLevelDestroy()
	self:RegisterVars()
end

function ObjectManager:SpawnBlueprint(p_Guid, p_PartitionGuid, p_InstanceGuid, p_LinearTransform, p_Variation)
	if p_PartitionGuid == nil or
			p_InstanceGuid == nil or
			p_LinearTransform == nil then
		m_Logger:Write('One or more gameObjectTransferData are nil')
		return nil, false
	end

	if self.m_SpawnedEntities[p_Guid] ~= nil then
		m_Logger:Write('Object with id ' .. p_Guid .. ' already existed as a spawned entity!')
		return nil, false
	end

	p_Variation = p_Variation or 0

	local s_Blueprint = ResourceManager:FindInstanceByGUID(Guid(p_PartitionGuid), Guid(p_InstanceGuid))

	if s_Blueprint == nil then
		error('Couldn\'t find the specified instance')
		return nil, false
	end

	local s_ObjectBlueprint = _G[s_Blueprint.typeInfo.name](s_Blueprint)

	m_Logger:Write('Spawning blueprint: '.. s_ObjectBlueprint.name .. " | ".. s_Blueprint.typeInfo.name .. ", ID: " .. p_Guid .. ", Instance: " .. tostring(p_InstanceGuid) .. ", Variation: " .. p_Variation)

	local s_Params = EntityCreationParams()
	s_Params.transform = p_LinearTransform
	s_Params.variationNameHash = p_Variation
	s_Params.networked = s_ObjectBlueprint.needNetworkId

	local s_ObjectEntities = EntityManager:CreateEntitiesFromBlueprint(s_Blueprint, s_Params)
	if #s_ObjectEntities == 0 then
		m_Logger:Write("Spawning failed")
		return nil, false
	end

	local s_EntityTransferDatas = {}
	local s_SpatialEntities = {}
	local s_Offsets = {}

	for l_IndexInBlueprint, l_Entity in pairs(s_ObjectEntities) do
		l_Entity:Init(self.m_Realm, true)

		local s_EntityTransferData = {
			indexInBlueprint = l_IndexInBlueprint,
			instanceId = l_Entity.instanceId,
			type = l_Entity.typeInfo.name,
		}

		-- TODO: Change how the m_EntityInstanceIds stuff is handled, so its actually readable
		if(self.m_EntityInstanceIds[l_Entity.instanceId] == nil) then
			self.m_EntityInstanceIds[l_Entity.instanceId] = {}
		end

		table.insert(self.m_EntityInstanceIds[l_Entity.instanceId], p_Guid)

		if(l_Entity:Is("SpatialEntity")) then
			local s_SpatialEntity = SpatialEntity(l_Entity)
			s_SpatialEntities[l_IndexInBlueprint] = s_SpatialEntity
			s_Offsets[l_IndexInBlueprint] = ToLocal(s_SpatialEntity.transform, p_LinearTransform)
			-- Allows us to connect the entity to the GUID

			s_EntityTransferData.transform = ToLocal(s_SpatialEntity.transform, p_LinearTransform)
			s_EntityTransferData.aabb = {
				min = s_SpatialEntity.aabb.min,
				max = s_SpatialEntity.aabb.max,
				transform = ToLocal(s_SpatialEntity.aabbTransform, p_LinearTransform)
			}
		end

		table.insert(s_EntityTransferDatas, s_EntityTransferData)
	end

	-- TODO: Check if we actually need to have the spawned entities
	self.m_SpawnedEntities[p_Guid] = s_SpatialEntities
	self.m_SpawnedOffsets[p_Guid] = s_Offsets

	return s_EntityTransferDatas, true
end

function ObjectManager:BlueprintSpawned(p_Hook, p_Guid, p_LinearTransform, p_Blueprint, p_Parent)
    if(p_LinearTransform == nil) then
        p_LinearTransform = LinearTransform()
    end

    if(self.m_SpawnedEntities[p_Guid] ~= nil) then
        m_Logger:Write("Blueprint already spawned??")
        return false
    end

    local s_Spatial = {}
    local s_Offsets = {}

	-- TODO: Update Parent transforms differently
	self.m_ParentTransforms[p_Guid] = p_LinearTransform
    local s_ObjectEntities = p_Hook:Call()

    for i, l_Entity in pairs(s_ObjectEntities) do
        if (l_Entity:Is("SpatialEntity") and l_Entity:Is("OccluderVolumeEntity") == false) then
            s_Spatial[i] = SpatialEntity(l_Entity)
            s_Offsets[i] = ToLocal(s_Spatial[i].transform, p_LinearTransform)
			-- Allows us to connect the entity to the GUID
			if(self.m_EntityInstanceIds[l_Entity.instanceId] == nil) then
				self.m_EntityInstanceIds[l_Entity.instanceId] = {}
			end

            table.insert(self.m_EntityInstanceIds[l_Entity.instanceId], p_Guid)
        end
    end

    self.m_SpawnedEntities[p_Guid] = s_Spatial
    self.m_SpawnedOffsets[p_Guid] = s_Offsets

    return s_Spatial
end

function ObjectManager:DestroyEntity(p_Guid)

	local s_Entities = self:GetEntityByGuid(p_Guid)

	print(p_Guid)

	if(s_Entities == false or #s_Entities == 0) then
		m_Logger:Write(s_Entities)
		m_Logger:Write("Failed to get entities")
		return false
	end

	self.m_SpawnedEntities[p_Guid] = nil;

	for _, entity in pairs(s_Entities) do
		if entity ~= nil then
			m_Logger:Write(entity.typeInfo.name)
			entity:Destroy()
		end
	end

	return true
end

function ObjectManager:EnableEntity(p_Guid)

	local s_Entities = self:GetEntityByGuid(p_Guid)

	if(s_Entities == false or #s_Entities == 0) then
		m_Logger:Write(s_Entities)
		m_Logger:Write("Failed to get entities")
		return false
	end
	for _, entity in pairs(s_Entities) do
		if entity ~= nil then
			entity:FireEvent("Enable")
		end
	end
	return true
end

function ObjectManager:DisableEntity(p_Guid)

	local s_Entities = self:GetEntityByGuid(p_Guid)

	if(s_Entities == false or #s_Entities == 0) then
		m_Logger:Write(s_Entities)
		m_Logger:Write("Failed to get entities")
		return false
	end
	for _, entity in pairs(s_Entities) do
		if entity ~= nil then
			entity:FireEvent("Disable")
		end
	end
	return true
end

function ObjectManager:SetTransform(p_Guid, p_LinearTransform, p_UpdateCollision)
	if self.m_SpawnedEntities[p_Guid] == nil then
		m_Logger:Error('Object with id ' .. p_Guid .. ' does not exist')
		return false
	end

	for i, l_Entity in pairs(self.m_SpawnedEntities[p_Guid]) do
		if(l_Entity == nil) then
			m_Logger:Error("Entity is nil?")
			return false
		end

		if(not l_Entity:Is("SpatialEntity"))then
			m_Logger:Warning("not spatial")
			goto continue
		end

		self.m_ParentTransforms[p_Guid] = p_LinearTransform

		local s_Entity = SpatialEntity(l_Entity)

		if s_Entity ~= nil then
			if(s_Entity.typeInfo.name == "ServerVehicleEntity") then
				s_Entity.transform = LinearTransform(p_LinearTransform)
			else

				local s_LocalTransform = self.m_SpawnedOffsets[p_Guid][i]
				s_Entity.transform = ToWorld(s_LocalTransform, LinearTransform(p_LinearTransform))

				if(p_UpdateCollision) then
					s_Entity:FireEvent("Disable")
					s_Entity:FireEvent("Enable")
					self:UpdateOffsets(p_Guid, s_Entity.instanceId, LinearTransform(p_LinearTransform))
				end
			end
		else
			m_Logger:Write("entity is nil??")
		end

		::continue::
	end

	return true
end

function ObjectManager:UpdateOffsets(p_Guid, p_InstanceID, p_ParentWorld)
	local s_StartIndex = 1
	for k,l_Reference in pairs(self.m_EntityInstanceIds[p_InstanceID]) do
		if(l_Reference == p_Guid) then
			s_StartIndex = k + 1
		end
	end
	for i = s_StartIndex, #self.m_EntityInstanceIds[p_InstanceID], 1 do
		local l_Parent = self.m_EntityInstanceIds[p_InstanceID][i]
		for index, l_Entity in pairs(self.m_SpawnedEntities[l_Parent]) do
			if(l_Entity.instanceId == p_InstanceID) then
				local s_Entity = SpatialEntity(self.m_SpawnedEntities[l_Parent][index])
				self.m_SpawnedOffsets[l_Parent][index] = ToLocal(s_Entity.transform, self.m_ParentTransforms[l_Parent])
			end
		end
	end
end

return ObjectManager