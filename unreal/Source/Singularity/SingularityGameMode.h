#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "SingularityGameMode.generated.h"
UENUM(BlueprintType)
enum class ESingularityBodyRole : uint8
{
    EyesHead, LeftArm, RightArm, TorsoBack, LeftLeg, RightLeg
};
UCLASS()
class SINGULARITY_API ASingularityGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    ASingularityGameMode();
};
