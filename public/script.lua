--[[
    ╔═══════════════════════════════════════════════════════════════╗
    ║                    PILOT TRACKER v1.0.0                       ║
    ║     Inject with Solara, Delta, Synapse, or any executor       ║
    ║         All features auto-run on injection (no toggles)       ║
    ╚═══════════════════════════════════════════════════════════════╝
    
    CONFIGURATION:
    - Replace API_KEY with your key from the dashboard
    - Replace SERVER_URL with your Vercel deployment URL
]]

-- ============================================
-- CONFIGURATION (CHANGE THESE)
-- ============================================
local API_KEY = "YOUR_API_KEY_HERE"  -- Get this from the dashboard
local SERVER_URL = "https://your-app.vercel.app/api/tracker"  -- Your Vercel URL
local HEARTBEAT_INTERVAL = 30  -- Seconds between heartbeats

-- ============================================
-- SERVICES
-- ============================================
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local HttpService = game:GetService("HttpService")
local UserInputService = game:GetService("UserInputService")
local Lighting = game:GetService("Lighting")
local StarterGui = game:GetService("StarterGui")
local TeleportService = game:GetService("TeleportService")
local VirtualInputManager = game:GetService("VirtualInputManager")
local MarketplaceService = game:GetService("MarketplaceService")

local player = Players.LocalPlayer
local connected = false
local lastFps = 60

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================
local function notify(title, text, duration)
    pcall(function()
        StarterGui:SetCore("SendNotification", {
            Title = title or "PILOT TRACKER",
            Text = text or "",
            Duration = duration or 3
        })
    end)
end

local function getFps()
    return lastFps
end

-- FPS Counter
spawn(function()
    while true do
        local startTime = tick()
        RunService.RenderStepped:Wait()
        lastFps = math.floor(1 / (tick() - startTime))
        wait(0.5)
    end
end)

-- ============================================
-- FPS UNLOCKER
-- ============================================
local function unlockFps()
    local success = pcall(function()
        if setfpscap then
            setfpscap(999)
            return true
        elseif setrenderproperty then
            setrenderproperty("MaxFrameRate", 999)
            return true
        end
    end)
    
    if success then
        print("[PILOT TRACKER] FPS Unlocked to 999")
    else
        print("[PILOT TRACKER] FPS Unlocker not available on this executor")
    end
end

unlockFps()

-- ============================================
-- FPS BOOSTER / GRAPHICS OPTIMIZER
-- ============================================
local function optimizeGraphics()
    local count = 0
    
    -- Lower quality settings
    pcall(function()
        settings().Rendering.QualityLevel = Enum.QualityLevel.Level01
        count = count + 1
    end)
    
    -- Disable post-processing effects
    pcall(function()
        for _, v in pairs(Lighting:GetChildren()) do
            if v:IsA("BlurEffect") or 
               v:IsA("BloomEffect") or 
               v:IsA("SunRaysEffect") or 
               v:IsA("ColorCorrectionEffect") or
               v:IsA("DepthOfFieldEffect") then
                v.Enabled = false
                count = count + 1
            end
        end
    end)
    
    -- Disable shadows and fog
    pcall(function()
        Lighting.GlobalShadows = false
        Lighting.FogEnd = 100000
        Lighting.FogStart = 100000
        count = count + 2
    end)
    
    -- Disable particles, trails, and beams
    pcall(function()
        for _, obj in pairs(workspace:GetDescendants()) do
            if obj:IsA("ParticleEmitter") then
                obj.Enabled = false
                count = count + 1
            elseif obj:IsA("Trail") then
                obj.Enabled = false
                count = count + 1
            elseif obj:IsA("Beam") then
                obj.Enabled = false
                count = count + 1
            elseif obj:IsA("Fire") or obj:IsA("Smoke") or obj:IsA("Sparkles") then
                obj.Enabled = false
                count = count + 1
            end
        end
    end)
    
    -- Reduce decal/texture quality
    pcall(function()
        for _, obj in pairs(workspace:GetDescendants()) do
            if obj:IsA("Decal") then
                obj.Transparency = 0.9
            elseif obj:IsA("Texture") then
                obj.Transparency = 0.9
            end
        end
    end)
    
    print("[PILOT TRACKER] Graphics Optimized - " .. count .. " items processed")
    return count
end

optimizeGraphics()

-- ============================================
-- MAP DELETE (Remove unneeded decorative objects)
-- ============================================
local function cleanMap()
    local deleted = 0
    
    local deletePatterns = {
        "tree", "grass", "rock", "bush", "flower", "leaf", "leaves",
        "plant", "foliage", "vegetation", "shrub", "weed", "debris"
    }
    
    pcall(function()
        for _, obj in pairs(workspace:GetDescendants()) do
            if obj:IsA("BasePart") and not obj:IsDescendantOf(player.Character or {}) then
                local name = obj.Name:lower()
                for _, pattern in ipairs(deletePatterns) do
                    if name:match(pattern) then
                        -- Only delete small decorative parts
                        if obj.Size.Magnitude < 50 then
                            obj:Destroy()
                            deleted = deleted + 1
                        end
                        break
                    end
                end
            end
        end
    end)
    
    print("[PILOT TRACKER] Map Cleaned - " .. deleted .. " objects removed")
    return deleted
end

cleanMap()

