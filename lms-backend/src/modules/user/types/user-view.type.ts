import { Role } from '../../../common/enums/role.enum.js';
import { User } from '../entities/user.entity.js';

export class UserView {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(user: User): UserView {
    const view = new UserView();
    view.id = user.id;
    view.email = user.email;
    view.fullName = user.fullName;
    view.avatarUrl = user.avatarUrl;
    view.role = user.role;
    view.isActive = user.isActive;
    view.createdAt = user.createdAt;
    view.updatedAt = user.updatedAt;
    return view;
  }
}
