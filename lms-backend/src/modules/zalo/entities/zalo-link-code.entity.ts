import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** Mã liên kết dùng một lần, hết hạn sau 10 phút. */
@Entity('zalo_link_codes')
export class ZaloLinkCode {
  @PrimaryColumn({ type: 'varchar', length: 16 })
  code: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Column()
  expiresAt: Date;
}