-- ============================================
-- ANTI-AFK (Multiple methods for reliability)
-- ============================================
local function startAntiAfk()
    -- Method 1: VirtualUser (most reliable)
    pcall(function()
        local vu = game:GetService("VirtualUser")
        player.Idled:Connect(function()
            vu:Button2Down(Vector2.new(0, 0), workspace.CurrentCamera.CFrame)
            wait(1)
            vu:Button2Up(Vector2.new(0, 0), workspace.CurrentCamera.CFrame)
        end)
    end)
    
    -- Method 2: Periodic key press simulation
    spawn(function()
        while wait(120) do -- Every 2 minutes
            pcall(function()
                VirtualInputManager:SendKeyEvent(true, Enum.KeyCode.Space, false, game)
                wait(0.1)
                VirtualInputManager:SendKeyEvent(false, Enum.KeyCode.Space, false, game)
            end)
        end
    end)
    
    -- Method 3: Character movement simulation
    spawn(function()
        while wait(180) do -- Every 3 minutes
            pcall(function()
                local char = player.Character
                if char and char:FindFirstChild("Humanoid") then
                    char.Humanoid.Jump = true
                end
            end)
        end
    end)
    
    print("[PILOT TRACKER] Anti-AFK Active (3 methods)")
end

startAntiAfk()

-- ============================================
-- SERVER CONNECTION
-- ============================================
local function getGameName()
    local success, info = pcall(function()
        return MarketplaceService:GetProductInfo(game.PlaceId)
    end)
    return success and info.Name or "Unknown Game"
end

local function getPosition()
    local char = player.Character
    if char and char:FindFirstChild("HumanoidRootPart") then
        local pos = char.HumanoidRootPart.Position
        return { x = math.floor(pos.X), y = math.floor(pos.Y), z = math.floor(pos.Z) }
    end
    return nil
end

local function sendRequest(action, extraData)
    local body = {
        apiKey = API_KEY,
        action = action,
        username = player.Name,
        displayName = player.DisplayName,
        userId = player.UserId,
        placeId = game.PlaceId,
        jobId = game.JobId,
        gameName = getGameName(),
        fps = getFps(),
        ping = math.floor((player:GetNetworkPing() or 0) * 1000),
        position = getPosition(),
    }
    
    -- Merge extra data
    if extraData then
        for k, v in pairs(extraData) do
            body[k] = v
        end
    end
    
    local success, result = pcall(function()
        local response
        
        -- Try different HTTP methods based on executor
        if request then
            response = request({
                Url = SERVER_URL,
                Method = "POST",
                Headers = { ["Content-Type"] = "application/json" },
                Body = HttpService:JSONEncode(body)
            })
        elseif syn and syn.request then
            response = syn.request({
                Url = SERVER_URL,
                Method = "POST",
                Headers = { ["Content-Type"] = "application/json" },
                Body = HttpService:JSONEncode(body)
            })
        elseif http and http.request then
            response = http.request({
                Url = SERVER_URL,
                Method = "POST",
                Headers = { ["Content-Type"] = "application/json" },
                Body = HttpService:JSONEncode(body)
            })
        else
            -- Fallback to basic HttpService (may not work in all games)
            response = { Body = HttpService:PostAsync(SERVER_URL, HttpService:JSONEncode(body)) }
        end
        
        if response and response.Body then
            return HttpService:JSONDecode(response.Body)
        end
    end)
    
    if success and result then
        -- Execute any pending commands
        if result.commands and type(result.commands) == "table" then
            for _, cmd in ipairs(result.commands) do
                executeCommand(cmd)
            end
        end
        return result
    end
    
    return nil
end

-- ============================================
-- COMMAND EXECUTION
-- ============================================
function executeCommand(cmd)
    if cmd == "kick" then
        notify("PILOT TRACKER", "Kicked by remote command", 2)
        wait(2)
        player:Kick("Kicked by Pilot Tracker")
        
    elseif cmd == "serverhop" then
        notify("PILOT TRACKER", "Server hopping...", 2)
        wait(1)
        TeleportService:Teleport(game.PlaceId)
        
    elseif cmd == "rejoin" then
        notify("PILOT TRACKER", "Rejoining server...", 2)
        wait(1)
        TeleportService:TeleportToPlaceInstance(game.PlaceId, game.JobId)
        
    elseif cmd == "optimize" then
        local optimized = optimizeGraphics()
        local cleaned = cleanMap()
        notify("PILOT TRACKER", "Optimized: " .. optimized .. " | Cleaned: " .. cleaned, 3)
    end
end

-- ============================================
-- HEARTBEAT LOOP
-- ============================================
local function startHeartbeat()
    connected = true
    
    -- Initial connection
    local result = sendRequest("connect")
    if result and result.success then
        print("[PILOT TRACKER] Connected to dashboard")
        notify("PILOT TRACKER", "Connected to dashboard", 3)
    else
        print("[PILOT TRACKER] Failed to connect - check API key and URL")
        notify("PILOT TRACKER", "Connection failed!", 5)
    end
    
    -- Heartbeat loop
    spawn(function()
        while connected do
            wait(HEARTBEAT_INTERVAL)
            if connected then
                sendRequest("heartbeat")
            end
        end
    end)
end

-- ============================================
-- DISCONNECT HANDLER
-- ============================================
game:BindToClose(function()
    if connected then
        connected = false
        sendRequest("disconnect")
    end
end)

player.AncestryChanged:Connect(function()
    if not player:IsDescendantOf(game) then
        if connected then
            connected = false
            sendRequest("disconnect")
        end
    end
end)

-- ============================================
-- START TRACKER
-- ============================================
print("╔═══════════════════════════════════════════════════════════════╗")
print("║                    PILOT TRACKER v1.0.0                       ║")
print("╠═══════════════════════════════════════════════════════════════╣")
print("║  [✓] FPS Unlocked                                             ║")
print("║  [✓] Graphics Optimized                                       ║")
print("║  [✓] Map Cleaned                                              ║")
print("║  [✓] Anti-AFK Active                                          ║")
print("║  [✓] Server Connection Starting...                            ║")
print("╚═══════════════════════════════════════════════════════════════╝")

startHeartbeat()
