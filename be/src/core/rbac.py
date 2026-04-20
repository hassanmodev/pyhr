"""Role hierarchy: who may assign which roles (cannot assign above own level)."""

from fastapi import HTTPException, status

from src.models.user import UserRole

_ROLE_RANK: dict[UserRole, int] = {
    UserRole.EMPLOYEE: 0,
    UserRole.HR_MANAGER: 1,
    UserRole.SYSTEM_ADMIN: 2,
}


def assert_can_assign_role(actor: UserRole, target_role: UserRole) -> None:
    if _ROLE_RANK[target_role] > _ROLE_RANK[actor]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot assign a role above your own",
        )


def assert_may_set_user_role(
    actor: UserRole,
    target_current_role: UserRole | None,
    new_role: UserRole,
) -> None:
    if target_current_role is not None and _ROLE_RANK[target_current_role] > _ROLE_RANK[actor]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change role for a user above your level",
        )
    assert_can_assign_role(actor, new_role)
