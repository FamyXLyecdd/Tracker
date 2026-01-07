import { NextRequest, NextResponse } from "next/server";
import { isValidApiKey } from "@/lib/store";

// This returns the raw Lua script for loadstring
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get("key");

    if (!apiKey) {
        return new NextResponse("-- ERROR: API key required", {
            headers: { "Content-Type": "text/plain" },
        });
    }

    if (!isValidApiKey(apiKey)) {
        return new NextResponse("-- ERROR: Invalid API key", {
            headers: { "Content-Type": "text/plain" },
        });
    }

    // Get the host URL from the request
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const serverUrl = `${protocol}://${host}/api/tracker`;

    const script = generateLuaScript(apiKey, serverUrl);

    return new NextResponse(script, {
        headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "no-cache",
        },
    });
}

function generateLuaScript(apiKey: string, serverUrl: string): string {
    return `--[[
    ╔═══════════════════════════════════════════════════════════════╗
    ║               ZAYNFAMY PILOT TRACKER v1.3.0                   ║
    ║        Supported: Solara, Delta, Synapse, Electron, krampus   ║
    ║         All features auto-run on injection (no toggles)       ║
    ╚═══════════════════════════════════════════════════════════════╝
]]

local API_KEY = "${apiKey}"
local SERVER_URL = "${serverUrl}"
local HEARTBEAT_INTERVAL = 5

-- Safe Service Getter
local function getService(name)
    local success, service = pcall(function() return game:GetService(name) end)
    if success and service then
        if cloneref then return cloneref(service) end
        return service
    end
    return nil
end

-- Services
local Players = getService("Players")
local RunService = getService("RunService")
local HttpService = getService("HttpService")
local Lighting = getService("Lighting")
local StarterGui = getService("StarterGui")
local TeleportService = getService("TeleportService")
local VirtualInputManager = getService("VirtualInputManager") -- Might be nil on Solara
local MarketplaceService = getService("MarketplaceService")
local VirtualUser = getService("VirtualUser")

local player = Players.LocalPlayer
local connected = false
local lastFps = 60
local lastPosition = Vector3.new(0,0,0)
local lastMoveTime = tick()

-- Utility: Safe Notification
local function notify(title, text, duration)
    if not StarterGui then return end
    pcall(function()
        StarterGui:SetCore("SendNotification", {
            Title = title or "ZAYNFAMY",
            Text = text or "",
            Duration = duration or 3
        })
    end)
end

-- FPS Counter
spawn(function()
    while true do
        local startTime = tick()
        if RunService then RunService.RenderStepped:Wait() else wait(0.016) end
        lastFps = math.floor(1 / (tick() - startTime))
        wait(0.5)
    end
end)

-- Idle Tracker
spawn(function()
    while true do
        wait(1)
        if player and player.Character and player.Character:FindFirstChild("HumanoidRootPart") then
            local currentPos = player.Character.HumanoidRootPart.Position
            if (currentPos - lastPosition).Magnitude > 0.1 then
                lastMoveTime = tick()
                lastPosition = currentPos
            end
        end
    end
end)

-- ============================================
-- FPS UNLOCKER
-- ============================================
pcall(function()
    if setfpscap then setfpscap(999)
    elseif setrenderproperty then setrenderproperty("MaxFrameRate", 999) end
end)

-- ============================================
-- FPS BOOSTER
-- ============================================
local function optimizeGraphics()
    pcall(function() 
        if settings then settings().Rendering.QualityLevel = Enum.QualityLevel.Level01 end
    end)
    
    if Lighting then
        pcall(function()
            for _, v in pairs(Lighting:GetChildren()) do
                if v:IsA("BlurEffect") or v:IsA("BloomEffect") or v:IsA("SunRaysEffect") or 
                   v:IsA("ColorCorrectionEffect") or v:IsA("DepthOfFieldEffect") then
                    v.Enabled = false
                end
            end
            Lighting.GlobalShadows = false
            Lighting.FogEnd = 100000
        end)
    end
    
    pcall(function()
        for _, obj in pairs(workspace:GetDescendants()) do
            if obj:IsA("ParticleEmitter") or obj:IsA("Trail") or obj:IsA("Beam") or
               obj:IsA("Fire") or obj:IsA("Smoke") or obj:IsA("Sparkles") then
                obj.Enabled = false
            end
        end
    end)
end

optimizeGraphics()

-- ============================================
-- MAP DELETE
-- ============================================
local function cleanMap()
    local patterns = {"tree", "grass", "rock", "bush", "flower", "leaf", "plant", "foliage", "debris"}
    pcall(function()
        for _, obj in pairs(workspace:GetDescendants()) do
            if obj:IsA("BasePart") and not obj:IsDescendantOf(player.Character or {}) then
                local name = obj.Name:lower()
                for _, p in ipairs(patterns) do
                    if name:match(p) and obj.Size.Magnitude < 50 then
                        obj:Destroy()
                        break
                    end
                end
            end
        end
    end)
end

cleanMap()

-- ============================================
-- ANTI-AFK (Safe Mode)
-- ============================================
if VirtualUser then
    pcall(function()
        player.Idled:Connect(function()
            VirtualUser:Button2Down(Vector2.new(0, 0), workspace.CurrentCamera.CFrame)
            wait(1)
            VirtualUser:Button2Up(Vector2.new(0, 0), workspace.CurrentCamera.CFrame)
        end)
    end)
end

if VirtualInputManager then
    spawn(function()
        while wait(120) do
            pcall(function()
                VirtualInputManager:SendKeyEvent(true, Enum.KeyCode.Space, false, game)
                wait(0.1)
                VirtualInputManager:SendKeyEvent(false, Enum.KeyCode.Space, false, game)
            end)
        end
    end)
end

-- ============================================
-- SERVER CONNECTION (Robust Http)
-- ============================================
local function getGameName()
    if not MarketplaceService then return "Unknown Game" end
    local ok, info = pcall(function() return MarketplaceService:GetProductInfo(game.PlaceId) end)
    return ok and info.Name or "Unknown Game"
end

local function getPosition()
    if not player or not player.Character then return nil end
    local char = player.Character
    if char and char:FindFirstChild("HumanoidRootPart") then
        local pos = char.HumanoidRootPart.Position
        return { x = math.floor(pos.X), y = math.floor(pos.Y), z = math.floor(pos.Z) }
    end
    return nil
end

local function getCharacterStats()
    if not player or not player.Character then return nil end
    local char = player.Character
    if char then
        local humanoid = char:FindFirstChild("Humanoid")
        if humanoid then
            return {
                health = math.floor(humanoid.Health),
                maxHealth = math.floor(humanoid.MaxHealth),
                walkSpeed = math.floor(humanoid.WalkSpeed),
                jumpPower = math.floor(humanoid.JumpPower or humanoid.JumpHeight or 50)
            }
        end
    end
    return nil
end

local function sendRequest(action, extra)
    local charStats = getCharacterStats()
    local idleTime = math.floor(tick() - lastMoveTime)
    
    local body = {
        apiKey = API_KEY,
        action = action,
        username = player.Name,
        displayName = player.DisplayName,
        userId = player.UserId,
        placeId = game.PlaceId,
        jobId = game.JobId,
        gameName = getGameName(),
        fps = lastFps,
        ping = math.floor((player:GetNetworkPing() or 0) * 1000),
        position = getPosition(),
        idleTime = idleTime
    }
    
    if charStats then
        body.health = charStats.health
        body.maxHealth = charStats.maxHealth
        body.walkSpeed = charStats.walkSpeed
        body.jumpPower = charStats.jumpPower
    end
    
    if extra then for k, v in pairs(extra) do body[k] = v end end
    
    spawn(function()
        -- Robust Request Finder
        local requestFunc = nil
        if type(http) == "table" and http.request then requestFunc = http.request end
        if not requestFunc and type(syn) == "table" and syn.request then requestFunc = syn.request end
        if not requestFunc and type(request) == "function" then requestFunc = request end
        if not requestFunc and type(Fluxus) == "table" and Fluxus.request then requestFunc = Fluxus.request end
        
        if requestFunc then
            local success, err = pcall(function()
                local response = requestFunc({
                    Url = SERVER_URL,
                    Method = "POST",
                    Headers = { ["Content-Type"] = "application/json" },
                    Body = HttpService:JSONEncode(body)
                })
                
                if response and response.Body then
                    local result = HttpService:JSONDecode(response.Body)
                    if result.commands and #result.commands > 0 then
                        for _, cmd in ipairs(result.commands) do
                            spawn(function()
                                notify("COMMAND", cmd:upper(), 3)
                                if cmd == "kick" then 
                                    player:Kick("ZaynFamy: Global Kick Command")
                                elseif cmd == "serverhop" and TeleportService then 
                                    TeleportService:Teleport(game.PlaceId)
                                elseif cmd == "rejoin" and TeleportService then 
                                    TeleportService:TeleportToPlaceInstance(game.PlaceId, game.JobId)
                                elseif cmd == "optimize" then 
                                    optimizeGraphics() 
                                    cleanMap()
                                end
                            end)
                        end
                    end
                end
            end)
        end
    end)
end

-- ============================================
-- AUTO-EXECUTE ON TELEPORT (Queue on Teleport)
-- ============================================
local function autoExecute()
    local qot = queue_on_teleport or (syn and syn.queue_on_teleport) or (fluxus and fluxus.queue_on_teleport) or (request and request.queue_on_teleport)
    if qot then
        -- Construct the loadstring URL from the SERVER_URL (replacing /api/tracker with /api/script)
        local scriptUrl = SERVER_URL:gsub("/api/tracker", "/api/script?key=" .. API_KEY)
        qot('if not _G.ZaynLoaded then _G.ZaynLoaded = true; loadstring(game:HttpGet("' .. scriptUrl .. '"))() end')
    end
end

if TeleportService then
    TeleportService.TeleportInitFailed:Connect(function()
        -- Re-queue if teleport fails? No, script is still running.
    end)
    
    -- Hook into teleport
    local oldNamecall
    oldNamecall = hookmetamethod(game, "__namecall", function(self, ...)
        local args = {...}
        local method = getnamecallmethod()
        
        if self == TeleportService and (method == "Teleport" or method == "TeleportToPlaceInstance") then
            autoExecute()
        end
        return oldNamecall(self, ...)
    end)
    
    -- Also just call it once just in case the hook fails/isn't supported
    autoExecute()
end

-- ============================================
-- HEARTBEAT
-- ============================================
connected = true
sendRequest("connect")
notify("ZAYNFAMY PILOT", "v1.3.0 Loaded - Auto-Inject Active", 3)

spawn(function()
    while connected do
        wait(HEARTBEAT_INTERVAL)
        if connected then sendRequest("heartbeat") end
    end
end)

-- Remove BindToClose (Server Only) - Replaced with OnTeleport logic implicitly via queue_on_teleport
-- We can send a disconnect on script unload if supported
local Genv = getgenv and getgenv() or _G
Genv.ZaynFamyDisconnect = function()
    connected = false
    sendRequest("disconnect")
end
-- To manually disconnect: ZaynFamyDisconnect()

print("[ZAYNFAMY] Pilot Tracker Loaded (v1.3.0)")
`;
}
