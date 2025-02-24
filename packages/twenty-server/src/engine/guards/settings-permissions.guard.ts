import {
  CanActivate,
  ExecutionContext,
  Injectable,
  mixin,
  Type,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { FeatureFlagKey } from 'src/engine/core-modules/feature-flag/enums/feature-flag-key.enum';
import { FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { SettingsPermissions } from 'src/engine/metadata-modules/permissions/constants/settings-permissions.constants';
import {
  PermissionsException,
  PermissionsExceptionCode,
  PermissionsExceptionMessage,
} from 'src/engine/metadata-modules/permissions/permissions.exception';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

export const SettingsPermissionsGuard = (
  requiredPermission: SettingsPermissions,
): Type<CanActivate> => {
  @Injectable()
  class SettingsPermissionsMixin implements CanActivate {
    constructor(
      private readonly featureFlagService: FeatureFlagService,
      private readonly permissionsService: PermissionsService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const ctx = GqlExecutionContext.create(context);
      const workspaceId = ctx.getContext().req.workspace.id;

      const permissionsEnabled = await this.featureFlagService.isFeatureEnabled(
        FeatureFlagKey.IsPermissionsEnabled,
        workspaceId,
      );

      if (!permissionsEnabled) {
        return true;
      }

      const userWorkspaceId = ctx.getContext().req.userWorkspaceId;

      const hasPermission =
        await this.permissionsService.userHasWorkspaceSettingPermission({
          userWorkspaceId,
          _setting: requiredPermission,
          workspaceId,
        });

      if (hasPermission === true) {
        return true;
      }

      throw new PermissionsException(
        PermissionsExceptionMessage.PERMISSION_DENIED,
        PermissionsExceptionCode.PERMISSION_DENIED,
      );
    }
  }

  return mixin(SettingsPermissionsMixin);
};
