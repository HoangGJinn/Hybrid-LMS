import { EntityManager } from 'typeorm';
import { Role } from '../../../common/enums/role.enum.js';

export type ProfilePrefix = 'SV' | 'GV';

/** Code prefix of a role's profile: SV for students, GV for lecturers. */
export const profilePrefixFor = (
  role: Role.STUDENT | Role.LECTURER,
): ProfilePrefix => (role === Role.STUDENT ? 'SV' : 'GV');

export const generateProfileCode = async (
  prefix: ProfilePrefix,
  manager: EntityManager,
): Promise<string> => {
  const sequenceName =
    prefix === 'SV' ? 'student_code_seq' : 'lecturer_code_seq';
  const tableName = prefix === 'SV' ? 'students' : 'lecturers';
  const columnCode = prefix === 'SV' ? 'student_code' : 'lecturer_code';

  const yy = new Date().getFullYear().toString().slice(-2); // e.g. "26"

  let code = '';
  let exists = true;

  while (exists) {
    const result = await manager.query<[{ nextval: string }]>(
      `SELECT nextval('${sequenceName}')`,
    );
    const seq = parseInt(result[0].nextval, 10);
    const padded = String(seq).padStart(6, '0'); // e.g. "000001"
    code = `${prefix}${yy}${padded}`;

    const countRes = await manager.query<[{ count: string }]>(
      `SELECT COUNT(*)::int as count FROM ${tableName} WHERE ${columnCode} = $1`,
      [code],
    );
    exists = parseInt(countRes[0]?.count ?? '0', 10) > 0;
  }

  return code;
};
