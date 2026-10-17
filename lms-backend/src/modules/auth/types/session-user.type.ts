import { UserView } from '../../user/types/user-view.type.js'

/** The user returned by login/refresh/me: the profile plus the student or lecturer code (null for admins). */
export interface SessionUser extends UserView {
  readonly code: string | null
}
