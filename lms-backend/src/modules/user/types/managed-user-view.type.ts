import { Role } from '../../../common/enums/role.enum.js';
import { User } from '../entities/user.entity.js';

/** Student / lecturer profile data shown next to the user in the admin lists. */
export interface UserProfileInfo {
  /** Student code or lecturer code. */
  readonly code: string | null;
  /** StudentStatus or LecturerStatus value, depending on the role. */
  readonly status: string | null;
}

/**
 * What the admin user-management pages receive.
 * Unlike `UserView` it adds the profile code / status and whether the person has ever signed in.
 */
export class ManagedUserView {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: Role;
  /** false = deactivated (soft delete). */
  isActive: boolean;
  /** Student code or lecturer code; null for admins. */
  code: string | null;
  /** StudentStatus or LecturerStatus; null for admins. */
  profileStatus: string | null;
  /** false = pre-provisioned account that nobody has signed in to yet ("pending"). */
  hasLoggedIn: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(user: User, profile?: UserProfileInfo): ManagedUserView {
    const view = new ManagedUserView();
    view.id = user.id;
    view.email = user.email;
    view.fullName = user.fullName;
    view.avatarUrl = user.avatarUrl;
    view.role = user.role;
    view.isActive = user.isActive;
    view.code = profile?.code ?? null;
    view.profileStatus = profile?.status ?? null;
    view.hasLoggedIn = user.ssoId !== null;
    view.createdAt = user.createdAt;
    view.updatedAt = user.updatedAt;
    return view;
  }
}
