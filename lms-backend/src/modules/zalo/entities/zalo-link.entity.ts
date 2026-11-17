import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Liên kết 1-1 giữa user LMS và chat_id của Zalo Bot. */
@Entity('zalo_links')
export class ZaloLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // lưu dạng string để không phụ thuộc userId là số hay uuid
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  userId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  chatId: string;

  @CreateDateColumn()
  linkedAt: Date;
}