import { describe, it, expect, vi } from 'vitest';
import { EntityManager } from 'typeorm';
import { Role } from '../../../common/enums/role.enum.js';
import { generateProfileCode, profilePrefixFor } from './profile-code.util.js';

describe('profile-code.util', () => {
  describe('profilePrefixFor', () => {
    it('returns SV for student role', () => {
      expect(profilePrefixFor(Role.STUDENT)).toBe('SV');
    });

    it('returns GV for lecturer role', () => {
      expect(profilePrefixFor(Role.LECTURER)).toBe('GV');
    });
  });

  describe('generateProfileCode', () => {
    it('generates a 10-character code in SVyyNNNNNN format for students', async () => {
      const mockManager = {
        query: vi.fn(async (sql: string) => {
          if (sql.includes('nextval')) return [{ nextval: '42' }];
          if (sql.includes('COUNT')) return [{ count: '0' }];
          return [];
        }),
      } as unknown as EntityManager;

      const code = await generateProfileCode('SV', mockManager);

      const yy = new Date().getFullYear().toString().slice(-2);
      expect(code).toBe(`SV${yy}000042`);
      expect(code).toHaveLength(10);
      expect(mockManager.query).toHaveBeenCalledWith("SELECT nextval('student_code_seq')");
    });

    it('generates a 10-character code in GVyyNNNNNN format for lecturers', async () => {
      const mockManager = {
        query: vi.fn(async (sql: string) => {
          if (sql.includes('nextval')) return [{ nextval: '7' }];
          if (sql.includes('COUNT')) return [{ count: '0' }];
          return [];
        }),
      } as unknown as EntityManager;

      const code = await generateProfileCode('GV', mockManager);

      const yy = new Date().getFullYear().toString().slice(-2);
      expect(code).toBe(`GV${yy}000007`);
      expect(code).toHaveLength(10);
      expect(mockManager.query).toHaveBeenCalledWith("SELECT nextval('lecturer_code_seq')");
    });

    it('advances sequence and skips code when collision is detected', async () => {
      let nextvalCallCount = 0;
      const mockManager = {
        query: vi.fn(async (sql: string) => {
          if (sql.includes('nextval')) {
            nextvalCallCount++;
            return [{ nextval: String(nextvalCallCount) }]; // returns 1, then 2
          }
          if (sql.includes('COUNT')) {
            // first code collides (count = 1), second code is available (count = 0)
            return [{ count: nextvalCallCount === 1 ? '1' : '0' }];
          }
          return [];
        }),
      } as unknown as EntityManager;

      const code = await generateProfileCode('SV', mockManager);

      const yy = new Date().getFullYear().toString().slice(-2);
      expect(code).toBe(`SV${yy}000002`);
      expect(nextvalCallCount).toBe(2);
    });
  });
});
