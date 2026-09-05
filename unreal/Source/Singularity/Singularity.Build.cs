using UnrealBuildTool;
public class Singularity : ModuleRules
{
    public Singularity(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new[] { "Core", "CoreUObject", "Engine", "PhysicsCore", "EnhancedInput", "OnlineSubsystemUtils" });
    }
}
